import { Queue, Worker } from "bullmq";
import type { ConnectionOptions, WorkerOptions } from "bullmq";
import type { JobReference } from "@businessos/execution-context";
import { routing } from "./contract.js";
import type { DeliveryQueue, QueueObservation, MetricSink } from "./relay.js";
import { report } from "./relay.js";
import { workerTelemetry } from "../observability.js";

export class BullDeliveryQueue implements DeliveryQueue {
  readonly queue: Queue<JobReference>;

  constructor(connection: ConnectionOptions, prefix: string, private readonly telemetry = workerTelemetry) {
    this.queue = new Queue<JobReference>(routing.queue, { connection, prefix });
    this.queue.on("error", () => this.telemetry.signal("queue.outbox_connection", "error"));
  }

  async size(): Promise<number> {
    const counts = await this.telemetry.observe("queue.outbox_read", () =>
      this.queue.getJobCounts("waiting", "active", "delayed", "prioritized", "paused"));
    const depth = Object.values(counts).reduce((sum, count) => sum + count, 0);
    this.telemetry.queueSample("outbox", { depth });
    return depth;
  }

  async observe(id: string): Promise<QueueObservation> {
    return this.telemetry.observe("queue.outbox_read", async () => {
      const job = await this.queue.getJob(id);
      if (!job) return { state: "missing" };
      const state = await job.getState();
      if (state === "unknown") return { state: "missing" };
      return {
        state: state === "active" || state === "failed" || state === "completed" ? state : "waiting",
        reference: job.data,
        stalled: state === "failed" && job.failedReason === "job stalled more than allowable limit",
      };
    });
  }

  async send(id: string, reference: JobReference, attempts: number, backoffMs: number): Promise<void> {
    await this.telemetry.observe("queue.outbox_enqueue", () => this.queue.add(routing.operation, reference, {
      jobId: id, attempts, backoff: { type: "exponential", delay: backoffMs, jitter: 0.5 },
      removeOnComplete: { count: 1000 }, removeOnFail: { count: 1000 },
    }));
  }

  async removeIfIdle(id: string): Promise<boolean> {
    return await this.queue.remove(id) === 1;
  }

  close(): Promise<void> {
    return this.queue.close();
  }
}

export function bullConsumer(
  connection: ConnectionOptions, prefix: string, process: (id: string, reference: unknown) => Promise<string>,
  options: Pick<WorkerOptions, "concurrency" | "lockDuration" | "stalledInterval" | "maxStalledCount"> = {},
  metrics?: MetricSink,
  telemetry = workerTelemetry,
): Worker<JobReference, string> {
  const worker = new Worker<JobReference, string>(routing.queue, async (job) => {
    if (!job.id || job.name !== routing.operation) {
      report(metrics, "denied");
      return "DENIED";
    }
    return process(job.id, job.data);
  }, { ...options, connection, prefix });
  worker.on("error", () => {
    telemetry.signal("queue.outbox_connection", "error");
    report(metrics, "poll_failure");
  });
  worker.on("stalled", () => telemetry.signal("queue.outbox_stalled", "error"));
  worker.on("failed", () => telemetry.signal("queue.outbox_failed", "error"));
  return worker;
}
