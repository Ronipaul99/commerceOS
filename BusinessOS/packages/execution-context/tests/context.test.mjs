import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createSecretKey } from "node:crypto";
import { test } from "@jest/globals";
import {
  authorizeHttp, authorizeWrite, createJobConsumer, scopeFor, signJobReference,
} from "../dist/index.js";

const actor = Object.freeze({ kind: "human", id: "actor-a", identityRef: "session-a" });
const executor = Object.freeze({ kind: "service", id: "service-a", identityRef: "binding-a" });
const read = Object.freeze({ resource: "fixture", action: "read", ownership: "branch" });
const update = { ...read, action: "update" };
const branch = Object.freeze({ tenantId: "tenant-a", id: "branch-a1", active: true });
const grant = { ...read, scope: "BRANCH", branchId: branch.id };
const snapshot = (fields = {}) => ({
  principal: actor, tenantId: branch.tenantId, membershipId: "membership-a", active: true,
  branch, ownerId: "employee-a", revision: "1", grants: [grant], ...fields,
});
const resolve = (fields) => async () => snapshot(fields);

test("CTX-04 contexts are immutable and tied to the authorized operation", async () => {
  const context = await authorizeHttp(actor, read, resolve());
  assert.deepEqual(scopeFor(context, read), { tenantId: "tenant-a", branchId: "branch-a1" });
  for (const value of [context, context.auth, context.auth.principal, context.auth.access, context.auth.scope, context.origin]) {
    assert.ok(Object.isFrozen(value));
  }
  for (const forged of [undefined, { kind: "platform", operatorId: "support-a" }, { ...context }, globalThis.structuredClone(context)]) {
    assert.throws(() => scopeFor(forged, read), { code: "FORBIDDEN" });
  }
  assert.throws(() => scopeFor(context, update), { code: "FORBIDDEN" });
  await assert.rejects(authorizeHttp(executor, read, resolve()), { code: "UNAUTHENTICATED" });
  await assert.rejects(authorizeHttp(actor, read, resolve({ principal: { ...actor, identityRef: "wrong-session" } })), {
    code: "FORBIDDEN",
  });
});

test("CTX-04 resource, action and scope come from one matching grant", async () => {
  const branchB = { ...branch, id: "branch-a2" };
  await assert.rejects(authorizeHttp(actor, read, resolve({
    branch: branchB, grants: [grant, { ...grant, branchId: branchB.id, action: "update" }],
  })), { code: "FORBIDDEN" });
  for (const invalid of [{ ...branch, active: false }, { ...branch, tenantId: "tenant-b" }, undefined]) {
    await assert.rejects(authorizeHttp(actor, read, resolve({
      branch: invalid, grants: [{ ...read, scope: "TENANT" }],
    })), { code: "FORBIDDEN" });
  }
  const tenant = { ...read, ownership: "tenant" };
  await assert.rejects(authorizeHttp(actor, tenant, resolve()), { code: "FORBIDDEN" });
  const authorized = await authorizeHttp(actor, tenant, resolve({ grants: [{ ...read, scope: "TENANT" }] }));
  assert.deepEqual(scopeFor(authorized, tenant), { tenantId: "tenant-a" });
  const adminAtBranch = await authorizeHttp(actor, read, resolve({ grants: [{ ...read, scope: "TENANT" }] }));
  assert.deepEqual(scopeFor(adminAtBranch, read), { tenantId: "tenant-a", branchId: "branch-a1" });
});

test("CTX-04 SELF scope carries the authoritative employee link and optional branch", async () => {
  const self = { ...read, scope: "SELF", branchId: branch.id };
  const own = await authorizeHttp(actor, read, resolve({ grants: [self] }));
  assert.deepEqual(scopeFor(own, read), { tenantId: "tenant-a", branchId: "branch-a1", ownerId: "employee-a" });
  await assert.rejects(authorizeHttp(actor, read, resolve({ grants: [self], ownerId: undefined })), {
    code: "FORBIDDEN",
  });
  const tenantOwned = { ...read, ownership: "tenant" };
  const tenantSelf = await authorizeHttp(actor, tenantOwned, resolve({ grants: [{ ...self, branchId: undefined }] }));
  assert.deepEqual(scopeFor(tenantSelf, tenantOwned), { tenantId: "tenant-a", ownerId: "employee-a" });
});

test("CTX-04 a write locks and rechecks authority in the same transaction", async () => {
  const fields = { grants: [{ ...grant, action: "update" }] };
  const context = await authorizeHttp(actor, update, resolve(fields));
  const tx = Object.freeze({});
  let mutations = 0;
  const write = async (actual, where) => {
    assert.equal(actual, tx);
    assert.deepEqual(where, { tenantId: "tenant-a", branchId: "branch-a1" });
    return ++mutations;
  };
  for (const state of [{ revision: "2" }, { active: false }, { membershipId: "replacement" }, { grants: [] }]) {
    await assert.rejects(authorizeWrite(tx, context, update, async (actual, auth) => {
      assert.equal(actual, tx);
      assert.equal(auth, context.auth);
      return snapshot({ ...fields, ...state });
    }, write), { code: "FORBIDDEN" });
  }
  assert.equal(mutations, 0);
  assert.equal(await authorizeWrite(tx, context, update, async () => snapshot(fields), write), 1);
});

