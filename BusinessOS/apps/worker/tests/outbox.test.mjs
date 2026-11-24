import assert from "node:assert/strict";
import { createSecretKey, randomUUID } from "node:crypto";
import { test } from "@jest/globals";
import {
  consumer, defaultLimits, deliveryId, deliveryIdentity, probePayload, referenceDigest, validateLimits, validatePayload,
} from "../dist/outbox/contract.js";
import { OutboxRelay } from "../dist/outbox/relay.js";
import { operatorCommand } from "../dist/outbox/operator.js";

test("OUT-04 validates the versioned fixture envelope and opaque payload", () => {
  const branch = randomUUID();
  const payload = { probeRef: randomUUID() };
  const row = {
    eventId: randomUUID(), tenantId: randomUUID(), branchId: branch, eventType: "fixture.probe_recorded",
    schemaVersion: 1, aggregateType: "fixture.branch", aggregateId: branch, aggregateVersion: 1,
    occurredAt: new Date(), correlationId: randomUUID(), causationId: randomUUID(), consumer, payload,
  };
  assert.deepEqual(probePayload(row), payload);
  for (const variation of [{ schemaVersion: 3 }, { aggregateVersion: -1 }, { branchId: randomUUID() },
    { correlationId: "abc" }, { payload: { ...payload, tenantId: branch } }, { payload: { probeRef: "arbitrary" } }]) {
    assert.equal(probePayload({ ...row, ...variation }), undefined);
  }
  assert.equal(validatePayload({ probeRef: payload.probeRef + "\n" }), undefined);
});

test("OUT-04 queue identity and stored digest reject changed routing or extra fields", () => {
  const eventId = randomUUID();
  const id = deliveryId(eventId, 1);
  assert.deepEqual(deliveryIdentity(id), { eventId, generation: 1 });
  for (const wrong of [id + "-1", id.replace(/1$/, "01"), id.replace(/1$/, "0"), "opaque"]) {
    assert.equal(deliveryIdentity(wrong), undefined);
  }
  const ref = { version: 1, keyId: "k", issuer: "i", audience: "a", queue: "q", operation: "op",
    jobId: id, correlationId: randomUUID(), issuedAt: 1, expiresAt: 2, signature: "mock" };
  assert.equal(referenceDigest(ref), referenceDigest(Object.fromEntries(Object.entries(ref).reverse())));
  assert.notEqual(referenceDigest(ref), referenceDigest({ ...ref, jobId: "different" }));
  assert.equal(referenceDigest({ ...ref, branchId: eventId }), undefined);
});

test("OUT-05 bounds attempts, claim batches and proof life against retry schedule", () => {
  assert.ok(Object.isFrozen(validateLimits(defaultLimits)));
  for (const change of [{ reconcileMs: undefined }, { batchSize: 65 }, { tenantCapacity: 64 }, { maxAttempts: 11 },
    { maxDispatchAttempts: 11 }, { proofSeconds: 301 }, { proofSeconds: 1 }, { backoffMs: 0 }]) {
    assert.throws(() => validateLimits({ ...defaultLimits, ...change }), /Invalid outbox delivery limits/);
  }
});

test("OUT-05 relay denies wrong infrastructure identity and pauses at queue capacity", async () => {
  const principal = { kind: "service", id: "relay", identityRef: "worker-credential" };
  const store = { limits: defaultLimits, claim: async () => assert.fail("must not claim") };
  const queue = { size: async () => defaultLimits.queueCapacity };
  const signingKey = async () => assert.fail("must not sign");
  const denied = new OutboxRelay(store, queue, {
    principal, authenticateService: async () => ({ ...principal, identityRef: "untrusted" }), signingKey,
  });
  await assert.rejects(denied.dispatch(), /authority is unavailable/);
  const authorized = new OutboxRelay(store, queue, { principal, authenticateService: async () => principal, signingKey });
  assert.equal(await authorized.dispatch(), 0);
});

test("OUT-02 observed lease with matching proof is acknowledged without adding a second Redis job", async () => {
  const eventId = randomUUID();
  const principal = { kind: "service", id: "relay", identityRef: "configured" };
  const reference = { version: 1, keyId: "k", issuer: "i", audience: "a", queue: "q", operation: "op",
    jobId: deliveryId(eventId, 1), correlationId: eventId, issuedAt: 10, expiresAt: 20, signature: "placeholder" };
  const row = { eventId, generation: 1, proofDigest: referenceDigest(reference) };
  const actions = [];
  const store = {
    limits: defaultLimits, claim: async () => [row],
    acknowledge: async (seen) => { actions.push(seen.eventId); },
  };
  const queue = {
    size: async () => 1,
    observe: async (id) => { assert.equal(id, reference.jobId); return { state: "waiting", reference }; },
    send: async () => assert.fail("must not enqueue twice"),
  };
  const relay = new OutboxRelay(store, queue, {
    principal, authenticateService: async () => principal, signingKey: async () => createSecretKey("placeholder"),
  });
  assert.equal(await relay.dispatch(), 1);
  assert.deepEqual(actions, [eventId]);
});

test("OUT-06 operator input rejects unofficial reasons, invalid commands and unauthenticated scope", async () => {
  const store = { database: { $transaction: async () => assert.fail("must not open a transaction") }};
  const op = { authorize: async () => ({ kind: "platform" }) };
  assert.deepEqual(await operatorCommand(store, op, ["replay", randomUUID(), "1", "arbitrary", "key"]), { status: "INVALID_INPUT" });
  assert.deepEqual(await operatorCommand(store, op, ["replay", randomUUID(), "1", "FIX_APPLIED", "path/selector"]), { status: "INVALID_INPUT" });
  assert.deepEqual(await operatorCommand(store, op, ["status", "tenant-b"]), { status: "INVALID_INPUT" });
  assert.deepEqual(await operatorCommand(store, op, ["status"]), { status: "DENIED" });
});
