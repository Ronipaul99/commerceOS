import { randomUUID } from "node:crypto";

export type Principal = Readonly<{ kind: "human" | "service"; id: string; identityRef: string }>;
export type Access = Readonly<{ resource: string; action: string; ownership: "tenant" | "branch" }>;
export type Grant = Readonly<Pick<Access, "resource" | "action"> & (
  { scope: "TENANT" } | { scope: "BRANCH"; branchId: string } | { scope: "SELF"; branchId?: string }
)>;
export type Selection = Readonly<{ tenantId: string; branchId?: string }>;
export type Authority = Readonly<{
  principal: Principal;
  active: boolean;
  tenantId: string;
  membershipId?: string;
  revision: string;
  branch?: Readonly<{ tenantId: string; id: string; active: boolean }>;
  ownerId?: string;
  grants: readonly Grant[];
}>;

type Scope = Readonly<({ kind: "tenant" } | { kind: "branch"; branchId: string }) & { ownerId?: string }>;

export type AuthContext = Readonly<{
  principal: Principal;
  tenantId: string;
  membershipId?: string;
  revision: string;
  access: Access;
  scope: Scope;
}>;

type Origin =
  | Readonly<{ source: "http"; attemptId: string; correlationId: string }>
  | Readonly<{ source: "worker"; attemptId: string; correlationId: string; jobId: string; executor: Principal }>;

declare const authorizedContext: unique symbol;
export type RequestContext = Readonly<{ auth: AuthContext; origin: Origin; [authorizedContext]: true }>;
export type PlatformContext = Readonly<{ kind: "platform"; operatorId: string }>;
export type Denial = "UNAUTHENTICATED" | "FORBIDDEN" | "UNAVAILABLE" | "INVALID_PROOF";
export type AuditEntry = Readonly<{
  source: Origin["source"];
  attemptId: string;
  correlationId: string;
  decision: "ALLOW" | Denial;
  resource: string;
  action: string;
  tenantId?: string;
  branchId?: string;
  principalKind?: Principal["kind"];
  actorId?: string;
  membershipId?: string;
  revision?: string;
  jobId?: string;
  executorId?: string;
}>;
export type AuditSink = (entry: AuditEntry) => void | Promise<void>;
export type HttpAuthority = (principal: Principal, signal: AbortSignal) => Promise<Authority | undefined>;

export class ContextError extends Error {
  readonly code: Denial;

  constructor(code: Denial) {
    super("Execution context denied.");
    this.name = "ContextError";
    this.code = code;
  }
}

const issued = new WeakSet<RequestContext>();
const identifier = /^[A-Za-z0-9._:-]{1,128}(?![\s\S])/;

export function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && identifier.test(value);
}

export function validPrincipal(value: Principal | undefined): value is Principal {
  return Boolean(value && (value.kind === "human" || value.kind === "service")
    && isIdentifier(value.id) && isIdentifier(value.identityRef));
}

export function samePrincipal(left: Principal, right: Principal): boolean {
  return left.kind === right.kind && left.id === right.id && left.identityRef === right.identityRef;
}

function sameAccess(left: Access, right: Access): boolean {
  return left.resource === right.resource && left.action === right.action && left.ownership === right.ownership;
}

export function configureAccess(access: Access): Access {
  if (!isIdentifier(access.resource) || !isIdentifier(access.action)
      || (access.ownership !== "branch" && access.ownership !== "tenant")) {
    throw new Error("Invalid server-side access declaration.");
  }
  return Object.freeze({ resource: access.resource, action: access.action, ownership: access.ownership });
}

export function copyPrincipal(principal: Principal): Principal {
  return Object.freeze({ kind: principal.kind, id: principal.id, identityRef: principal.identityRef });
}

function selectScope(authority: Authority, access: Access): Scope {
  const { grants, branch, tenantId, ownerId } = authority;
  if (access.ownership === "branch"
    && (!branch || branch.active !== true || branch.tenantId !== tenantId || !isIdentifier(branch.id))) {
    throw new ContextError("FORBIDDEN");
  }

  const relevant = grants.filter((grant) => grant.resource === access.resource && grant.action === access.action);
  const base = access.ownership === "branch"
    ? { kind: "branch" as const, branchId: branch!.id }
    : { kind: "tenant" as const };
  if (relevant.some((grant) => grant.scope === "TENANT"
      || (base.kind === "branch" && grant.scope === "BRANCH" && grant.branchId === base.branchId))) {
    return Object.freeze(base);
  }
  if (authority.principal.kind === "human" && isIdentifier(ownerId) && relevant.some(
    (grant) => grant.scope === "SELF" && grant.branchId === (base.kind === "branch" ? base.branchId : undefined),
  )) {
    return Object.freeze({ ...base, ownerId });
  }
  throw new ContextError("FORBIDDEN");
}