const now = 1720000000;
const routing = { issuer: "owner", audience: "worker", queue: "fixture", operation: "effect" };
const identity = { ...routing, jobId: "job-a", correlationId: "correlation-a" };
const key = createSecretKey(Buffer.alloc(32, 7));
const oldKey = createSecretKey(Buffer.alloc(32, 13));
const claims = { ...identity, keyId: "key-v2", version: 1, issuedAt: now - 1, expiresAt: now + 10 };
const store = { identity, principal: actor, selection: { tenantId: branch.tenantId, branchId: branch.id }, input: "valid" };

function binding(fields = {}) {
  return {
    route: routing, access: update, executor, allowDelegation: true,
    authenticateService: async () => executor,
    keyFor: async (id) => id === "key-v2" ? key : undefined,
    loadJob: async (id) => id === store.identity.jobId ? store : undefined,
    resolve: resolve({ grants: [{ ...grant, action: "update" }] }),
    nowSeconds: () => now,
    ...fields,
  };
}

test("CTX-03 authenticated service binding and stored job scope are required every time", async () => {
  const signed = signJobReference(claims, key);
  let effects = 0;
  const denied = [
    { authenticateService: async () => ({ ...executor, identityRef: "other" }) },
    { allowDelegation: false },
    { loadJob: async () => ({ ...store, identity: { ...identity, correlationId: "changed" } }) },
    { loadJob: async () => ({ ...store, selection: { ...store.selection, branchId: "other" } }) },
    { loadJob: async () => undefined },
    { resolve: resolve({ active: false }) },
  ];
  for (const change of denied) {
    const receive = createJobConsumer(binding(change), async () => ++effects);
    await assert.rejects(receive(signed), { code: Object.hasOwn(change, "authenticateService") ? "UNAUTHENTICATED" : "FORBIDDEN" });
  }
  assert.equal(effects, 0);

  const service = createJobConsumer(binding({
    allowDelegation: false,
    loadJob: async () => ({ ...store, principal: executor }),
    resolve: resolve({ principal: executor, membershipId: undefined, grants: [{ ...grant, action: "update" }] }),
  }), async (context) => context.auth.principal.kind);
  assert.equal(await service(signed), "service");
});

test("CTX-03 worker context cannot be reused after the handler exits", async () => {
  let captured;
  const signed = signJobReference(claims, key);
  const consume = createJobConsumer(binding(), async (context) => {
    captured = context;
    assert.equal(scopeFor(context, update).branchId, branch.id);
    return true;
  });
  assert.equal(await consume(signed), true);
  assert.throws(() => scopeFor(captured, update), { code: "FORBIDDEN" });
});

test("CTX-03 invalid proofs are rejected before job lookup and rotation drops the retired key", async () => {
  let lookups = 0;
  let rotation = true;
  const receive = createJobConsumer(binding({
    keyFor: async (id) => id === "key-v2" ? key : rotation && id === "key-v1" ? oldKey : undefined,
    loadJob: async () => { lookups++; return store; },
  }), async (_context, input) => input);
  const signed = signJobReference(claims, key);
  for (const delivery of [
    { ...signed, tenantId: "tenant-b" }, { ...signed, principal: actor }, { ...signed, jobId: "new" },
    { ...signed, signature: "A".repeat(43) },
    signJobReference({ ...claims, expiresAt: now }, key),
    signJobReference({ ...claims, issuedAt: now + 1 }, key),
    signJobReference({ ...claims, queue: "different" }, key),
  ]) await assert.rejects(receive(delivery), { code: "INVALID_PROOF" });
  assert.equal(lookups, 0);
  assert.throws(() => signJobReference(claims, createSecretKey(Buffer.alloc(16))), { code: "INVALID_PROOF" });
  const first = signJobReference({ ...claims, keyId: "key-v1" }, oldKey);
  assert.equal(await receive(first), "valid");
  rotation = false;
  await assert.rejects(receive(first), { code: "INVALID_PROOF" });
  assert.equal(await receive(signed), "valid");
  assert.equal(lookups, 2);
});

test("CTX-06 audit metadata preserves causal and execution IDs and redacts untrusted input", async () => {
  const audit = [];
  const context = await authorizeHttp(actor, read, resolve(), (entry) => { audit.push(entry); });
  const forwarded = { ...identity, correlationId: context.origin.correlationId };
  const receive = createJobConsumer(binding({
    loadJob: async () => ({ ...store, identity: forwarded }),
    audit: (entry) => { audit.push(entry); },
  }), async (jobContext) => jobContext.origin);
  const signed = signJobReference({ ...claims, ...forwarded }, key);
  const [one, two] = await Promise.all([receive(signed), receive(signed)]);
  assert.notEqual(one.attemptId, two.attemptId);
  assert.equal(one.correlationId, context.origin.correlationId);
  await assert.rejects(receive({ ...signed, tenantId: "rejected-payload" }), { code: "INVALID_PROOF" });
  await assert.rejects(authorizeHttp(actor, read, async () => { throw new Error("private-source-error"); }, (entry) => {
    audit.push(entry);
  }), { code: "UNAVAILABLE", message: "Execution context denied." });
  assert.equal(audit.length, 5);
  assert.equal(audit[1].executorId, executor.id);
  assert.equal(audit[1].actorId, actor.id);
  assert.equal(audit[3].tenantId, undefined);
  assert.doesNotMatch(JSON.stringify(audit), /session-a|binding-a|rejected-payload|private-source-error|signature/);
});
