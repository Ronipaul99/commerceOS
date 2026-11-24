import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "@jest/globals";
import { loadSecurityConfig } from "../../dist/security/config.js";
import { initializeProtectedSecurity } from "../../dist/security/protected.js";
import { reportSecurity } from "../../dist/security/policy.js";
import { serializeSessionCookie } from "../../dist/security/http.js";
import {
  createFixtures, currentRef, environment, makeKey, now, origin, previousRef,
} from "../../../../tests/security/fixtures.mjs";

test("AUTH-02 environment validates complete enablement and refuses unsafe values", () => {
  assert.deepEqual(loadSecurityConfig({ NODE_ENV: "test" }), { mode: "shell" });
  assert.ok(Object.isFrozen(loadSecurityConfig(environment())));
  for (const entry of [
    { BUSINESSOS_AUTH_MODE: undefined }, { BUSINESSOS_AUTH_MODE: "shell" },
    { BUSINESSOS_AUTH_CURRENT_REF: "https://secret.invalid/value" },
    { BUSINESSOS_AUTH_CURRENT_REF: "fixtures/../current" }, { BUSINESSOS_AUTH_PRIVATE_KEY: "unexpected" },
    { BUSINESSOS_AUTH_ISSUER: "https://user:password@issuer.invalid" },
    { BUSINESSOS_AUTH_ISSUER: "http://issuer.invalid" },
    { BUSINESSOS_AUTH_AUDIENCE: "tenant\n" }, { BUSINESSOS_AUTH_VERIFY_MS: "2001" },
    { BUSINESSOS_AUTH_MAX_TOKEN_SECONDS: "3601" }, { BUSINESSOS_AUTH_PREVIOUS_REF: previousRef },
    { BUSINESSOS_AUTH_PREVIOUS_REF: previousRef, BUSINESSOS_AUTH_PREVIOUS_UNTIL: String(now() + 601) },
    { BUSINESSOS_AUTH_PREVIOUS_REF: currentRef, BUSINESSOS_AUTH_PREVIOUS_UNTIL: String(now() + 60) },
    { BUSINESSOS_AUTH_TRANSPORT: "bearer-with-cookie" }, { BUSINESSOS_AUTH_BROWSER_ORIGINS: "*" },
    { BUSINESSOS_AUTH_TRANSPORT: "bearer-with-cookie", BUSINESSOS_AUTH_BROWSER_ORIGINS: origin + "/page" },
    { BUSINESSOS_AUTH_TRUSTED_PROXIES: "127.0.0.0/8" }, { NODE_ENV: "production" },
  ]) assert.throws(() => loadSecurityConfig(environment(entry)), { reason: "CONFIG_INVALID" });
});

test("AUTH-04 expired overlap cannot load or use the previous key", async () => {
  const f = createFixtures();
  const security = await initializeProtectedSecurity(environment({
    BUSINESSOS_AUTH_PREVIOUS_REF: previousRef, BUSINESSOS_AUTH_PREVIOUS_UNTIL: String(now() - 1),
  }), f.deps);
  assert.equal(f.resolution.length, 1);
  await assert.rejects(security.authenticate(f.credential("a", "bearer", f.previous), "bearer"),
    { reason: "CREDENTIAL_DENIED" });
});

test("AUTH-04 a bad refresh cannot replace existing bytes under the same key version", async () => {
  const f = createFixtures();
  const security = await initializeProtectedSecurity(environment(), f.deps);
  const signed = f.credential("a");
  const substitute = makeKey(f.old.version);
  f.slots.set(currentRef, substitute);
  await assert.rejects(security.refresh(), { reason: "SECRET_INVALID" });
  assert.equal((await security.authenticate(signed, "bearer")).principal.subject, "fictional-a");
  await assert.rejects(security.authenticate(f.credential("a", "bearer", substitute), "bearer"),
    { reason: "CREDENTIAL_DENIED" });
});

