import { randomUUID } from "node:crypto";
import { ContextError, scopeFor } from "@businessos/execution-context";
import type { RequestContext } from "@businessos/execution-context";
import { activeTraceParent } from "@businessos/telemetry";
import { workerTelemetry } from "../observability.js";
import { access, consumer, positiveInt, validateLimits, validatePayload, uuidValue } from "./contract.js";
import type { Database, Delivery, Failure, Limits, Sql } from "./contract.js";

export const columns = `event_id AS "eventId", tenant_id AS "tenantId", branch_id AS "branchId",
  event_type AS "eventType", schema_version AS "schemaVersion", aggregate_type AS "aggregateType",
  aggregate_id AS "aggregateId", aggregate_version AS "aggregateVersion", occurred_at AS "occurredAt",
  correlation_id AS "correlationId", causation_id AS "causationId", trace_parent AS "traceParent", payload, consumer, state, generation,
  dispatch_attempts AS "dispatchAttempts", attempts_used AS "attemptsUsed", next_attempt_at AS "nextAttemptAt",
  lease_token AS "leaseToken", proof_digest AS "proofDigest", proof_expires_at AS "proofExpiresAt",
  updated_at AS "updatedAt"`;

export async function appendProbeEvent(
  tx: Sql, context: RequestContext, aggregateVersion: number, probeRef: string,
  telemetry = workerTelemetry,
): Promise<string> {
  const scope = scopeFor(context, access.publish);
  const { tenantId, branchId } = scope;
  const { correlationId, attemptId } = context.origin;
  if (scope.ownerId !== undefined || !uuidValue(tenantId) || !uuidValue(branchId)
      || !uuidValue(correlationId) || !uuidValue(attemptId)
      || !positiveInt(aggregateVersion) || !validatePayload({ probeRef })) {
    throw new ContextError("FORBIDDEN");
  }
  // The producer holds its aggregate row lock before allocating this version.
  const id = randomUUID();
  const inserted = await telemetry.observe("db.outbox_append", () => tx.$executeRawUnsafe(`
    INSERT INTO outbox_events (event_id, tenant_id, branch_id, event_type, schema_version, aggregate_type,
       aggregate_id, aggregate_version, correlation_id, causation_id, payload, consumer, trace_parent)
    SELECT $1::uuid, $2::uuid, $3::uuid, 'fixture.probe_recorded', 1, 'fixture.branch', $3::uuid,
       $4::int, $5::uuid, $6::uuid, $7::jsonb, $8, $10
    WHERE EXISTS (
      SELECT 1 FROM fixture_transaction_probe WHERE tenant_id = $2::uuid AND branch_id = $3::uuid AND id = $9::uuid
    ) AND NOT EXISTS (
      SELECT 1 FROM outbox_events WHERE tenant_id = $2::uuid AND aggregate_type = 'fixture.branch'
        AND aggregate_id = $3::uuid AND aggregate_version >= $4::int
    )
  `, id, tenantId, branchId, aggregateVersion, correlationId, attemptId, JSON.stringify({ probeRef }), consumer, probeRef, activeTraceParent()),
  undefined, (count) => count === 1 ? "ok" : "denied");
  if (inserted !== 1) throw new Error("The scoped outbox append was rejected.");
  return id;
}

export async function lookupEvent(tx: Sql, eventId: string, lock = false): Promise<Delivery | undefined> {
  const [row] = await tx.$queryRawUnsafe<Delivery[]>(
    `SELECT ${columns} FROM outbox_events WHERE event_id = $1::uuid AND consumer = $2${lock ? " FOR UPDATE" : ""}`,
    eventId, consumer,
  );
  return row;
}

export async function terminal(tx: Sql, row: Delivery, reason: Failure): Promise<void> {
  await tx.$executeRawUnsafe(`
    UPDATE outbox_events SET state = 'DEAD_LETTER', lease_token = NULL, lease_until = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE event_id = $1::uuid AND generation = $2::int
  `, row.eventId, row.generation);
  await tx.$executeRawUnsafe(`
    INSERT INTO job_failures (tenant_id, event_id, consumer, generation, kind, reason)
    VALUES ($1::uuid, $2::uuid, $3, $4::int, 'FAILURE', $5)
  `, row.tenantId, row.eventId, consumer, row.generation, reason);
}

export class DeliveryStore {
  readonly limits: Limits;

  constructor(readonly database: Database, limits: Limits, readonly telemetry = workerTelemetry) {
    this.limits = validateLimits(limits);
  }

