import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { KeyObject } from "node:crypto";
import {
  auditAllowed, auditDecision, authorizationBudget, configureAccess, ContextError, copyPrincipal,
  isIdentifier, issueContext, releaseContext, samePrincipal, validPrincipal,
} from "./context.ts";
import type { Access, AuditSink, Authority, Principal, RequestContext, Selection } from "./context.ts";

type Route = Readonly<{ issuer: string; audience: string; queue: string; operation: string }>;
type JobIdentity = Readonly<Route & { jobId: string; correlationId: string }>;
export type JobClaims = Readonly<JobIdentity & { version: 1; keyId: string; issuedAt: number; expiresAt: number }>;
export type JobReference = Readonly<JobClaims & { signature: string }>;

export type StoredJob<Input> = Readonly<{
  identity: JobIdentity;
  principal: Principal;
  selection: Selection;
  input: Input;
}>;

export type JobBinding<Input> = Readonly<{
  route: Route;
  access: Access;
  executor: Principal;
  allowDelegation: boolean;
  authenticateService: (signal: AbortSignal) => Promise<Principal | undefined>;
  keyFor: (keyId: string, signal: AbortSignal) => Promise<KeyObject | undefined>;
  loadJob: (jobId: string, signal: AbortSignal) => Promise<StoredJob<Input> | undefined>;
  resolve: (principal: Principal, selection: Selection, signal: AbortSignal) => Promise<Authority | undefined>;
  audit?: AuditSink;
  nowSeconds?: () => number;
}>;

const routeFields = ["issuer", "audience", "queue", "operation"] as const;
const identityFields = [...routeFields, "jobId", "correlationId"] as const;
const fields = new Set(["version", "keyId", ...identityFields, "issuedAt", "expiresAt", "signature"]);
const maxProofAgeSeconds = 300;

function validClaims(claims: JobClaims): boolean {
  return claims.version === 1 && isIdentifier(claims.keyId)
    && identityFields.every((name) => isIdentifier(claims[name]))
    && Number.isSafeInteger(claims.issuedAt) && claims.issuedAt >= 0
    && Number.isSafeInteger(claims.expiresAt) && claims.expiresAt > claims.issuedAt
    && claims.expiresAt - claims.issuedAt <= maxProofAgeSeconds;
}

function digest(claims: JobClaims, key: KeyObject): Buffer {
  return createHmac("sha256", key)
    .update(JSON.stringify([
      "businessos-job-reference", claims.version, claims.keyId, ...identityFields.map((field) => claims[field]),
      claims.issuedAt, claims.expiresAt,
    ]))
    .digest();
}

function validKey(key: KeyObject | undefined): key is KeyObject {
  return key?.type === "secret" && (key.symmetricKeySize ?? 0) >= 32;
}

export function signJobReference(claims: JobClaims, key: KeyObject): JobReference {
  if (!validClaims(claims) || !validKey(key)) throw new ContextError("INVALID_PROOF");
  const { version, keyId, issuer, audience, queue, operation, jobId, correlationId, issuedAt, expiresAt } = claims;
  return Object.freeze({
    version, keyId, issuer, audience, queue, operation, jobId, correlationId, issuedAt, expiresAt,
    signature: digest(claims, key).toString("base64url"),
  });
}

function parseReference(value: unknown, route: Route, now: number): JobReference {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new ContextError("INVALID_PROOF");
  const provided = Reflect.ownKeys(value);
  if (provided.length !== fields.size || provided.some((field) => typeof field !== "string" || !fields.has(field))) {
    throw new ContextError("INVALID_PROOF");
  }
  const reference = Object.freeze({ ...value }) as JobReference;
  if (!validClaims(reference) || typeof reference.signature !== "string"
      || !/^[A-Za-z0-9_-]{43}(?![\s\S])/.test(reference.signature)
      || !routeFields.every((field) => reference[field] === route[field])
      || !Number.isSafeInteger(now) || now < reference.issuedAt || now >= reference.expiresAt) {
    throw new ContextError("INVALID_PROOF");
  }
  return reference;
}

export function createJobConsumer<Input, Output>(
  binding: JobBinding<Input>, handle: (context: RequestContext, input: Input) => Promise<Output>,
): (delivery: unknown) => Promise<Output> {
  const {
    authenticateService, resolve, keyFor, loadJob, audit, allowDelegation,
    nowSeconds = () => Math.floor(Date.now() / 1000),
  } = binding;
  const route = Object.freeze({ ...binding.route });
  const access = configureAccess(binding.access);
  if (!validPrincipal(binding.executor) || binding.executor.kind !== "service"
      || !routeFields.every((field) => isIdentifier(route[field]))) {
    throw new Error("Invalid server-side worker binding.");
  }
  const executor = copyPrincipal(binding.executor);

  return async (delivery) => {
    const attemptId = randomUUID();
    let correlationId: string = attemptId;
    const { context, input } = await authorizationBudget(async (signal) => {
      const proof = parseReference(delivery, route, nowSeconds());
      const key = await keyFor(proof.keyId, signal);
      signal.throwIfAborted();
      const bytes = Buffer.from(proof.signature, "base64url");
      if (!validKey(key) || bytes.toString("base64url") !== proof.signature
          || !timingSafeEqual(digest(proof, key), bytes)) {
        throw new ContextError("INVALID_PROOF");
      }
      correlationId = proof.correlationId;

      const service = await authenticateService(signal);
      signal.throwIfAborted();
      if (!validPrincipal(service) || !samePrincipal(service, executor)) throw new ContextError("UNAUTHENTICATED");

      const job = await loadJob(proof.jobId, signal);
      signal.throwIfAborted();
      if (!job || !identityFields.every((field) => job.identity[field] === proof[field])
          || !validPrincipal(job.principal)
          || (job.principal.kind === "human" ? allowDelegation !== true : !samePrincipal(job.principal, executor))
          || !isIdentifier(job.selection.tenantId)
          || (access.ownership === "branch" ? !isIdentifier(job.selection.branchId) : job.selection.branchId !== undefined)) {
        throw new ContextError("FORBIDDEN");
      }

      const principal = copyPrincipal(job.principal);
      const selection = Object.freeze({ tenantId: job.selection.tenantId, branchId: job.selection.branchId });
      const input = job.input;
      const authority = await resolve(principal, selection, signal);
      signal.throwIfAborted();
      if (nowSeconds() >= proof.expiresAt) throw new ContextError("INVALID_PROOF");
      return {
        context: issueContext(principal, authority, access, {
          source: "worker", attemptId, correlationId: proof.correlationId, jobId: proof.jobId, executor,
        }, selection),
        input,
      };
    }).catch((error: unknown) => {
      auditDecision(audit, { source: "worker", attemptId, correlationId,
        resource: access.resource, action: access.action, decision: error instanceof ContextError ? error.code : "UNAVAILABLE" });
      throw error;
    });
    auditAllowed(audit, context);
    try {
      return await handle(context, input);
    } finally {
      releaseContext(context);
    }
  };
}
