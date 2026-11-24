import {
  ForbiddenException, ServiceUnavailableException, SetMetadata, UnauthorizedException,
} from "@nestjs/common";
import { authorizeHttp, configureAccess, releaseContext } from "@businessos/execution-context";
import type { Access, AuditSink, HttpAuthority, RequestContext } from "@businessos/execution-context";
import type { ServerResponse } from "node:http";
import { invalid } from "./contract.js";
import type { ContractRequest } from "./contract.js";

export const SCOPED_ACCESS = Symbol("scoped access");
export const RequireScope = (access: Access) => SetMetadata(SCOPED_ACCESS, configureAccess(access));
export type ScopeOptions = Readonly<{ resolve: HttpAuthority; audit?: AuditSink }>;

const selectors = new Set(["tenant", "tenantid", "branch", "branchid", "xtenant", "xtenantid", "xbranch", "xbranchid"]);

function selector(name: string): boolean {
  return name.toLowerCase().split(/[.[\]]/).some((part) => selectors.has(part.replace(/[-_]/g, "")));
}

function hasSelector(value: unknown): boolean {
  const pending = [value];
  while (pending.length) {
    const current = pending.pop();
    if (current === null || typeof current !== "object") continue;
    for (const [key, entry] of Object.entries(current)) {
      if (selector(key)) return true;
      pending.push(entry);
    }
  }
  return false;
}

export async function requireScope(
  request: ContractRequest, response: ServerResponse, access: Access, options?: ScopeOptions,
): Promise<void> {
  if (Object.keys(request.headers).some(selector)) invalid("headers");
  if (hasSelector(request.query)) invalid("query");
  if (hasSelector(request.body)) invalid("body");
  const principal = request.principal;
  if (!principal?.sessionId) throw new UnauthorizedException();
  if (!options) throw new ServiceUnavailableException();
  const scoped = await authorizeHttp(
    { kind: "human", id: principal.subject, identityRef: principal.sessionId }, access, options.resolve, options.audit,
  );
  request.executionContext = scoped;
  const release = () => {
    releaseContext(scoped);
    response.off("finish", release);
    response.off("close", release);
  };
  response.once("finish", release);
  response.once("close", release);
  if (response.destroyed || response.writableEnded) release();
}

export function requireExecutionContext(request: ContractRequest): RequestContext {
  if (!request.executionContext) throw new ForbiddenException();
  return request.executionContext;
}
