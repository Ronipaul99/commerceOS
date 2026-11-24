import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createApi } from "../../apps/api/dist/create-api.js";
import { AppModule } from "../../apps/api/dist/app.module.js";
import {
  StringFieldsPipe, RequireIdempotency, commandFingerprint, requireCurrentVersion,
  requireMatchingFingerprint, versionTag,
} from "../../apps/api/dist/http/contract.js";
import { ApiError, BusinessOSApiClient } from "../../packages/api-client/src/index.ts";
import { checkCompatibility } from "../../scripts/contracts/generate.mjs";

const schema = JSON.parse(readFileSync(new URL("../../packages/api-contracts/openapi.json", import.meta.url), "utf8"));
const require = createRequire(new URL("../../apps/api/package.json", import.meta.url));
const { Body, Controller, Module, Post, Req, Res } = require("@nestjs/common");

const subjects = new Map([
  ["test-a", { subject: "fictional-a", memberships: [
    { id: "membership-a2", tenantId: "tenant-a2", internalField: "private" },
    { id: "membership-a1", tenantId: "tenant-a1" },
  ] }],
  ["test-b", { subject: "fictional-b", memberships: [{ id: "membership-b1", tenantId: "tenant-b1" }] }],
]);
const verify = async (token) => {
  if (token === "test-down") throw new Error("private");
  if (token === "test-timeout") return new Promise(() => {});
  return subjects.get(token);
};

async function open(t, ...args) {
  const app = await createApi(...args);
  t.after(() => app.close());
  await app.listen(0, "127.0.0.1");
  return app.getUrl();
}

function dereference(value) {
  return value.$ref ? value.$ref.slice(2).split("/").reduce((item, key) => item[key], schema) : value;
}

function validate(input, definition) {
  const shape = dereference(definition);
  const kind = input === null ? "null" : Array.isArray(input) ? "array" : typeof input;
  assert.ok([shape.type].flat().includes(kind), JSON.stringify(shape));
  if (kind === "array") input.forEach((item) => validate(item, shape.items));
  if (kind === "object") {
    for (const field of shape.required ?? []) assert.ok(Object.hasOwn(input, field), field);
    for (const [field, value] of Object.entries(input)) {
      if (shape.properties?.[field]) validate(value, shape.properties[field]);
      else assert.notEqual(shape.additionalProperties, false, field);
    }
  }
}

async function contractResponse(response, path, expected) {
  assert.equal(response.status, expected);
  const responses = schema.paths[path].get.responses;
  const shape = dereference(responses[expected] ?? responses.default);
  const pattern = dereference(shape.headers["X-Request-Id"]).schema.pattern;
  const requestId = response.headers.get("x-request-id");
  assert.match(requestId, new RegExp(pattern));
  const data = await response.json();
  validate(data, shape.content["application/json"].schema);
  if (expected >= 400) assert.equal(data.requestId, requestId);
  return data;
}

test("normal bootstrap fails closed and keeps existing identity and health", async (t) => {
  const base = await open(t);
  assert.deepEqual(await (await fetch(base + "/")).json(), { service: "businessos-api" });
  assert.deepEqual(await (await fetch(base + "/health")).json(), { status: "ok" });
  const response = await fetch(base + "/api/v1/me", { headers: { Authorization: "Bearer test-a" } });
  assert.equal((await contractResponse(response, "/api/v1/me", 401)).code, "UNAUTHENTICATED");
  const caseVariant = await fetch(base + "/API/V1/ME");
  assert.equal((await contractResponse(caseVariant, "/api/v1/me", 401)).code, "UNAUTHENTICATED");
});

test("generated typed client, scope-bound cursors and stable errors", async (t) => {
  const base = await open(t, verify);
  const clientA = new BusinessOSApiClient(base, () => "test-a", async (url, options) => {
    const answer = await fetch(url, options);
    assert.equal(answer.headers.get("x-request-id"), "test-request");
    await contractResponse(answer.clone(), new URL(url).pathname, answer.status);
    return answer;
  });
  const options = { requestId: "test-request" };
  assert.deepEqual(await clientA.getMe(options), { id: "fictional-a" });
  const first = await clientA.listMemberships({ limit: 1 }, options);
  assert.deepEqual(first.items, [{ id: "membership-a1", tenantId: "tenant-a1" }]);
  const second = await clientA.listMemberships({ limit: 1, cursor: first.nextCursor }, options);
  assert.deepEqual(second, { items: [{ id: "membership-a2", tenantId: "tenant-a2" }], nextCursor: null });
  const clientB = new BusinessOSApiClient(base, () => "test-b");
  assert.deepEqual((await clientB.listMemberships()).items, [{ id: "membership-b1", tenantId: "tenant-b1" }]);
  await assert.rejects(
    clientB.listMemberships({ cursor: first.nextCursor }),
    (error) => error instanceof ApiError && error.status === 400 && error.envelope.code === "INVALID_CURSOR",
  );

  for (const query of ["limit=101", "limit=1&limit=2", "tenantId=tenant-b1", "cursor=%E2%98%83"]) {
    const path = "/api/v1/me/memberships";
    const result = await fetch(base + path + "?" + query, { headers: { Authorization: "Bearer test-a", "X-Request-Id": "not allowed" } });
    const error = await contractResponse(result, path, 400);
    assert.equal(error.code, "VALIDATION_FAILED");
    assert.notEqual(error.requestId, "not allowed");
  }
  const unavailable = await fetch(base + "/api/v1/me", { headers: { Authorization: "Bearer test-down" } });
  assert.equal((await contractResponse(unavailable, "/api/v1/me", 503)).code, "UNAVAILABLE");
  const stalled = await fetch(base + "/api/v1/me", { headers: { Authorization: "Bearer test-timeout" } });
  assert.equal((await contractResponse(stalled, "/api/v1/me", 503)).code, "UNAVAILABLE");
  const missing = await fetch(base + "/api/v1/unknown");
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).code, "NOT_FOUND");
});

