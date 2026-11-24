import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { authorizeWrite, ContextError, releaseContext, scopeFor } from "@businessos/execution-context";
import type { Access, AuthContext, Authority, RequestContext } from "@businessos/execution-context";
import { access, consumer, positiveInt, uuidValue } from "./contract.js";
import type { ReplayReason, Sql, State } from "./contract.js";
import type { DeliveryStore } from "./store.js";

const reasons = new Set<ReplayReason>(["FIX_APPLIED", "DEPENDENCY_RESTORED", "OPERATOR_REVIEW"]);
export type Operator = Readonly<{
  authorize: (access: Access) => Promise<RequestContext>;
  lockAuthority: (tx: Sql, auth: AuthContext) => Promise<Authority | undefined>;
}>;
type Summary = Readonly<{ eventId: string; occurredAt: string; state: State; generation: number; replayEligible: boolean }>;
const summaryColumns = `event_id AS "eventId",
  to_char(occurred_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "occurredAt",
  state, generation, (state = 'DEAD_LETTER' AND NOT EXISTS (
    SELECT 1 FROM inbox_dedupes receipt WHERE receipt.event_id = outbox_events.event_id AND receipt.consumer = outbox_events.consumer
  )) AS "replayEligible"`;

function cursor(value?: string): readonly [string | null, string | null] {
  if (value === undefined) return [null, null];
  if (!/^[A-Za-z0-9_-]{1,128}(?![\s\S])/.test(value)) throw new Error("Invalid cursor.");
  const [date, eventId, ...extra] = Buffer.from(value, "base64url").toString("utf8").split("|");
  if (!date || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z(?![\s\S])/.test(date)
      || !Number.isFinite(Date.parse(date)) || !uuidValue(eventId) || extra.length) throw new Error("Invalid cursor.");
  return [date, eventId];
}

function operatorScope(context: RequestContext, operation: Access) {
  const scope = scopeFor(context, operation);
  if (context.auth.principal.kind !== "human" || scope.ownerId !== undefined
      || !uuidValue(scope.tenantId) || !uuidValue(scope.branchId)) throw new ContextError("FORBIDDEN");
  return { tenant: scope.tenantId, branch: scope.branchId };
}

async function replay(
  store: DeliveryStore, op: Operator, context: RequestContext, eventId: string,
  generation: number, reason: ReplayReason, key: string,
) {
  const { tenant, branch } = operatorScope(context, access.replay);
  const requestKey = createHash("sha256").update(JSON.stringify([branch, key])).digest("hex");
  return store.database.$transaction((tx) => authorizeWrite(tx, context, access.replay, op.lockAuthority, async (db) => {
    const [event] = await db.$queryRawUnsafe<{ state: State; generation: number }[]>(`
      SELECT state, generation FROM outbox_events WHERE tenant_id = $1::uuid
        AND branch_id = $2::uuid AND event_id = $3::uuid AND consumer = $4 FOR UPDATE
    `, tenant, branch, eventId, consumer);
    if (!event) return { status: "NOT_FOUND" as const };
    const [prior] = await db.$queryRawUnsafe<{ generation: number; reason: string; operatorId: string }[]>(`
      SELECT generation, reason, operator_id AS "operatorId" FROM job_failures
      WHERE tenant_id = $1::uuid AND event_id = $2::uuid AND consumer = $3 AND request_key = $4
    `, tenant, eventId, consumer, requestKey);
    if (prior && prior.generation === generation && prior.reason === reason && prior.operatorId === context.auth.principal.id) {
      return { status: "REPLAYED" as const, eventId, generation: generation + 1 };
    }
    if (prior || event.state !== "DEAD_LETTER" || event.generation !== generation) return { status: "CONFLICT" as const };
    const inserted = await db.$executeRawUnsafe(`
      INSERT INTO job_failures (tenant_id,event_id,consumer,generation,kind,reason,operator_id,request_key,audit_ref)
      SELECT $1::uuid,$2::uuid,$3,$4::int,'REPLAY',$5,$6,$7,$8::uuid
      WHERE NOT EXISTS (SELECT 1 FROM inbox_dedupes WHERE consumer = $3 AND event_id = $2::uuid)
      ON CONFLICT DO NOTHING
    `, tenant, eventId, consumer, generation, reason, context.auth.principal.id, requestKey, context.origin.attemptId);
    if (inserted !== 1) return { status: "CONFLICT" as const };
    await db.$executeRawUnsafe(`
      UPDATE outbox_events SET state = 'READY', generation = generation + 1,
        dispatch_attempts = 0, attempts_used = 0, proof_digest = NULL, proof_expires_at = NULL,
        next_attempt_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1::uuid
    `, eventId);
    return { status: "REPLAYED" as const, eventId, generation: generation + 1 };
  }));
}

