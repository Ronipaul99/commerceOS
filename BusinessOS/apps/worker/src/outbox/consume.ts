import { authorizeWrite, ContextError, createJobConsumer } from "@businessos/execution-context";
import type { AuthContext, Authority, JobBinding, RequestContext } from "@businessos/execution-context";
import { recordVerifiedScope } from "@businessos/telemetry";
import { access, consumer, deliveryIdentity, probePayload, referenceDigest, routing } from "./contract.js";
import type { Delivery, Sql } from "./contract.js";
import { report } from "./relay.js";
import type { MetricSink } from "./relay.js";
import { lookupEvent, terminal } from "./store.js";
import type { DeliveryStore } from "./store.js";

type Outcome = "APPLIED" | "DEDUPED" | "DEAD_LETTER" | "DENIED";
type Identity = NonNullable<ReturnType<typeof deliveryIdentity>>;

export type ConsumerBinding = Pick<JobBinding<Delivery>, "executor" | "authenticateService" | "keyFor" | "resolve" | "audit">
 & Readonly<{
   lockAuthority: (tx: Sql, auth: AuthContext) => Promise<Authority | undefined>;
   metrics?: MetricSink;
 }>;

async function lockEvent(tx: Sql, input: Delivery, context: RequestContext): Promise<Delivery> {
  const current = await lookupEvent(tx, input.eventId, true);
  if (!current || current.generation !== input.generation || current.proofDigest !== input.proofDigest
      || current.tenantId !== context.auth.tenantId || context.auth.scope.kind !== "branch"
      || current.branchId !== context.auth.scope.branchId || context.auth.scope.ownerId !== undefined
      || context.origin.source !== "worker" || current.correlationId !== context.origin.correlationId
      || (current.state !== "LEASED" && current.state !== "ENQUEUED" && current.state !== "COMPLETED")) {
    throw new ContextError("FORBIDDEN");
  }
  if (current.state !== "COMPLETED") {
    const [earlier] = await tx.$queryRawUnsafe<{ exists: boolean }[]>(`
      SELECT EXISTS(SELECT 1 FROM outbox_events WHERE tenant_id = $1::uuid AND aggregate_type = $2
        AND aggregate_id = $3::uuid AND aggregate_version < $4::int AND state <> 'COMPLETED') AS "exists"
    `, current.tenantId, current.aggregateType, current.aggregateId, current.aggregateVersion);
    if (earlier?.exists) throw new ContextError("FORBIDDEN");
  }
  return current;
}

async function reserve(
  store: DeliveryStore, binding: ConsumerBinding, context: RequestContext, input: Delivery,
): Promise<Outcome | "RESERVED"> {
  return store.database.$transaction((tx) => authorizeWrite(tx, context, access.apply, binding.lockAuthority, async (db) => {
    const row = await lockEvent(db, input, context);
    if (row.state === "COMPLETED") return "DEDUPED";
    const payload = probePayload(row);
    const [target] = payload ? await db.$queryRawUnsafe<{ present: boolean }[]>(
      `SELECT EXISTS (SELECT 1 FROM fixture_transaction_probe WHERE tenant_id = $1::uuid
         AND branch_id = $2::uuid AND id = $3::uuid) AS present`, row.tenantId, row.branchId, payload.probeRef,
    ) : [];
    if (!target?.present) {
      await terminal(db, row, "INVALID_EVENT");
      return "DEAD_LETTER";
    }
    if (row.attemptsUsed >= store.limits.maxAttempts) {
      // Reconciliation decides exhaustion after the queue is idle.
      return "DENIED";
    }
    await db.$executeRawUnsafe(`
      UPDATE outbox_events SET attempts_used = attempts_used + 1, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1::uuid
    `, row.eventId);
    return "RESERVED";
  }));
}

