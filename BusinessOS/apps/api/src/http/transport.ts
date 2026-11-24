import {
  ArgumentsHost, BadRequestException, CanActivate, Catch, ExecutionContext, ForbiddenException,
  HttpException, Injectable, NestInterceptor, ServiceUnavailableException, UnauthorizedException,
} from "@nestjs/common";
import type { CallHandler } from "@nestjs/common";
import { BaseExceptionFilter, Reflector } from "@nestjs/core";
import type { ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { catchError, defer, throwError, timeout, TimeoutError } from "rxjs";
import { ContextError } from "@businessos/execution-context";
import type { Access } from "@businessos/execution-context";
import {
  IDEMPOTENT_WRITE, PUBLIC_ROUTE, isVersioned,
} from "./contract.js";
import type { ContractRequest, VerifiedPrincipal } from "./contract.js";
import { requireScope, SCOPED_ACCESS } from "./scoped.js";
import type { ScopeOptions } from "./scoped.js";
import { bearerCredential, COOKIE_AUTH } from "../security/http.js";
import type { ProtectedAdmission } from "../security/http.js";
import { withDeadline } from "../security/policy.js";

export type PrincipalVerifier = (token: string, signal: AbortSignal) => Promise<VerifiedPrincipal | undefined>;

export function requestMetadata(request: ContractRequest, response: ServerResponse, next: () => void) {
  if (isVersioned(request)) {
    const incoming = request.headers["x-request-id"];
    request.requestId = typeof incoming === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(incoming)
      ? incoming
      : randomUUID();
    response.setHeader("X-Request-Id", request.requestId);
    response.setHeader("Cache-Control", "no-store");
  }
  next();
}

@Injectable()
export class ContractGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verify: PrincipalVerifier,
    private readonly scope?: ScopeOptions,
    private readonly protectedAuth?: ProtectedAdmission,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ContractRequest>();
    const targets = [context.getHandler(), context.getClass()];
    const access = this.reflector.getAllAndOverride<Access>(SCOPED_ACCESS, targets);
    const browser = this.reflector.getAllAndOverride<boolean>(COOKIE_AUTH, targets) === true;
    if (!isVersioned(request) || this.reflector.getAllAndOverride(PUBLIC_ROUTE, targets)) {
      if (access || browser) throw new ForbiddenException();
      return true;
    }

    request.cookieAuth = browser;
    if (browser && !this.protectedAuth) throw new ForbiddenException();
    request.principal = this.protectedAuth
      ? await this.protectedAuth.verify(request, browser ? "cookie" : "bearer")
      : await this.legacyBearer(request);

    if (this.reflector.getAllAndOverride(IDEMPOTENT_WRITE, targets)) {
      const key = request.headers["idempotency-key"];
      if (typeof key !== "string" || !/^[A-Za-z0-9._~:-]{1,128}$/.test(key)) {
        throw new BadRequestException({
          code: "IDEMPOTENCY_KEY_REQUIRED", message: "Supply a valid Idempotency-Key.",
        });
      }
      if (request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
        throw new HttpException("JSON content type required", 415);
      }
      request.idempotencyKey = key;
    }
    if (access) await requireScope(request, context.switchToHttp().getResponse<ServerResponse>(), access, this.scope);
    return true;
  }

  private async legacyBearer(request: ContractRequest): Promise<VerifiedPrincipal> {
    const token = bearerCredential(request);
    if (!token) throw new UnauthorizedException();
    let principal: VerifiedPrincipal | undefined;
    try {
      principal = await withDeadline(2000, (signal) => this.verify(token, signal));
    } catch {
      throw new ServiceUnavailableException();
    }
    if (!principal) throw new UnauthorizedException();
    return principal;
  }
}

@Injectable()
export class ContractTimeout implements NestInterceptor {
  intercept(context: ExecutionContext, handler: CallHandler) {
    if (!isVersioned(context.switchToHttp().getRequest<ContractRequest>())) return handler.handle();
    return defer(() => handler.handle()).pipe(
      timeout({ first: 5000 }),
      catchError((error: unknown) => throwError(() => error instanceof TimeoutError
        ? new ServiceUnavailableException()
        : error)),
    );
  }
}

const fallback: Record<number, readonly [string, string]> = {
  400: ["BAD_REQUEST", "The request is malformed."],
  401: ["UNAUTHENTICATED", "Authentication is required."],
  403: ["FORBIDDEN", "Access is denied."],
  404: ["NOT_FOUND", "The resource is unavailable."],
  409: ["CONFLICT", "The request conflicts with current state."],
  413: ["PAYLOAD_TOO_LARGE", "The request exceeds the payload limit."],
  415: ["UNSUPPORTED_MEDIA_TYPE", "Use an allowed content type and encoding."],
  422: ["SEMANTIC_INVALID", "The request content is invalid."],
  429: ["RATE_LIMITED", "Too many requests."],
  500: ["INTERNAL_ERROR", "The request could not be completed."],
  503: ["UNAVAILABLE", "The service is temporarily unavailable."],
};
const explicitErrors = new Set(["VALIDATION_FAILED", "INVALID_CURSOR", "VERSION_CONFLICT",
  "IDEMPOTENCY_KEY_REQUIRED", "IDEMPOTENCY_KEY_REUSE"]);
const contextStatuses: Record<ContextError["code"], number> = {
  UNAUTHENTICATED: 401, FORBIDDEN: 403, UNAVAILABLE: 503, INVALID_PROOF: 403,
};

@Catch()
export class ContractExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<ContractRequest>();
    const response = http.getResponse<ServerResponse>();
    if (!isVersioned(request)) {
      super.catch(exception, host);
      return;
    }
    if (response.headersSent) return;
    const parserStatus = exception instanceof Error && "statusCode" in exception ? exception.statusCode : undefined;
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : exception instanceof ContextError ? contextStatuses[exception.code]
        : parserStatus === 400 || parserStatus === 413 || parserStatus === 415 ? parserStatus : 500;
    const [defaultCode, defaultMessage] = fallback[status] ?? fallback[500]!;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const safe = payload && typeof payload === "object" && "code" in payload
      && typeof payload.code === "string" && explicitErrors.has(payload.code) ? payload : undefined;
    const requestId = request.requestId ?? randomUUID();
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("X-Request-Id", requestId);
    if (status === 401 && !request.cookieAuth) response.setHeader("WWW-Authenticate", "Bearer");
    response.end(JSON.stringify({
      code: safe?.code ?? defaultCode,
      message: safe && "message" in safe ? safe.message : defaultMessage,
      details: safe && "details" in safe ? safe.details : {},
      requestId,
    }));
  }
}
