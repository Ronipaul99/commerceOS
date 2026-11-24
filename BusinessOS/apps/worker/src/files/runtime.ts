import { Queue, Worker } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { fileQueue, ScanDispatcher, scanProcessor } from "@businessos/file-jobs";
import type { JobReference } from "@businessos/execution-context";
import { setTimeout as wait } from "node:timers/promises";

type Options = Readonly<{
  connection: ConnectionOptions;
  workerConnection: ConnectionOptions;
  prefix: string;
  processor: ReturnType<typeof scanProcessor>;
  repository: ConstructorParameters<typeof ScanDispatcher>[0];
  signing: ConstructorParameters<typeof ScanDispatcher>[2];
  report?: (code: "QUEUE_UNAVAILABLE" | "DISPATCH_UNAVAILABLE") => void;
}>;

export async function startFileJobs(options: Options) {
  const { connection, prefix } = options;
  if (!/^[A-Za-z0-9_-]{1,128}(?![\s\S])/.test(prefix)) throw new Error("Invalid scan queue prefix.");
  const queue = new Queue<JobReference>(fileQueue.queue, { connection, prefix });
  const worker = new Worker<JobReference>(fileQueue.queue, (job) => job.id && job.name === fileQueue.operation
    ? options.processor(job.id, job.data) : Promise.resolve("DENIED"),
  { connection: options.workerConnection, prefix, concurrency: 2 });
  const report = (code: "QUEUE_UNAVAILABLE" | "DISPATCH_UNAVAILABLE") => {
    try { options.report?.(code); } catch { /* Observability must not stop scanning. */ }
  };
  queue.on("error", () => report("QUEUE_UNAVAILABLE"));
  worker.on("error", () => report("QUEUE_UNAVAILABLE"));
  try {
    await Promise.all([queue.waitUntilReady(), worker.waitUntilReady()]);
  } catch (error) {
    await Promise.allSettled([worker.close(true), queue.close()]);
    throw error;
  }
  const dispatcher = new ScanDispatcher(options.repository, async (id, reference) => {
    await queue.add(fileQueue.operation, reference, { jobId: id, removeOnComplete: 100, removeOnFail: 100 });
  }, options.signing);
  const abort = new AbortController();
  const polling = (async () => {
    while (!abort.signal.aborted) {
      try {
        const counts = await queue.getJobCounts("waiting", "active", "paused");
        if (Object.values(counts).reduce((sum, count) => sum + count, 0) < 16) await dispatcher.dispatch();
      } catch { report("DISPATCH_UNAVAILABLE"); }
      await wait(250, undefined, { signal: abort.signal }).catch(() => undefined);
    }
  })();
  let closing: Promise<void> | undefined;
  return {
    close() {
      return closing ??= (async () => {
        abort.abort();
        try { await polling; await worker.close(); } finally { await queue.close(); }
      })();
    },
  };
}