async function apply(
  store: DeliveryStore, binding: ConsumerBinding, context: RequestContext, input: Delivery,
  project: (tx: Sql, event: Delivery, payload: { probeRef: string }) => Promise<string>,
): Promise<Outcome> {
  return store.database.$transaction((tx) => authorizeWrite(tx, context, access.apply, binding.lockAuthority, async (db) => {
    const row = await lockEvent(db, input, context);
    if (row.state === "COMPLETED") return "DEDUPED";
    const payload = probePayload(row);
    if (!payload) throw new ContextError("FORBIDDEN");
    const inserted = await db.$executeRawUnsafe(`
      INSERT INTO inbox_dedupes (consumer, event_id, tenant_id) VALUES ($1, $2::uuid, $3::uuid)
        ON CONFLICT (consumer, event_id) DO NOTHING
    `, consumer, row.eventId, row.tenantId);
    if (inserted) {
      const effectRef = await project(db, row, payload);
      await db.$executeRawUnsafe(`
        UPDATE inbox_dedupes SET effect_ref = $4::uuid WHERE consumer = $1 AND event_id = $2::uuid AND tenant_id = $3::uuid
      `, consumer, row.eventId, row.tenantId, effectRef);
    }
    await db.$executeRawUnsafe(`
      UPDATE outbox_events SET state = 'COMPLETED', lease_token = NULL, lease_until = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1::uuid
    `, row.eventId);
    return inserted ? "APPLIED" : "DEDUPED";
  }));
}

export async function projectProbe(tx: Sql, event: Delivery, payload: { probeRef: string }): Promise<string> {
  const changed = await tx.$executeRawUnsafe(`
    INSERT INTO fixture_outbox_projection (event_id, tenant_id, branch_id, probe_ref)
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid)
  `, event.eventId, event.tenantId, event.branchId, payload.probeRef);
  if (changed !== 1) throw new Error("Projection unavailable.");
  return event.eventId;
}

export function deliveryProcessor(
  store: DeliveryStore, binding: ConsumerBinding,
  project = projectProbe,
): (id: string, reference: unknown) => Promise<Outcome> {
  async function load(identity: Identity, digest: string) {
    const row = await store.telemetry.observe("db.outbox_lookup", () => lookupEvent(store.database, identity.eventId));
    if (row?.branchId && row.generation === identity.generation && row.proofDigest === digest
        && (row.state === "ENQUEUED" || row.state === "LEASED" || row.state === "COMPLETED")) return row;
    return undefined;
  }
  return async (id, reference) => {
    const identity = deliveryIdentity(id);
    const digest = referenceDigest(reference);
    if (!identity || !digest) {
      report(binding.metrics, "denied");
      return "DENIED";
    }
    const consume = createJobConsumer<Delivery, Outcome>({
      route: routing, access: access.apply, allowDelegation: false, executor: binding.executor,
      authenticateService: binding.authenticateService, keyFor: binding.keyFor, resolve: binding.resolve,
      audit: binding.audit,
      loadJob: async (jobId) => {
        if (id !== jobId) return undefined;
        const row = await load(identity, digest);
        if (!row?.branchId) return undefined;
        return {
          identity: { ...routing, jobId, correlationId: row.correlationId },
          principal: binding.executor,
          selection: { tenantId: row.tenantId, branchId: row.branchId },
          input: row,
        };
      },
    }, (context, event) => store.telemetry.observe("outbox.consume", async () => {
      recordVerifiedScope(context.auth.tenantId, context.auth.principal.id);
      const reserved = await store.telemetry.observe("db.outbox_reserve", () => reserve(store, binding, context, event));
      if (reserved === "DEAD_LETTER") store.telemetry.signal("outbox.dead_letter", "error");
      return reserved === "RESERVED"
        ? store.telemetry.observe("db.outbox_apply", () => apply(store, binding, context, event, project)) : reserved;
    }, event.traceParent, (result) => result === "DENIED" ? "denied" : result === "DEAD_LETTER" ? "error" : "ok"));

    try {
      const result = await consume(reference);
      const metric = result === "APPLIED" ? "applied" : result === "DEDUPED" ? "deduped"
        : result === "DEAD_LETTER" ? "dead_letter" : "denied";
      report(binding.metrics, metric);
      return result;
    } catch (error) {
      if (error instanceof ContextError && error.code !== "UNAVAILABLE") {
        report(binding.metrics, "denied");
        return "DENIED";
      }
      // Queue-side diagnostics carry a stable code. Prisma errors may contain payload details.
      // eslint-disable-next-line preserve-caught-error
      throw new Error("OUTBOX_TRANSIENT_FAILURE");
    }
  };
}