  claim(count: number): Promise<Delivery[]> {
    const { limits } = this;
    return this.telemetry.observe("db.outbox_claim", () => this.database.$transaction(async (tx) => {
      const [permit] = await tx.$queryRawUnsafe<{ locked: boolean }[]>(
        "SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked", "outbox-admission-" + consumer,
      );
      if (!permit?.locked) return [];
      const claimed: Delivery[] = [];
      for (let index = 0; index < Math.min(count, limits.batchSize); index++) {
        const [row] = await tx.$queryRawUnsafe<Delivery[]>(`
          UPDATE outbox_events SET state = 'LEASED', lease_token = gen_random_uuid(),
             lease_until = CURRENT_TIMESTAMP + $2::int * interval '1 millisecond',
             updated_at = CURRENT_TIMESTAMP
          WHERE event_id = (
            SELECT candidate.event_id FROM outbox_events candidate
            WHERE candidate.consumer = $1 AND (
              (candidate.state = 'LEASED' AND candidate.lease_until <= CURRENT_TIMESTAMP)
              OR (candidate.state = 'READY' AND candidate.next_attempt_at <= CURRENT_TIMESTAMP
                AND (SELECT count(*) FROM outbox_events active WHERE active.consumer = $1
                  AND active.state IN ('LEASED','ENQUEUED')) < $3::int
                AND (SELECT count(*) FROM outbox_events active WHERE active.consumer = $1
                  AND active.tenant_id = candidate.tenant_id AND active.state IN ('LEASED','ENQUEUED')) < $4::int)
            ) AND NOT EXISTS (
              SELECT 1 FROM outbox_events earlier WHERE earlier.tenant_id = candidate.tenant_id
                AND earlier.aggregate_type = candidate.aggregate_type AND earlier.aggregate_id = candidate.aggregate_id
                AND earlier.aggregate_version < candidate.aggregate_version AND earlier.state <> 'COMPLETED'
            )
            ORDER BY candidate.next_attempt_at, candidate.event_id LIMIT 1 FOR UPDATE OF candidate SKIP LOCKED
          ) RETURNING ${columns}
        `, consumer, limits.leaseMs, limits.queueCapacity, limits.tenantCapacity);
        if (!row) break;
        claimed.push(row);
      }
      return claimed;
    }));
  }

  prepare(row: Delivery, digest: string, expiresAt: Date): Promise<number> {
    return this.database.$executeRawUnsafe(`
      UPDATE outbox_events SET proof_digest = $4, proof_expires_at = $5,
        dispatch_attempts = dispatch_attempts + 1, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1::uuid AND generation = $2::int AND lease_token = $3::uuid
        AND state = 'LEASED' AND lease_until > CURRENT_TIMESTAMP
    `, row.eventId, row.generation, row.leaseToken, digest, expiresAt);
  }

  acknowledge(row: Delivery): Promise<number> {
    return this.database.$executeRawUnsafe(`
      UPDATE outbox_events SET state = 'ENQUEUED', lease_token = NULL, lease_until = NULL, dispatch_attempts = 0,
        next_attempt_at = CURRENT_TIMESTAMP + $4::int * interval '1 millisecond', updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1::uuid AND generation = $2::int AND lease_token = $3::uuid AND state = 'LEASED'
    `, row.eventId, row.generation, row.leaseToken, this.limits.reconcileMs);
  }

  dispatchFailed(row: Delivery, delayMs: number): Promise<void> {
    return this.database.$transaction(async (tx) => {
      const locked = await lookupEvent(tx, row.eventId, true);
      if (!locked || locked.state !== "LEASED" || locked.generation !== row.generation
          || locked.leaseToken !== row.leaseToken) return;
      // Preserve ambiguous enqueues as a lease. Recovery observes the same job ID after backoff.
      await tx.$executeRawUnsafe(`
        UPDATE outbox_events SET lease_until = CURRENT_TIMESTAMP + $2::int * interval '1 millisecond',
          updated_at = CURRENT_TIMESTAMP WHERE event_id = $1::uuid
      `, row.eventId, delayMs);
    });
  }

  exhaustedDispatch(row: Delivery, reason: "DISPATCH_EXHAUSTED" | "CONSUMER_EXHAUSTED"): Promise<void> {
    return this.database.$transaction(async (tx) => {
      const locked = await lookupEvent(tx, row.eventId, true);
      if (locked?.state === "LEASED" && locked.generation === row.generation && locked.leaseToken === row.leaseToken) {
        await terminal(tx, locked, reason);
      }
    });
  }

  due(): Promise<Delivery[]> {
    return this.telemetry.observe("db.outbox_lookup", () => this.database.$queryRawUnsafe<Delivery[]>(`
      SELECT ${columns} FROM outbox_events WHERE consumer = $1 AND state = 'ENQUEUED'
        AND next_attempt_at <= CURRENT_TIMESTAMP
      ORDER BY next_attempt_at, event_id LIMIT $2::int
    `, consumer, this.limits.batchSize));
  }

  settleObservation(row: Delivery, outcome: "KEEP" | "REQUEUE" | Failure): Promise<boolean> {
    return this.database.$transaction(async (tx) => {
      const locked = await lookupEvent(tx, row.eventId, true);
      if (!locked || locked.state !== "ENQUEUED" || locked.generation !== row.generation
          || locked.proofDigest !== row.proofDigest || locked.attemptsUsed !== row.attemptsUsed
          || locked.nextAttemptAt.getTime() > Date.now()) return false;
      if (outcome === "KEEP" || outcome === "REQUEUE") {
        await tx.$executeRawUnsafe(`
          UPDATE outbox_events SET state = $2,
             next_attempt_at = CURRENT_TIMESTAMP + $3::int * interval '1 millisecond', updated_at = CURRENT_TIMESTAMP
          WHERE event_id = $1::uuid
        `, row.eventId, outcome === "KEEP" ? "ENQUEUED" : "READY", outcome === "KEEP" ? this.limits.reconcileMs : 0);
      } else {
        await terminal(tx, locked, outcome);
      }
      return true;
    });
  }
}
