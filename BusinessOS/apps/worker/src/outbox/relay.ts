import type { KeyObject } from "node:crypto";
import { randomInt } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { signJobReference } from "@businessos/execution-context";
import type { JobReference, Principal } from "@businessos/execution-context";
import { deliveryId, referenceDigest, routing } from "./contract.js";
import type { Delivery } from "./contract.js";
import type { DeliveryStore } from "./store.js";

export type QueueObservation = Readonly<{
  state: "missing" | "waiting" | "active" | "failed" | "completed";
  reference?: unknown;
  stalled?: boolean;
}>;
export interface DeliveryQueue {
  size(): Promise<number>;
  observe(id: string): Promise<QueueObservation>;
  send(id: string, reference: JobReference, attempts: number, backoffMs: number): Promise<void>;
  removeIfIdle(id: string): Promise<boolean>;
}
export type Metric = "claimed" | "enqueued" | "enqueue_failure" | "reconciled" | "reconcile_failure"
  | "dead_letter" | "applied" | "deduped" | "denied" | "poll_failure";
export type MetricSink = (metric: Metric) => void;
export function report(metrics: MetricSink | undefined, event: Metric): void {
  try { metrics?.(event); } catch { /* Observability cannot control delivery. */ }
}

export type RelayBinding = Readonly<{
  principal: Principal;
  authenticateService: () => Promise<Principal | undefined>;
  signingKey: () => Promise<Readonly<{ id: string; key: KeyObject }>>;
  metrics?: MetricSink;
}>;

export class OutboxRelay {
  constructor(readonly store: DeliveryStore, readonly queue: DeliveryQueue, readonly binding: RelayBinding) {}

  async #authorize(): Promise<void> {
    const service = await this.binding.authenticateService();
    const bound = this.binding.principal;
    if (bound.kind !== "service" || !bound.id || !bound.identityRef || service?.kind !== "service"
      || service.id !== bound.id || service.identityRef !== bound.identityRef) {
      throw new Error("Outbox relay authority is unavailable.");
    }
  }

  async dispatch(): Promise<number> {
    await this.#authorize();
    const { queueCapacity } = this.store.limits;
    const available = Math.max(0, queueCapacity - await this.queue.size());
    if (!available) return 0;
    const rows = await this.store.claim(available);
    for (const row of rows) {
      report(this.binding.metrics, "claimed");
      await this.#dispatch(row);
    }
    return rows.length;
  }

  async #dispatch(row: Delivery): Promise<void> {
    const { limits } = this.store;
    const id = deliveryId(row.eventId, row.generation);
    try {
      const previous = await this.queue.observe(id);
      if (previous.state !== "missing") {
        if (row.proofDigest && referenceDigest(previous.reference) === row.proofDigest) {
          await this.store.acknowledge(row);
          return;
        }
        if (!await this.queue.removeIfIdle(id)) return;
      }
      if (row.dispatchAttempts >= limits.maxDispatchAttempts || row.attemptsUsed >= limits.maxAttempts) {
        await this.store.exhaustedDispatch(row,
          row.attemptsUsed >= limits.maxAttempts ? "CONSUMER_EXHAUSTED" : "DISPATCH_EXHAUSTED");
        report(this.binding.metrics, "dead_letter");
        return;
      }

      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = issuedAt + limits.proofSeconds;
      const { id: keyId, key } = await this.binding.signingKey();
      const reference = signJobReference({
        ...routing, keyId, version: 1, jobId: id, correlationId: row.correlationId, issuedAt, expiresAt,
      }, key);
      const digest = referenceDigest(reference);
      if (!digest || await this.store.prepare(row, digest, new Date(expiresAt * 1000)) !== 1) return;
      await this.queue.send(id, reference, limits.maxAttempts - row.attemptsUsed, limits.backoffMs);
      await this.store.acknowledge(row);
      report(this.binding.metrics, "enqueued");
    } catch {
      report(this.binding.metrics, "enqueue_failure");
      const delay = limits.backoffMs * (2 ** Math.min(9, row.dispatchAttempts));
      await this.store.dispatchFailed(row, randomInt(Math.max(1, Math.floor(delay / 2)), delay + 1));
    }
  }

  async reconcile(): Promise<number> {
    await this.#authorize();
    let changed = 0;
    for (const row of await this.store.due()) {
      try {
        if (await this.#observe(row)) changed++;
      } catch {
        report(this.binding.metrics, "reconcile_failure");
      }
    }
    return changed;
  }

  async #observe(row: Delivery): Promise<boolean> {
    const id = deliveryId(row.eventId, row.generation);
    const seen = await this.queue.observe(id);
    const matches = row.proofDigest !== null && referenceDigest(seen.reference) === row.proofDigest;
    const expired = !row.proofExpiresAt || row.proofExpiresAt.getTime() <= Date.now();
    if (seen.state === "active" || (seen.state === "waiting" && matches && !expired)) {
      await this.store.settleObservation(row, "KEEP");
      return false;
    }
    if (seen.state !== "missing" && !await this.queue.removeIfIdle(id)) return false;
    const outcome = row.attemptsUsed >= this.store.limits.maxAttempts ? "CONSUMER_EXHAUSTED"
      : matches && !expired && seen.stalled && row.attemptsUsed > 0 ? "QUEUE_FAILED" : "REQUEUE";
    const changed = await this.store.settleObservation(row, outcome);
    if (changed) report(this.binding.metrics, outcome === "REQUEUE" ? "reconciled" : "dead_letter");
    return changed;
  }
}

export async function pollOutbox(
  relay: OutboxRelay, signal: AbortSignal, intervalMs = 1000,
): Promise<void> {
  while (!signal.aborted) {
    try {
      await relay.reconcile();
      if (!signal.aborted) await relay.dispatch();
    } catch {
      report(relay.binding.metrics, "poll_failure");
    }
    try {
      await sleep(intervalMs, undefined, { signal });
    } catch (error) {
      if (!signal.aborted) throw error;
    }
  }
}
