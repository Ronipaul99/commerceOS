import process from "node:process";
import { bullConsumer, deliveryProcessor, DeliveryStore } from "../../apps/worker/dist/outbox/index.js";
import { consumerBinding, keyFromEnvironment, limits, options, prismaRuntime, workerConnection } from "./fixture.mjs";

const db = await prismaRuntime(process.env.M0106_TEST_DATABASE_URL);
const store = new DeliveryStore(db, limits);
const processDelivery = deliveryProcessor(store, consumerBinding(db, keyFromEnvironment()));
const worker = bullConsumer(workerConnection(), process.env.M0106_TEST_PREFIX, async (id, reference) => {
  const result = await processDelivery(id, reference);
  if (result === "APPLIED") {
    process.send?.({ phase: "COMMITTED" });
    await new Promise(() => {});
  }
  return result;
}, options);
await worker.waitUntilReady();
