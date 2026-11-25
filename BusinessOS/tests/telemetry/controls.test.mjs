import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath, URL } from "node:url";
import { activeTraceParent, createTelemetry, recordVerifiedScope } from "../../packages/telemetry/dist/index.js";

test("OBS-04 trace propagation is bounded and ignores malformed durable values", async () => {
  const samples = [];
  const api = createTelemetry("api", { write: (entry) => samples.push(entry), captureSuccess: true });
  const worker = createTelemetry("worker", { write: (entry) => samples.push(entry), captureSuccess: true });
  const scope = api.begin("http.request");
  const durable = scope.run(() => {
    recordVerifiedScope("test-private-tenant", "fixture-person@example.invalid");
    return activeTraceParent();
  });
  scope.end("ok", 201);
  await worker.observe("outbox.consume", async () => "APPLIED", durable);
  await worker.observe("outbox.consume", async () => "APPLIED", durable + "\n");
  assert.equal(samples[1].traceId, samples[0].traceId);
  assert.equal(samples[1].parentSpanId, samples[0].spanId);
  assert.notEqual(samples[2].traceId, samples[0].traceId);
  assert.ok(!JSON.stringify(samples).includes("fixture-person@example.invalid"));
  assert.ok(!JSON.stringify(samples).includes("test-private-tenant"));
  assert.equal(activeTraceParent(), null);
  assert.throws(() => worker.signal("SELECT * FROM accounts", "ok"), /Unknown telemetry operation/);
  for (let position = 0; position < 300; position++) worker.signal("outbox.consume", "ok");
  worker.queueSample("outbox", { depth: 12, ageMs: 180 });
  const snapshot = await worker.snapshot();
  assert.equal(snapshot.observations.length, 256);
  const operations = snapshot.metrics.find(({ descriptor }) => descriptor.name === "businessos.operations");
  assert.deepEqual(operations.dataPoints.map(({ attributes, value }) => ({ attributes, value })), [
    { attributes: { service: "worker", operation: "outbox.consume", outcome: "ok" }, value: 302 },
  ]);
  assert.equal(snapshot.metrics.find(({ descriptor }) => descriptor.name === "businessos.queue.depth").dataPoints[0].value, 12);
});

test("OBS-02 a faulty sink cannot affect a dependency operation or record its raw exception", async () => {
  const samples = [];
  const telemetry = createTelemetry("worker", { write: (entry) => {
    samples.push(entry);
    throw new Error("Fixture sink failure");
  } });
  const sensitive = new Error("fixture-db-password=user-secret");
  await assert.rejects(telemetry.observe("db.outbox_claim", async () => { throw sensitive; }), (error) => error === sensitive);
  assert.equal(await telemetry.observe("db.outbox_claim", async () => 7), 7);
  assert.equal(samples.length, 1);
  assert.equal(samples[0].alert.owner, "Data Recovery On-call");
  assert.ok(!JSON.stringify(await telemetry.snapshot()).includes(sensitive.message));
});

test("OBS-03 local report groups faults and reads only allowlisted trace fields", () => {
  const samples = [];
  const telemetry = createTelemetry("worker", { write: (entry) => samples.push(entry) });
  telemetry.signal("queue.files_stalled", "error");
  telemetry.signal("queue.files_failed", "error");
  const cli = fileURLToPath(new URL("../../scripts/telemetry/report.mjs", import.meta.url));
  const contents = samples.map((entry) => JSON.stringify({ ...entry, detail: "fixture-private", alert: { code: "untrusted-alert" } })).join("\n");
  const aggregate = execFileSync(process.execPath, [cli], { input: contents, encoding: "utf8" });
  assert.match(aggregate, /FILE_QUEUE_STALLED/);
  assert.match(aggregate, /FILE_JOB_FAILED/);
  assert.match(aggregate, /Platform On-call/);
  assert.doesNotMatch(aggregate, /fixture-private|untrusted-alert/);
  const trace = execFileSync(process.execPath, [cli, samples[0].traceId], { input: contents, encoding: "utf8" });
  assert.match(trace, /queue.files_stalled/);
  assert.doesNotMatch(trace, /queue.files_failed/);
});
