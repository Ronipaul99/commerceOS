import type { ConnectionOptions } from "bullmq";
import { bullConsumer, BullDeliveryQueue } from "./bull.js";
import { defaultLimits, positiveInt } from "./contract.js";
import type { Database, Limits } from "./contract.js";
import { deliveryProcessor } from "./consume.js";
import type { ConsumerBinding } from "./consume.js";
import { OutboxRelay, pollOutbox } from "./relay.js";
import type { RelayBinding } from "./relay.js";
import { DeliveryStore } from "./store.js";

export type RuntimeOptions = Readonly<{
  database: Database;
  prefix: string;
  queueConnection: ConnectionOptions;
  workerConnection: ConnectionOptions;
  relay: RelayBinding;
  consumer: ConsumerBinding;
  limits?: Limits;
  intervalMs?: number;
  workerOptions?: Parameters<typeof bullConsumer>[3];
}>;

export async function startOutboxRuntime(options: RuntimeOptions): Promise<{ close: () => Promise<void> }> {
  const interval = options.intervalMs ?? 1000;
  if (!positiveInt(interval) || !/^[A-Za-z0-9_-]{1,128}(?![\s\S])/.test(options.prefix)) {
    throw new Error("Invalid outbox runtime configuration.");
  }
  const store = new DeliveryStore(options.database, options.limits ?? defaultLimits);
  const queue = new BullDeliveryQueue(options.queueConnection, options.prefix);
  const worker = bullConsumer(
    options.workerConnection, options.prefix, deliveryProcessor(store, options.consumer),
    options.workerOptions, options.consumer.metrics,
  );
  try {
    await Promise.all([queue.queue.waitUntilReady(), worker.waitUntilReady()]);
  } catch (error) {
    await Promise.allSettled([worker.close(true), queue.close()]);
    throw error;
  }
  const abort = new AbortController();
  const polling = pollOutbox(new OutboxRelay(store, queue, options.relay), abort.signal, interval);
  let stopping: Promise<void> | undefined;
  return {
    close() {
      stopping ??= (async () => {
        abort.abort();
        try {
          await polling;
          await worker.close();
        } finally {
          await queue.close();
        }
      })();
      return stopping;
    },
  };
}
