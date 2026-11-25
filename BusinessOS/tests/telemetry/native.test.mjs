import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createSecretKey, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createRequire } from "node:module";
import process from "node:process";
import { test } from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";
import { createApi } from "../../apps/api/dist/create-api.js";
import { AppModule } from "../../apps/api/dist/app.module.js";
import { RequireScope, requireExecutionContext } from "../../apps/api/dist/http/scoped.js";
import { workerTelemetry } from "../../apps/worker/dist/observability.js";
import {
  access, BullDeliveryQueue, DeliveryStore, OutboxRelay, bullConsumer, deliveryId, deliveryProcessor,
} from "../../apps/worker/dist/outbox/index.js";
import { generate, migrate, pool, verifySchema, withCluster, withDisposableServer } from "../../packages/database/fixtures/cluster.mjs";
import { createTelemetry } from "../../packages/telemetry/dist/index.js";
import {
  a1, b1, b2, branchDigest, consumerBinding, counts, dispatcher, limits, options,
  prismaRuntime, provision, publish, redisConnection, state, workerConnection,
} from "../outbox/fixture.mjs";

const require = createRequire(new URL("../../apps/api/package.json", import.meta.url));
const { Body, Controller, Module, Post, Req } = require("@nestjs/common");
const crashScript = fileURLToPath(new URL("../outbox/crash-worker.mjs", import.meta.url));
const requestToken = "fixture-private-credential";
const requester = "synthetic-private-actor";
const source = "synthetic-contact@example.invalid";
const wireTrace = "00-55555555555555555555555555555555-aaaaaaaaaaaaaaaa-01";

async function until(read, message) {
  for (let attempt = 0; attempt < 240; attempt++) {
    if (await read()) return;
    await wait(25);
  }
  assert.fail(message);
}

async function fixtureApi(db, telemetry) {
  class FixtureController {
    async publish(request, body) {
      const { auth } = requireExecutionContext(request);
      return { id: await publish(db, { tenantId: auth.tenantId, branchId: auth.scope.branchId }, body.source) };
    }
  }
  const method = Object.getOwnPropertyDescriptor(FixtureController.prototype, "publish");
  Req()(FixtureController.prototype, "publish", 0);
  Body()(FixtureController.prototype, "publish", 1);
  Post()(FixtureController.prototype, "publish", method);
  RequireScope(access.publish)(FixtureController.prototype, "publish", method);
  Controller("api/v1/telemetry-fixture")(FixtureController);
  class FixtureModule {}
  Module({ imports: [AppModule], controllers: [FixtureController] })(FixtureModule);
  const authority = async (principal) => ({
    principal, active: true, membershipId: "fixture-membership", revision: "1", tenantId: a1.tenantId,
    branch: { id: a1.branchId, tenantId: a1.tenantId, active: true },
    grants: [{ ...access.publish, scope: "BRANCH", branchId: a1.branchId }],
  });
  const app = await createApi(async (token) => token === requestToken
    ? { subject: requester, sessionId: "fixture-sensitive-session" } : undefined, FixtureModule, { resolve: authority }, telemetry);
  await app.listen(0, "127.0.0.1");
  return app;
}