function evaluate(principal: Principal, authority: Authority | undefined, access: Access): AuthContext {
  if (!authority || authority.active !== true || !validPrincipal(authority.principal)
      || !samePrincipal(principal, authority.principal) || !isIdentifier(authority.tenantId)
      || !isIdentifier(authority.revision) || !Array.isArray(authority.grants)
      || (principal.kind === "human" && !isIdentifier(authority.membershipId))) {
    throw new ContextError("FORBIDDEN");
  }
  return Object.freeze({
    principal: copyPrincipal(principal),
    tenantId: authority.tenantId,
    membershipId: authority.membershipId,
    revision: authority.revision,
    access: configureAccess(access),
    scope: selectScope(authority, access),
  });
}

export function issueContext(
  principal: Principal, authority: Authority | undefined, access: Access, origin: Origin,
  selection?: Selection,
): RequestContext {
  const auth = evaluate(principal, authority, access);
  if (selection && (auth.tenantId !== selection.tenantId
      || (auth.scope.kind === "branch" ? auth.scope.branchId : undefined) !== selection.branchId)) {
    throw new ContextError("FORBIDDEN");
  }
  const context = Object.freeze({ auth, origin: Object.freeze(origin) }) as RequestContext;
  issued.add(context);
  return context;
}

export function scopeFor(context: RequestContext, access: Access) {
  if (!issued.has(context) || !sameAccess(context.auth.access, access)) throw new ContextError("FORBIDDEN");
  const { tenantId, scope } = context.auth;
  return Object.freeze({
    tenantId,
    ...(scope.kind === "branch" ? { branchId: scope.branchId } : {}),
    ...(scope.ownerId !== undefined ? { ownerId: scope.ownerId } : {}),
  });
}

export function releaseContext(context: RequestContext): void {
  issued.delete(context);
}

export type ScopePredicate = ReturnType<typeof scopeFor>;

export async function authorizeWrite<Tx, Result>(
  tx: Tx, context: RequestContext, access: Access,
  lockAuthority: (tx: Tx, context: AuthContext) => Promise<Authority | undefined>,
  write: (tx: Tx, where: ScopePredicate) => Promise<Result>,
): Promise<Result> {
  const where = scopeFor(context, access);
  // The owner must lock its current authority in this transaction through commit.
  const current = evaluate(context.auth.principal, await lockAuthority(tx, context.auth), access);
  if (current.tenantId !== where.tenantId || current.membershipId !== context.auth.membershipId
      || current.revision !== context.auth.revision || current.scope.ownerId !== where.ownerId
      || (current.scope.kind === "branch" ? current.scope.branchId : undefined) !== where.branchId) {
    throw new ContextError("FORBIDDEN");
  }
  return write(tx, where);
}

export async function authorizationBudget<T>(resolve: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const signal = AbortSignal.timeout(2000);
  return new Promise((accept, reject) => {
    const abort = () => reject(new ContextError("UNAVAILABLE"));
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve().then(() => resolve(signal)).then(accept, (error: unknown) => {
      reject(error instanceof ContextError ? error : new ContextError("UNAVAILABLE"));
    }).finally(() => signal.removeEventListener("abort", abort));
  });
}

export function auditDecision(audit: AuditSink | undefined, entry: AuditEntry): void {
  if (audit) void Promise.resolve().then(() => audit(Object.freeze(entry))).catch(() => undefined);
}

export function auditAllowed(audit: AuditSink | undefined, context: RequestContext): void {
  const { origin, auth } = context;
  auditDecision(audit, {
    source: origin.source, attemptId: origin.attemptId, correlationId: origin.correlationId,
    decision: "ALLOW", resource: auth.access.resource, action: auth.access.action, principalKind: auth.principal.kind,
    actorId: auth.principal.id, revision: auth.revision, tenantId: auth.tenantId, membershipId: auth.membershipId,
    branchId: auth.scope.kind === "branch" ? auth.scope.branchId : undefined,
    ...(origin.source === "worker" ? { jobId: origin.jobId, executorId: origin.executor.id } : {}),
  });
}

export async function authorizeHttp(
  principal: Principal | undefined, access: Access, resolve: HttpAuthority, audit?: AuditSink,
): Promise<RequestContext> {
  const attemptId = randomUUID();
  const origin = { source: "http", attemptId, correlationId: attemptId } as const;
  try {
    if (!validPrincipal(principal) || principal.kind !== "human") throw new ContextError("UNAUTHENTICATED");
    const verified = copyPrincipal(principal);
    const context = await authorizationBudget(async (signal) => {
      const authority = await resolve(verified, signal);
      signal.throwIfAborted();
      return issueContext(verified, authority, access, origin);
    });
    auditAllowed(audit, context);
    return context;
  } catch (error) {
    auditDecision(audit, { ...origin, resource: access.resource, action: access.action,
      decision: error instanceof ContextError ? error.code : "UNAVAILABLE" });
    throw error;
  }
}