export async function operatorCommand(store: DeliveryStore, op: Operator, args: readonly string[]) {
  const [command, target, version, reason, key] = args;
  let context: RequestContext | undefined;
  try {
    if (command === "replay" && args.length === 5 && uuidValue(target) && positiveInt(Number(version))
        && String(Number(version)) === version && Number(version) < 2147483647 && reasons.has(reason as ReplayReason)
        && typeof key === "string" && /^[A-Za-z0-9_-]{1,128}(?![\s\S])/.test(key)) {
      context = await op.authorize(access.replay);
      return await replay(store, op, context, target, Number(version), reason as ReplayReason, key);
    }
    if (!(command === "status" && args.length === 1) && !(command === "list" && args.length <= 2)
        && !(command === "inspect" && args.length === 2 && uuidValue(target))) return { status: "INVALID_INPUT" };
    context = await op.authorize(access.inspect);
    const { tenant, branch } = operatorScope(context, access.inspect);
    const observedAt = new Date().toISOString();
    if (command === "status") {
      const rows = await store.database.$queryRawUnsafe<{
        state: State; count: number; oldest: Date; lastAdvance: Date;
      }[]>(`
        SELECT state, count(*)::int AS count, min(occurred_at) AS oldest, min(updated_at) AS "lastAdvance"
        FROM outbox_events WHERE tenant_id = $1::uuid AND branch_id = $2::uuid AND consumer = $3 GROUP BY state
      `, tenant, branch, consumer);
      const counts = { READY: 0, LEASED: 0, ENQUEUED: 0, COMPLETED: 0, DEAD_LETTER: 0 };
      const pending = rows.filter(({ state }) => state !== "COMPLETED" && state !== "DEAD_LETTER");
      for (const row of rows) counts[row.state] = row.count;
      const now = Date.parse(observedAt);
      return {
        status: !rows.length ? "EMPTY" : pending.some((row) => now - row.lastAdvance.getTime() > store.limits.leaseMs * 2)
          ? "STALE" : "OK",
        observedAt, counts, oldestPendingMs: pending.length ? Math.max(0, now - Math.min(...pending.map((row) => row.oldest.getTime()))) : null,
      };
    }
    if (command === "inspect") {
      const [entry] = await store.database.$queryRawUnsafe<Summary[]>(`
        SELECT ${summaryColumns} FROM outbox_events WHERE tenant_id = $1::uuid AND branch_id = $2::uuid
          AND event_id = $3::uuid AND consumer = $4
      `, tenant, branch, target, consumer);
      if (!entry) return { status: "NOT_FOUND" };
      const history = await store.database.$queryRawUnsafe(`
        SELECT generation, kind, reason, recorded_at AS "recordedAt"
        FROM job_failures WHERE tenant_id = $1::uuid AND event_id = $2::uuid AND consumer = $3
        ORDER BY generation DESC, recorded_at DESC, id DESC LIMIT 25
      `, tenant, target, consumer);
      return { status: "OK", observedAt, entry, history };
    }
    let page: readonly [string | null, string | null];
    try { page = cursor(target); } catch { return { status: "INVALID_INPUT" }; }
    const rows = await store.database.$queryRawUnsafe<Summary[]>(`
      SELECT ${summaryColumns} FROM outbox_events WHERE tenant_id = $1::uuid AND branch_id = $2::uuid AND consumer = $3
        AND ($4::timestamptz IS NULL OR (occurred_at, event_id) < ($4::timestamptz, $5::uuid))
      ORDER BY occurred_at DESC, event_id DESC LIMIT 26
    `, tenant, branch, consumer, ...page);
    const last = rows[24];
    return { status: rows.length ? "OK" : "EMPTY", observedAt, entries: rows.slice(0, 25),
      nextCursor: last && rows.length > 25 ? Buffer.from(last.occurredAt + "|" + last.eventId).toString("base64url") : null };
  } catch (error) {
    return { status: error instanceof ContextError && error.code !== "UNAVAILABLE" ? "DENIED" : "UNAVAILABLE" };
  } finally {
    if (context) releaseContext(context);
  }
}

export async function runOperatorCli(
  store: DeliveryStore, op: Operator, args: readonly string[], write: (line: string) => void,
): Promise<number> {
  const result = await operatorCommand(store, op, args);
  write(JSON.stringify(result) + "\n");
  if (result.status === "DENIED") return 3;
  if (result.status === "UNAVAILABLE") return 4;
  return ["OK", "EMPTY", "STALE", "REPLAYED"].includes(result.status) ? 0 : 2;
}