test("AUTH-04 rechecks key revocation before admitting an already verified request", async () => {
  const f = createFixtures();
  const env = environment({ BUSINESSOS_AUTH_PREVIOUS_REF: previousRef, BUSINESSOS_AUTH_PREVIOUS_UNTIL: String(now() + 60) });
  const security = await initializeProtectedSecurity(env, {
    ...f.deps, memberships: async (subject) => {
      f.revokedKeys.add(f.old.version);
      return f.deps.memberships(subject);
    },
  });
  await assert.rejects(security.authenticate(f.credential("a"), "bearer"), { reason: "CREDENTIAL_DENIED" });
});

test("AUTH-04 known revocation of every key denies admission before the adapter", async () => {
  const f = createFixtures();
  const security = await initializeProtectedSecurity(environment(), {
    ...f.deps, provider: { verify: async () => assert.fail("no authorized version") },
  });
  f.revokedKeys.add(f.old.version);
  await assert.rejects(security.authenticate(f.credential("a"), "bearer"), { reason: "CREDENTIAL_DENIED" });
});

test("AUTH-03 both the credential and the active session must meet elevated assurance", async () => {
  const f = createFixtures();
  const security = await initializeProtectedSecurity(environment({ BUSINESSOS_AUTH_MIN_ASSURANCE: "elevated" }), f.deps);
  await assert.rejects(security.authenticate(f.credential("a"), "bearer"), { reason: "CREDENTIAL_DENIED" });
  const signed = f.credential("a", "bearer", f.old, { assurance: "elevated" });
  await assert.rejects(security.authenticate(signed, "bearer"), { reason: "SESSION_DENIED" });
  const session = f.sessions.get("session-a-bearer");
  f.sessions.set("session-a-bearer", { ...session, assurance: "elevated" });
  assert.equal((await security.authenticate(signed, "bearer")).principal.subject, "fictional-a");
});

test("AUTH-01 isolates adapter key material and projects only trusted metadata", async () => {
  const f = createFixtures();
  const security = await initializeProtectedSecurity(environment(), {
    ...f.deps, provider: { async verify(input, signal) {
      const result = await f.deps.provider.verify(input, signal);
      input.trustedKeys[0].material.fill(0);
      return result;
    } },
  });
  for (let i = 0; i < 2; i++) {
    const answer = await security.authenticate(f.credential("a", "bearer", f.old, {
      subject: "fictional-b", tenantId: "tenant-b", roles: ["owner"],
    }), "bearer");
    assert.deepEqual(answer.principal, {
      subject: "fictional-a", sessionId: "session-a-bearer", memberships: [{ id: "membership-a", tenantId: "tenant-a" }],
    });
    assert.ok(Object.isFrozen(answer.principal.memberships[0]));
  }
});

test("AUTH-05 rejects delimiters and control characters in the host-only cookie value", () => {
  for (const value of ["", "a\n", "a; Domain=other.invalid", "a=x", "%0A", "x".repeat(4090)]) {
    assert.throws(() => serializeSessionCookie(value), { reason: "CREDENTIAL_DENIED" });
  }
  assert.equal(serializeSessionCookie("opaque-ref"), "__Host-businessos-session=opaque-ref; Path=/; Secure; HttpOnly; SameSite=Lax");
});

test("AUTH-06 security logs allow only controlled codes and server correlation", async () => {
  const canary = randomBytes(16).toString("hex");
  const logs = [];
  reportSecurity((entry) => logs.push(entry), canary, { error: new Error(canary) }, 0, { nested: canary });
  await Promise.resolve();
  assert.deepEqual(Object.keys(logs[0]).sort(), ["correlationId", "elapsedMs", "operation", "result", "service"]);
  assert.equal(logs[0].operation, "authenticate");
  assert.equal(logs[0].result, "UNAVAILABLE");
  assert.notEqual(logs[0].correlationId, canary);
  assert.doesNotMatch(JSON.stringify(logs[0]), new RegExp(canary));
});
