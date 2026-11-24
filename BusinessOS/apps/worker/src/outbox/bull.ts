import { Queue, Worker } from "bullmq";
import type { ConnectionOptions, WorkerOptions } from "bullmq";
import type { JobReference } from "@businessos/execution-context";
import { routing } from "./contract.js";
import type { DeliveryQueue, QueueObservation, MetricSink } from "./relay.js";
import { report } from "./relay.js";

export class BullDeliveryQueue implements DeliveryQueue {
  readonly queue: Queue<JobReference>;

  constructor(connection: ConnectionOptions, prefix: string) {
    this.queue = new Queue<JobReference>(routing.queue, { connection, prefix });
    this.queue.on("error", () => { /* Command failures are reported by the relay. */ });
  }

  async size(): Promise<number> {
    const counts = await this.queue.getJobCounts("waiting", "active", "delayed", "prioritized", "paused");
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }

  async observe(id: string): Promise<QueueObservation> {
    const job = await this.queue.getJob(id);
    if (!job) return { state: "missing" };
    const state = await job.getState();
    if (state === "unknown") return { state: "missing" };
    return {
      state: state === "active" || state === "failed" || state === "completed" ? state : "waiting",
      reference: job.data,
      stalled: state === "failed" && job.failedReason === "job stalled more than allowable limit",
    };
  }

  async send(id: string, reference: JobReference, attempts: number, backoffMs: number): Promise<void> {
    await this.queue.add(routing.operation, reference, {
      jobId: id, attempts, backoff: { type: "exponential", delay: backoffMs, jitter: 0.5 },
      removeOnComplete: { count: 1000 }, removeOnFail: { count: 1000 },
    });
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
): Worker<JobReference, string> {
  const worker = new Worker<JobReference, string>(routing.queue, async (job) => {
    if (!job.id || job.name !== routing.operation) {
      report(metrics, "denied");
      return "DENIED";
    }
    return process(job.id, job.data);
  }, { ...options, connection, prefix });
  worker.on("error", () => report(metrics, "poll_failure"));
  return worker;
}
