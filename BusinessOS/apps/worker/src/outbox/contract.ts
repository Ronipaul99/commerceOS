import { createHash } from "node:crypto";

export const routing = Object.freeze({
  issuer: "businessos-outbox", audience: "businessos-worker", queue: "outbox-fixture", operation: "consume-probe",
});
export const consumer = "fixture-projection";
export const access = {
  publish: { resource: "fixture-probe", action: "publish", ownership: "branch" },
  apply: { resource: "fixture-probe", action: "project", ownership: "branch" },
  inspect: { resource: "outbox", action: "inspect", ownership: "branch" },
  replay: { resource: "outbox", action: "replay", ownership: "branch" },
} as const;

export type State = "READY" | "LEASED" | "ENQUEUED" | "COMPLETED" | "DEAD_LETTER";
export type Failure = "INVALID_EVENT" | "DISPATCH_EXHAUSTED" | "CONSUMER_EXHAUSTED" | "QUEUE_FAILED";
export type ReplayReason = "FIX_APPLIED" | "DEPENDENCY_RESTORED" | "OPERATOR_REVIEW";

export type Envelope = Readonly<{
  eventId: string;
  tenantId: string;
  branchId: string | null;
  eventType: string;
  schemaVersion: number;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: Date;
  correlationId: string;
  causationId: string;
  traceParent?: string | null;
  payload: unknown;
  consumer: string;
}>;

export type Delivery = Envelope & Readonly<{
  state: State;
  generation: number;
  dispatchAttempts: number;
  attemptsUsed: number;
  nextAttemptAt: Date;
  leaseToken: string | null;
  proofDigest: string | null;
  proofExpiresAt: Date | null;
  updatedAt: Date;
}>;

export interface Sql {
  $queryRawUnsafe<T>(query: string, ...parameters: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...parameters: unknown[]): Promise<number>;
}
export interface Database extends Sql {
  $transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T>;
}

export type Limits = Readonly<{
  batchSize: number;
  queueCapacity: number;
  tenantCapacity: number;
  leaseMs: number;
  reconcileMs: number;
  maxDispatchAttempts: number;
  maxAttempts: number;
  backoffMs: number;
  proofSeconds: number;
}>;

export const defaultLimits: Limits = Object.freeze({
  batchSize: 8, queueCapacity: 32, tenantCapacity: 8, leaseMs: 15000, reconcileMs: 5000,
  maxDispatchAttempts: 5, maxAttempts: 4, backoffMs: 500, proofSeconds: 120,
});

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?![\s\S])/;
export const uuidValue = (value: unknown): value is string => typeof value === "string" && uuid.test(value);
export const positiveInt = (value: unknown): value is number => typeof value === "number"
  && Number.isInteger(value) && value > 0 && value <= 2147483647;

export function validateLimits(limits: Limits): Limits {
  if (!(Object.keys(defaultLimits) as (keyof Limits)[]).every((key) => positiveInt(limits[key]))
      || limits.batchSize > 64
      || limits.tenantCapacity > limits.queueCapacity || limits.maxAttempts > 10
      || limits.maxDispatchAttempts > 10 || limits.proofSeconds > 300
      || 1000 * limits.proofSeconds <= limits.leaseMs + limits.reconcileMs
        + limits.backoffMs * (2 ** (limits.maxAttempts - 1) - 1)) {
    throw new Error("Invalid outbox delivery limits.");
  }
  return Object.freeze({ ...limits });
}

export function validatePayload(value: unknown): { probeRef: string } | undefined {
  if (!value || typeof value !== "object" || Reflect.ownKeys(value).length !== 1
      || !Object.hasOwn(value, "probeRef") || !("probeRef" in value) || !uuidValue(value.probeRef)) return undefined;
  return { probeRef: value.probeRef };
}

export function probePayload(event: Envelope): { probeRef: string } | undefined {
  if (event.eventType !== "fixture.probe_recorded" || event.schemaVersion !== 1
      || event.aggregateType !== "fixture.branch" || event.consumer !== consumer || !uuidValue(event.branchId)
      || !uuidValue(event.eventId) || !uuidValue(event.tenantId) || !uuidValue(event.aggregateId)
      || !uuidValue(event.correlationId) || !uuidValue(event.causationId) || !positiveInt(event.aggregateVersion)
      || event.aggregateId !== event.branchId || !Number.isFinite(event.occurredAt.getTime())) return undefined;
  return validatePayload(event.payload);
}

export function referenceDigest(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length !== 11 || entries.some(([key, entry]) => key.length > 32 ||
      (typeof entry === "string" ? entry.length > 128 : !Number.isSafeInteger(entry)))) return undefined;
  entries.sort(([left], [right]) => left < right ? -1 : left === right ? 0 : 1);
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}

export function deliveryId(eventId: string, generation: number): string {
  return consumer + "-" + eventId + "-" + generation;
}

export function deliveryIdentity(jobId: string): { eventId: string; generation: number } | undefined {
  const prefix = consumer + "-";
  if (!jobId.startsWith(prefix)) return undefined;
  const id = jobId.slice(prefix.length, prefix.length + 36);
  const generation = Number(jobId.slice(prefix.length + 37));
  return uuidValue(id) && positiveInt(generation) && jobId === deliveryId(id, generation)
    ? { eventId: id, generation } : undefined;
}