test("M01.10 native PostgreSQL, HTTP and Redis telemetry", { timeout: 130_000 }, async (t) => {
  await withDisposableServer((url) => withCluster(url, async (version, createDatabase) => {
    const fixture = await createDatabase();
    await generate();
    await migrate(fixture);
    await verifySchema(fixture);
    const owner = pool(fixture.migrationUrl);
    await provision(owner, fixture);
    const db = await prismaRuntime(fixture.runtimeUrl);
    const prefix = "m0110-fixture-" + randomUUID();
    const keyBytes = randomBytes(32);
    const key = createSecretKey(keyBytes);
    const logs = [];
    const api = createTelemetry("api", { write: (entry) => logs.push(entry), captureSuccess: true });
    const telemetry = createTelemetry("worker", { write: (entry) => logs.push(entry), captureSuccess: true });
    const store = new DeliveryStore(db, limits, telemetry);
    const queue = new BullDeliveryQueue(redisConnection(), prefix, telemetry);
    const relay = new OutboxRelay(store, queue, { principal: dispatcher, authenticateService: async () => dispatcher,
      signingKey: async () => ({ id: "test-key", key }) });
    const binding = consumerBinding(db, key);
    const workerFor = (process) => bullConsumer(workerConnection(), prefix, process, options, undefined, telemetry);
    const app = await fixtureApi(db, api);
    const original = await branchDigest(owner, b2);
    const send = async (body, token = requestToken) => globalThis.fetch((await app.getUrl()) + "/api/v1/telemetry-fixture?untrusted=fixture-bank-reference", {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json",
        "X-Request-Id": "fixture-sensitive-header", traceparent: wireTrace }, body: JSON.stringify(body),
    });
    const redis = await queue.queue.client;
    t.diagnostic("PostgreSQL " + version + " and Redis " + /^redis_version:(.+)$/m.exec(await redis.info("server"))?.[1]?.trim());
    try {
      await t.test("OBS-01 authorized command trace, rejected scope override, replay and sibling isolation", async () => {
        assert.equal((await send({ source }, "invalid-private-token")).status, 401);
        assert.equal((await send({ source, branchId: b1.branchId })).status, 400);
        const created = await send({ source });
        assert.equal(created.status, 201);
        const { id } = await created.json();
        assert.deepEqual(await (await send({ source })).json(), { id });
        const current = (await owner.query("SELECT tenant_id, trace_parent FROM outbox_events WHERE event_id=$1", [id])).rows[0];
        assert.equal(current.tenant_id, a1.tenantId);
        const [, traceId, spanId] = current.trace_parent.split("-");
        assert.notEqual(traceId, wireTrace.split("-")[1]);
        const worker = workerFor(deliveryProcessor(store, binding));
        try {
          await worker.waitUntilReady();
          assert.equal(await relay.dispatch(), 1);
          await until(async () => (await state(owner, id)).state === "COMPLETED", "outbox delivery");
        } finally { await worker.close(); }
        assert.deepEqual(await counts(owner, id), { receipt: 1, projection: 1 });
        const writer = (await workerTelemetry.snapshot()).observations;
        const command = logs.find((entry) => entry.operation === "http.request" && entry.traceId === traceId);
        assert.ok(command?.tenantRef && command.actorRef);
        assert.ok(writer.some((entry) => entry.operation === "db.outbox_append" && entry.traceId === traceId
          && entry.spanId === spanId && entry.parentSpanId === command.spanId));
        assert.ok(logs.some((entry) => entry.operation === "outbox.dispatch" && entry.traceId === traceId && entry.parentSpanId === spanId));
        assert.ok(logs.some((entry) => entry.operation === "outbox.consume" && entry.traceId === traceId && entry.parentSpanId === spanId));
        assert.ok(logs.some((entry) => entry.operation === "db.outbox_apply" && entry.traceId === traceId));
      });

      await t.test("OBS-02 PostgreSQL failure and BullMQ failed job route without raw context", async () => {
        const id = await publish(db, a1, "fixture-failed-job");
        const worker = workerFor(deliveryProcessor(store, binding, async (tx) => {
          await tx.$queryRawUnsafe("SELECT secret FROM m0110_private_fixture_missing");
          assert.fail("expected the real SQL operation to fail");
        }));
        try {
          await worker.waitUntilReady();
          await relay.dispatch();
          await until(() => logs.some((entry) => entry.operation === "queue.outbox_failed"), "BullMQ failed event");
        } finally { await worker.close(); }
        assert.deepEqual(await counts(owner, id), { receipt: 0, projection: 0 });
        assert.ok(logs.some(({ alert }) => alert?.code === "DATABASE_OUTBOX_FAILED" && alert.owner === "Data Recovery On-call"));
        assert.ok(logs.some(({ alert }) => alert?.code === "OUTBOX_JOB_FAILED" && alert.owner === "Platform On-call"));
      });

      await t.test("OBS-03 stalled Redis delivery alerts and deduplicates a previously committed effect", async () => {
        const id = await publish(db, b1, "fixture-stalled-job");
        const child = fork(crashScript, [], { env: { ...process.env,
          M0106_TEST_DATABASE_URL: fixture.runtimeUrl, M0106_TEST_PREFIX: prefix, M0106_TEST_PROOF_KEY: keyBytes.toString("base64"),
        }, stdio: ["ignore", "ignore", "ignore", "ipc"] });
        try {
          const committed = once(child, "message", { signal: globalThis.AbortSignal.timeout(8000) });
          await relay.dispatch();
          assert.deepEqual((await committed)[0], { phase: "COMMITTED" });
        } finally {
          if (child.exitCode === null && child.signalCode === null) {
            const exited = once(child, "exit");
            child.kill();
            await exited;
          }
        }
        const worker = workerFor(deliveryProcessor(store, binding));
        try {
          await worker.waitUntilReady();
          await until(() => logs.some((entry) => entry.operation === "queue.outbox_stalled"), "BullMQ stalled event");
          await until(async () => (await (await queue.queue.getJob(deliveryId(id, 1)))?.getState()) === "completed", "redelivery");
        } finally { await worker.close(); }
        assert.deepEqual(await counts(owner, id), { receipt: 1, projection: 1 });
        assert.ok(logs.some(({ alert }) => alert?.code === "OUTBOX_QUEUE_STALLED" && alert.owner === "Platform On-call"));
      });
      const collected = await telemetry.snapshot();
      const labels = collected.metrics.find(({ descriptor }) => descriptor.name === "businessos.operations").dataPoints;
      assert.ok(labels.some(({ value, attributes }) => value > 0 && attributes.outcome === "error" && attributes.operation === "db.outbox_apply"));
      assert.ok(labels.some(({ attributes }) => attributes.outcome === "error" && attributes.operation === "queue.outbox_stalled"));
      assert.deepEqual(await branchDigest(owner, b2), original);
      const raw = JSON.stringify({ logs, collected });
      for (const privateValue of [source, requestToken, requester, "fixture-sensitive-header", "m0110_private_fixture_missing",
        "fixture-sensitive-session", "fixture-bank-reference", a1.tenantId, a1.branchId, b1.branchId]) {
        assert.equal(raw.includes(privateValue), false);
      }
    } finally {
      await app.close();
      await queue.close();
      await db.$disconnect();
      await owner.end();
    }
  }));
});