test("test-only command exercises validation, idempotency header, replay and version conflict", async (t) => {
  // This process-local store and route exist only in the test module.
  const state = new Map();
  const attempts = new Map();
  class FixtureController {
    update(request, fields, response) {
      const scope = request.principal.subject;
      const version = state.get(scope) ?? 1;
      const idempotency = JSON.stringify([scope, request.idempotencyKey]);
      const match = request.headers["if-match"];
      const fingerprint = commandFingerprint(fields, match);
      const previous = attempts.get(idempotency);
      if (previous) {
        requireMatchingFingerprint(previous.fingerprint, fingerprint);
        response.setHeader("ETag", versionTag(previous.version));
        return { version: previous.version };
      }
      requireCurrentVersion(match, version);
      const next = version + 1;
      state.set(scope, next);
      attempts.set(idempotency, { fingerprint, version: next });
      response.setHeader("ETag", versionTag(next));
      return { version: next };
    }
  }
  const method = Object.getOwnPropertyDescriptor(FixtureController.prototype, "update");
  Controller("api/v1/contract-test")(FixtureController);
  Post()(FixtureController.prototype, "update", method);
  RequireIdempotency()(FixtureController.prototype, "update", method);
  Req()(FixtureController.prototype, "update", 0);
  Body(new StringFieldsPipe({ label: /^[a-z]{1,12}$/ }))(FixtureController.prototype, "update", 1);
  Res({ passthrough: true })(FixtureController.prototype, "update", 2);
  class FixtureModule {}
  Module({ imports: [AppModule], controllers: [FixtureController] })(FixtureModule);
  const base = await open(t, verify, FixtureModule);
  const request = (body, options = {}) => fetch(base + "/api/v1/contract-test", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-a", "Content-Type": "application/json",
      "If-Match": '"1"', "Idempotency-Key": "key-1", ...options,
    },
    body,
  });
  async function denial(response, status, code) {
    assert.equal(response.status, status);
    const data = await response.json();
    validate(data, schema.components.schemas.ErrorEnvelope);
    assert.equal(data.code, code);
    assert.equal(data.requestId, response.headers.get("x-request-id"));
  }
  await denial(await request("{"), 400, "BAD_REQUEST");
  await denial(await request(JSON.stringify({ label: "sale", tenantId: "tenant-b1" })), 400, "VALIDATION_FAILED");
  await denial(await request(JSON.stringify({ label: 1 })), 400, "VALIDATION_FAILED");
  await denial(await request('{"label":"sale"}', { "Idempotency-Key": "" }), 400, "IDEMPOTENCY_KEY_REQUIRED");
  await denial(await request('{"label":"sale"}', { "Content-Type": "text/plain" }), 415, "UNSUPPORTED_MEDIA_TYPE");
  await denial(await request(JSON.stringify({ label: "x".repeat(65537) })), 413, "PAYLOAD_TOO_LARGE");
  assert.equal(state.size, 0);
  for (const response of await Promise.all([request('{"label":"sale"}'), request('{"label":"sale"}')])) {
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("etag"), '"2"');
    assert.deepEqual(await response.json(), { version: 2 });
  }
  assert.equal(state.get("fictional-a"), 2);
  await denial(await request('{"label":"changed"}'), 409, "IDEMPOTENCY_KEY_REUSE");
  await denial(await request('{"label":"sale"}', { "Idempotency-Key": "new-key" }), 409, "VERSION_CONFLICT");
  const other = await request('{"label":"sale"}', { Authorization: "Bearer test-b" });
  assert.equal(other.status, 201);
  assert.deepEqual([...state], [["fictional-a", 2], ["fictional-b", 2]]);
});

test("generation is reproducible and compatibility check rejects published surface changes", () => {
  execFileSync(process.execPath, ["scripts/contracts/generate.mjs", "--check"]);
  const removed = structuredClone(schema);
  delete removed.paths["/api/v1/me"];
  assert.throws(() => checkCompatibility(schema, removed), /Published operation changed/);
  const changed = structuredClone(schema);
  changed.components.schemas.Me.properties.id.type = "integer";
  assert.throws(() => checkCompatibility(schema, changed), /Published component changed/);
  const unsecured = structuredClone(schema);
  unsecured.security = [];
  assert.throws(() => checkCompatibility(schema, unsecured), /authorization policy changed/);
  const additive = structuredClone(schema);
  additive.paths["/api/v1/other"] = additive.paths["/api/v1/me"];
  assert.doesNotThrow(() => checkCompatibility(schema, additive));
});
