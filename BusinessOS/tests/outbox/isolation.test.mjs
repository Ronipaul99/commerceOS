import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createSecretKey, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import process from "node:process";
import { test } from "node:test";
import { setTimeout as pause } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";
import { generate, migrate, pool, verifySchema, withCluster, withDisposableServer } from "../../packages/database/fixtures/cluster.mjs";
import {
  BullDeliveryQueue, DeliveryStore, OutboxRelay, bullConsumer, deliveryId, deliveryProcessor, operatorCommand, projectProbe,
  runOperatorCli, startOutboxRuntime,
} from "../../apps/worker/dist/outbox/index.js";
import {
  a1, b1, b2, branchDigest, consumerBinding, counts, dispatcher, limits, operator,
  options, prismaRuntime, provision, publish, putInvalidEvent, queueState, redisConnection, state, workerConnection,
} from "./fixture.mjs";

async function until(description, read) {
  const deadline = Date.now() + 9000;
  while (Date.now() < deadline) {
    const result = await read();
    if (result) return result;
    await pause(30);
  }
  assert.fail(description + " did not converge");
}

test("M01.06 PostgreSQL and BullMQ delivery", { timeout: 180000 }, async (t) => {
  const connection = redisConnection();
  await withDisposableServer((url) => withCluster(url, async (version, createDatabase) => {
    const fixture = await createDatabase();
    await generate();
    await migrate(fixture);
    await verifySchema(fixture);
    const owner = pool(fixture.migrationUrl);
    const db = await prismaRuntime(fixture.runtimeUrl);
    const prefix = "m0106-fixture-" + randomUUID();
    const queue = new BullDeliveryQueue(connection, prefix);
    const keyBytes = randomBytes(32);
    const key = createSecretKey(keyBytes);
    const metrics = [];
    const binding = consumerBinding(db, key, { metrics: (code) => metrics.push(code) });
    const store = new DeliveryStore(db, limits);
    const relayBinding = { principal: dispatcher, authenticateService: async () => dispatcher,
      signingKey: async () => ({ id: "test-key", key }), metrics: (code) => metrics.push(code) };
    const relay = new OutboxRelay(store, queue, relayBinding);
    const processDelivery = deliveryProcessor(store, binding);
    const job = (event, generation = 1) => queue.queue.getJob(deliveryId(event, generation));
    const completed = (id, generation = 1) => until("BullMQ completion", async () => await queueState(queue, id, generation) === "completed");
    const settled = (id) => until("durable completion", async () => (await state(owner, id))?.state === "COMPLETED");
    const redis = await queue.queue.client;
    const redisVersion = /^redis_version:(.+)/m.exec(await redis.info("server"))?.[1]?.trim();
    t.diagnostic(`PostgreSQL ${version} and Redis ${redisVersion}, physical BullMQ queue.`);
    try {
      await provision(owner, fixture);
      const protectedSibling = await branchDigest(owner);
      const emptyPeer = await branchDigest(owner, b1);
      async function consume(action, project) {
        const processFn = project ? deliveryProcessor(store, binding, project) : processDelivery;
        const worker = bullConsumer(workerConnection(), prefix, processFn, options);
        try {
          await worker.waitUntilReady();
          return await action();
        } finally {
          await worker.close();
        }
      }

      await t.test("OUT-01 atomic publication and consumption with stable source key", async () => {
        await assert.rejects(publish(db, a1, "rollback", true), /interrupted/);
        const check = await owner.query(`
          SELECT (SELECT count(*)::int FROM fixture_transaction_probe) AS probes,
                 (SELECT count(*)::int FROM outbox_events) AS events,
                 (SELECT version FROM fixture_branch WHERE id = $1) AS version
        `, [a1.branchId]);
        assert.deepEqual(check.rows, [{ probes: 0, events: 0, version: 1 }]);
        const id = await publish(db, a1, "first");
        assert.equal(await publish(db, a1, "first"), id);
        await assert.rejects(owner.query("UPDATE outbox_events SET payload = '{}' WHERE event_id = $1", [id]), {
          code: "23514",
        });
        const runtime = await startOutboxRuntime({
          database: db, prefix, queueConnection: connection, workerConnection: workerConnection(),
          relay: relayBinding, consumer: binding, limits, intervalMs: 25, workerOptions: options,
        });
        try {
          await completed(id);
        } finally {
          await runtime.close();
        }
        assert.deepEqual(await counts(owner, id), { receipt: 1, projection: 1 });
        assert.equal((await state(owner, id)).state, "COMPLETED");
        const [probe] = (await owner.query(`
          SELECT amount_minor::text, quantity::text FROM fixture_transaction_probe WHERE source_key = 'first'
        `)).rows;
        assert.deepEqual(probe, { amount_minor: "9007199254740993", quantity: "1.234567" });
        assert.equal(await branchDigest(owner, b1), emptyPeer);
      });

      await t.test("OUT-02 expired claim, ambiguous enqueue, lost job and late acknowledgement", async () => {
        const id = await publish(db, a1, "abandoned");
        const [claim] = await store.claim(1);
        assert.equal(claim.eventId, id);
        assert.equal(await queueState(queue, id), "missing");
        await until("expired lease", async () => await relay.dispatch() === 1);
        assert.equal(await queueState(queue, id), "waiting");
        assert.equal(await queue.removeIfIdle(deliveryId(id, 1)), true);
        await until("lost Redis job", async () => await relay.reconcile() === 1);
        await consume(async () => {
          await relay.dispatch();
          await completed(id);
        });
        assert.equal((await state(owner, id)).generation, 1);
        assert.deepEqual(await counts(owner, id), { receipt: 1, projection: 1 });

        const ambiguous = await publish(db, a1, "ambiguous");
        let sent = 0;
        const accepted = new OutboxRelay(store, {
          size: () => queue.size(), observe: (id) => queue.observe(id), removeIfIdle: (id) => queue.removeIfIdle(id),
          send: async (...args) => {
            await queue.send(...args);
            sent++;
            throw new Error("Synthetic connection lost after Redis accepted the job.");
          },
        }, relayBinding);
        await accepted.dispatch();
        assert.equal((await state(owner, ambiguous)).state, "LEASED");
        const original = (await job(ambiguous)).data;
        await until("ambiguous enqueue acknowledgment", async () => await accepted.dispatch() === 1);
        assert.equal(sent, 1);
        assert.equal((await state(owner, ambiguous)).state, "ENQUEUED");
        assert.deepEqual((await job(ambiguous)).data, original);
        await consume(() => completed(ambiguous));

        const late = await publish(db, a1, "late-ack");
        const slow = new OutboxRelay(store, {
          size: () => queue.size(), observe: (id) => queue.observe(id), removeIfIdle: (id) => queue.removeIfIdle(id),
          send: async (...args) => { await queue.send(...args); await settled(late); },
        }, relayBinding);
        await consume(async () => {
          await slow.dispatch();
          await completed(late);
        });
        assert.equal((await state(owner, late)).state, "COMPLETED");

        const expiring = await publish(db, a1, "proof-expiry");
        const shortProof = new OutboxRelay(new DeliveryStore(db, { ...limits, proofSeconds: 2 }), queue, relayBinding);
        await shortProof.dispatch();
        const firstDelivery = await job(expiring);
        const fail = deliveryProcessor(store, binding, async () => { throw new Error("Fault before commit"); });
        await assert.rejects(fail(firstDelivery.id, firstDelivery.data), /OUTBOX_TRANSIENT_FAILURE/);
        const firstProof = await state(owner, expiring);
        assert.equal(firstProof.attempts_used, 1);
        await until("expired proof", async () => Date.now() >= firstProof.proof_expires_at.getTime()
          && await relay.reconcile() === 1);
        await relay.dispatch();
        const renewed = await job(expiring);
        assert.notDeepEqual(renewed.data, firstDelivery.data);
        assert.equal(renewed.opts.attempts, limits.maxAttempts - 1);
        assert.equal((await state(owner, expiring)).generation, 1);
        await consume(() => completed(expiring));
        assert.equal((await state(owner, expiring)).attempts_used, 2);
      });

      await t.test("OUT-03 kill worker after PostgreSQL commit and redeliver through BullMQ", async () => {
        const id = await publish(db, a1, "worker-crash");
        await relay.dispatch();
        const child = fork(fileURLToPath(new URL("./crash-worker.mjs", import.meta.url)), [], {
          env: { ...process.env, M0106_TEST_DATABASE_URL: fixture.runtimeUrl, M0106_TEST_PREFIX: prefix,
            M0106_TEST_PROOF_KEY: keyBytes.toString("base64") },
          stdio: ["ignore", "ignore", "ignore", "ipc"],
        });
        const exit = once(child, "exit");
        try {
          const outcome = await Promise.race([
            once(child, "message").then(([message]) => message?.phase),
            exit.then(() => "EARLY_EXIT"),
            pause(12000, "TIMEOUT", { ref: false }),
          ]);
          assert.equal(outcome, "COMMITTED");
          assert.equal(await queueState(queue, id), "active");
          assert.deepEqual(await counts(owner, id), { receipt: 1, projection: 1 });
        } finally {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
          await exit;
        }
        await consume(() => completed(id));
        const redelivery = await job(id);
        assert.equal(redelivery.returnvalue, "DEDUPED");
        assert.ok(redelivery.attemptsStarted >= 2);
        const repeated = await Promise.all([
          processDelivery(redelivery.id, redelivery.data), processDelivery(redelivery.id, redelivery.data),
        ]);
        assert.deepEqual(repeated, ["DEDUPED", "DEDUPED"]);
        assert.deepEqual(await counts(owner, id), { receipt: 1, projection: 1 });
      });

      let failureId;
      let oldReference;
      await t.test("OUT-05 competing dispatchers, ordered streams, backoff and bounded attempts", async () => {
        const first = await publish(db, a1, "order-1");
        const second = await publish(db, a1, "order-2");
        const independent = await publish(db, b1, "independent");
        assert.equal((await Promise.all([relay.dispatch(), relay.dispatch()])).reduce((sum, n) => sum + n), 2);
        assert.equal((await state(owner, second)).state, "READY");
        assert.equal(await queueState(queue, independent), "waiting");
        await consume(async () => {
          await completed(first);
          await completed(independent);
          await relay.dispatch();
          await completed(second);
        });
        const [sequence] = (await owner.query(`
          SELECT first.applied_at <= last.applied_at AS ordered FROM fixture_outbox_projection first
            JOIN fixture_outbox_projection last ON last.event_id = $2 WHERE first.event_id = $1
        `, [first, second])).rows;
        assert.equal(sequence.ordered, true);

        const transient = await publish(db, b1, "transient");
        let tried = 0;
        await consume(async () => {
          await relay.dispatch();
          await completed(transient);
        }, async (...args) => {
          const effect = await projectProbe(...args);
          if (++tried === 1) throw new Error("Private synthetic precommit fault");
          return effect;
        });
        assert.equal(tried, 2);
        assert.equal((await state(owner, transient)).attempts_used, 2);
        assert.deepEqual(await counts(owner, transient), { receipt: 1, projection: 1 });

        failureId = await publish(db, b1, "exhausted");
        await consume(async () => {
          await relay.dispatch();
          await until("BullMQ exhaustion", async () => await queueState(queue, failureId) === "failed");
          const failed = await job(failureId);
          assert.equal(failed.failedReason, "OUTBOX_TRANSIENT_FAILURE");
          assert.equal(failed.attemptsMade, limits.maxAttempts);
          oldReference = failed.data;
        }, async (...args) => {
          await projectProbe(...args);
          throw new Error("Private synthetic retry exhaustion");
        });
        assert.deepEqual(await counts(owner, failureId), { receipt: 0, projection: 0 });
        await until("durable DLQ", async () => await relay.reconcile() === 1);
        assert.equal((await state(owner, failureId)).state, "DEAD_LETTER");
        assert.equal((await state(owner, failureId)).attempts_used, limits.maxAttempts);
        const blocked = await publish(db, b1, "after-dead-letter");
        assert.equal(await relay.dispatch(), 0);
        assert.equal((await state(owner, blocked)).state, "READY");
      });

      await t.test("OUT-04 forged scopes, unknown schema and malformed payload fail closed", async () => {
        const unknown = await putInvalidEvent(owner, a1, "fixture.probe_recorded", 9, { probeRef: randomUUID() });
        const malformed = await putInvalidEvent(owner, a1, "fixture.probe_recorded", 1, { injected: "payload-marker" });
        await relay.dispatch();
        const queued = await job(unknown);
        const before = await state(owner, unknown);
        assert.equal(await processDelivery(queued.id, { ...queued.data, tenantId: b1.tenantId }), "DENIED");
        assert.equal(await processDelivery(deliveryId(malformed, 1), queued.data), "DENIED");
        const otherBranch = deliveryProcessor(store, consumerBinding(db, key, {
          resolve: (service) => binding.resolve(service, b2),
        }));
        assert.equal(await otherBranch(queued.id, queued.data), "DENIED");
        assert.deepEqual(await state(owner, unknown), before);
        await consume(async () => { await completed(unknown); await completed(malformed); });
        for (const id of [unknown, malformed]) {
          assert.deepEqual(await counts(owner, id), { receipt: 0, projection: 0 });
          assert.equal((await state(owner, id)).state, "DEAD_LETTER");
          const entry = await operatorCommand(store, operator(db, a1), ["inspect", id]);
          assert.equal(entry.history[0].reason, "INVALID_EVENT");
          assert.doesNotMatch(JSON.stringify(entry), /payload-marker|proof_digest|signature/);
        }
        assert.equal(await branchDigest(owner), protectedSibling);
      });

      await t.test("OUT-06 redacted operator status and once-only authorized replay", async () => {
        const opsA = operator(db, a1);
        const opsB = operator(db, b1);
        assert.equal((await operatorCommand(store, operator(db, b2), ["status"])).status, "EMPTY");
        const status = await operatorCommand(store, opsB, ["status"]);
        assert.equal(status.counts.DEAD_LETTER, 1);
        let line;
        assert.equal(await runOperatorCli(store, opsA, ["inspect", failureId], (value) => { line = value; }), 2);
        assert.deepEqual(JSON.parse(line), { status: "NOT_FOUND" });
        assert.equal((await operatorCommand(store, opsA, ["inspect", failureId])).status, "NOT_FOUND");
        const replay = ["replay", failureId, "1", "FIX_APPLIED", "request-replay"];
        assert.equal((await operatorCommand(store, operator(db, b1, false), replay)).status, "DENIED");
        assert.equal((await operatorCommand(store, opsA, replay)).status, "NOT_FOUND");
        const original = (await owner.query("SELECT payload, correlation_id FROM outbox_events WHERE event_id=$1", [failureId])).rows[0];
        const replayed = await Promise.all([operatorCommand(store, opsB, replay), operatorCommand(store, opsB, replay)]);
        assert.ok(replayed.every((response) => response.status === "REPLAYED" && response.generation === 2));
        const history = await operatorCommand(store, opsB, ["inspect", failureId]);
        assert.deepEqual(history.history.map(({ kind, reason }) => [kind, reason]), [
          ["REPLAY", "FIX_APPLIED"], ["FAILURE", "CONSUMER_EXHAUSTED"],
        ]);
        assert.equal(await processDelivery(deliveryId(failureId, 1), oldReference), "DENIED");
        assert.equal((await state(owner, failureId)).attempts_used, 0);
        await consume(async () => {
          await relay.dispatch();
          await completed(failureId, 2);
        });
        assert.deepEqual(await counts(owner, failureId), { receipt: 1, projection: 1 });
        assert.deepEqual((await owner.query("SELECT payload, correlation_id FROM outbox_events WHERE event_id=$1", [failureId])).rows[0], original);
        assert.equal((await operatorCommand(store, opsB, ["replay", failureId, "2", "FIX_APPLIED", "new-request"])).status, "CONFLICT");
        assert.equal(await branchDigest(owner), protectedSibling);
        assert.ok(metrics.includes("applied") && metrics.includes("denied") && metrics.includes("dead_letter"));
      });
    } finally {
      await Promise.all([queue.close(), db.$disconnect(), owner.end()]);
    }
  }));
});
