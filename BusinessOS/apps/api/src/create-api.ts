import "reflect-metadata";
import type { Type } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Server } from "node:http";
import { AppModule } from "./app.module.js";
import { ContractExceptionFilter, ContractGuard, ContractTimeout, requestMetadata } from "./http/transport.js";
import type { PrincipalVerifier } from "./http/transport.js";
import type { ScopeOptions } from "./http/scoped.js";
import { protectedAdmission, securityHeaders } from "./security/http.js";
import type { ProtectedAdmission } from "./security/http.js";
import { initializeProtectedSecurity } from "./security/protected.js";
import type { SecurityDependencies } from "./security/protected.js";
import type { Environment } from "./security/config.js";
import { reportSecurity, SecurityFailure } from "./security/policy.js";

async function composeApi(
  verify: PrincipalVerifier,
  rootModule: Type,
  scope?: ScopeOptions,
  protectedAuth?: ProtectedAdmission,
) {
  const app = await NestFactory.create<NestExpressApplication>(rootModule, {
    bodyParser: false, ...(protectedAuth ? { logger: false as const, abortOnError: false } : {}),
  });
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.use(securityHeaders(protectedAuth?.config));
  app.use(requestMetadata);
  app.useBodyParser("json", { limit: 65536, inflate: false });
  app.useGlobalGuards(new ContractGuard(app.get(Reflector), verify, scope, protectedAuth));
  app.useGlobalInterceptors(new ContractTimeout());
  app.useGlobalFilters(new ContractExceptionFilter(app.getHttpAdapter()));

  const server = app.getHttpServer() as Server;
  server.headersTimeout = 10000;
  server.requestTimeout = 15000;
  return app;
}

const noPrincipal: PrincipalVerifier = async () => undefined;

export function createApi(verify: PrincipalVerifier = noPrincipal, rootModule: Type = AppModule, scope?: ScopeOptions) {
  return composeApi(verify, rootModule, scope);
}

export async function createProtectedApi(
  env: Environment, dependencies: SecurityDependencies, rootModule: Type = AppModule, scope?: ScopeOptions,
) {
  const started = performance.now();
  const security = await initializeProtectedSecurity(env, dependencies);
  try {
    const app = await composeApi(noPrincipal, rootModule, scope, protectedAdmission(security, dependencies.log));
    return { app, refresh: security.refresh };
  } catch {
    reportSecurity(dependencies.log, "startup", "UNAVAILABLE", started);
    throw new SecurityFailure("UNAVAILABLE");
  }
}
