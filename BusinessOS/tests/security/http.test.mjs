import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";
import { test } from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";
import { createProtectedApi } from "../../apps/api/dist/create-api.js";
import { AppModule } from "../../apps/api/dist/app.module.js";
import { CookieAuth, serializeSessionCookie, sessionCookieName } from "../../apps/api/dist/security/http.js";
import { RequireScope, requireExecutionContext } from "../../apps/api/dist/http/scoped.js";
import { createFixtures, currentRef, environment, issuer, makeKey, now, origin, previousRef } from "./fixtures.mjs";

const api = createRequire(new URL("../../apps/api/package.json", import.meta.url));
const request = api("supertest");
const { Body, Controller, Get, Module, Post, Req } = api("@nestjs/common");
const authorized = (req, credential) => req.set("Authorization", "Bearer " + credential);
const identity = (req, credential) => authorized(req.get("/api/v1/me"), credential);
const configured = (options = {}) => environment(options);

async function open(t, env, deps, root = AppModule, scope) {
  const { app, refresh } = await createProtectedApi(env, deps, root, scope);
  t.after(() => app.close());
  await app.listen(0, "127.0.0.1");
  return { http: request(app.getHttpServer()), refresh };
}

const scopedRead = { resource: "auth-fixture", action: "read", ownership: "branch" };

function fixtureRoutes() {
  let effects = 0;
  class Fixture {
    branch(req) {
      const { auth } = requireExecutionContext(req);
      return { branch: auth.scope.branchId };
    }
    submit(req, fields) {
      effects++;
      return { id: req.principal.subject, saved: Object.hasOwn(fields, "data") };
    }
  }
  Controller("api/v1/auth-fixture")(Fixture);
  const controller = Fixture.prototype;
  const branch = Object.getOwnPropertyDescriptor(controller, "branch");
  Get("branch")(controller, "branch", branch);
  RequireScope(scopedRead)(controller, "branch", branch);
  Req()(controller, "branch", 0);
  const submit = Object.getOwnPropertyDescriptor(controller, "submit");
  Post("browser")(controller, "submit", submit);
  CookieAuth()(controller, "submit", submit);
  Req()(controller, "submit", 0);
  Body()(controller, "submit", 1);
  class FixtureModule {}
  Module({ imports: [AppModule], controllers: [Fixture] })(FixtureModule);
  return { root: FixtureModule, effects: () => effects };
}

test("AUTH-01 protected composition loads a purpose-scoped secret and resolves independent memberships", async (t) => {
  const f = createFixtures();
  const { http } = await open(t, configured(), f.deps);
  await identity(http, f.credential("a", "bearer", f.old, { tenantId: "tenant-b", role: "platform" }))
    .expect(200, { id: "fictional-a" });
  await identity(http, f.credential("b")).expect(200, { id: "fictional-b" });
  for (const actor of ["a", "b"]) {
    await authorized(http.get("/api/v1/me/memberships"), f.credential(actor))
      .expect(200, { items: [{ id: "membership-" + actor, tenantId: "tenant-" + actor }], nextCursor: null });
  }
  await http.get("/").expect(200, { service: "businessos-api" });
  await http.get("/health").expect(200, { status: "ok" });
  assert.deepEqual(f.resolution, [{ reference: currentRef, purpose: "tenant-session-verification" }]);
});

test("AUTH-02 the protected API refuses partial config and missing, malformed or unavailable material", async () => {
  const f = createFixtures();
  await assert.rejects(createProtectedApi(configured({ BUSINESSOS_AUTH_CURRENT_REF: undefined }), f.deps),
    { reason: "CONFIG_INVALID" });
  f.slots.delete(currentRef);
  await assert.rejects(createProtectedApi(configured(), f.deps), { reason: "SECRET_MISSING" });
  f.slots.set(currentRef, { ...f.old, material: new Uint8Array(12) });
  await assert.rejects(createProtectedApi(configured(), f.deps), { reason: "SECRET_INVALID" });
  f.slots.set(currentRef, f.old);
  const unavailable = { ...f.deps, secrets: { ...f.deps.secrets, resolve: async () => {
    throw new Error(f.marker, { cause: { secret: f.old.material } });
  } } };
  await assert.rejects(createProtectedApi(configured(), unavailable), { reason: "UNAVAILABLE" });
  assert.deepEqual(f.logs.map((entry) => entry.result), [
    "CONFIG_INVALID", "SECRET_MISSING", "SECRET_INVALID", "UNAVAILABLE",
  ]);
  assert.doesNotMatch(JSON.stringify(f.logs), new RegExp(f.marker));
});

test("AUTH-03 bad principal, revoked session, wrong purpose and scope override fail closed", async (t) => {
  const f = createFixtures();
  const { root } = fixtureRoutes();
  const { http } = await open(t, configured(), f.deps, root, { resolve: async (actor) => {
    const member = await f.deps.memberships(actor.id);
    if (!member) return undefined;
    const [{ id, tenantId }] = member;
    const branchId = tenantId + "-main";
    return {
      principal: actor, tenantId, membershipId: id, revision: "1", active: true,
      branch: { id: branchId, tenantId, active: true },
      grants: [{ ...scopedRead, scope: "BRANCH", branchId }],
    };
  } });
  await http.get("/api/v1/me").expect(401);
  await identity(http, "malformed-fixture").expect(401);
  for (const claims of [
    { issuer: "https://other.invalid" }, { audience: "platform" }, { purpose: "worker" },
    { transport: "cookie" }, { providerSubject: "provider-b" }, { sessionId: "unbound" },
    { issuedAt: now() - 100, expiresAt: now() - 1 }, { expiresAt: now() + 3601 },
  ]) await identity(http, f.credential("a", "bearer", f.old, claims)).expect(401);
  const branch = (actor) => authorized(http.get("/api/v1/auth-fixture/branch"), f.credential(actor));
  await branch("a").expect(200, { branch: "tenant-a-main" });
  await branch("b").expect(200, { branch: "tenant-b-main" });
  await branch("a").set("X-Tenant-Id", "tenant-b").expect(400);
  f.sessions.set("session-a-bearer", { status: "denied" });
  await identity(http, f.credential("a")).expect(401);
  await identity(http, f.credential("b")).expect(200);
  f.sessions.set("session-b-bearer", { status: "unavailable" });
  await identity(http, f.credential("b")).expect(503);
});

test("AUTH-04 atomic rotation, failed refresh, compromise and retirement", async (t) => {
  const f = createFixtures();
  let checkUnavailable = false;
  let refreshUnavailable = false;
  const secrets = {
    resolve: (ref, purpose, signal) => refreshUnavailable ? { status: "unavailable" } : f.deps.secrets.resolve(ref, purpose, signal),
    versionStatus: (ref, purpose, version, signal) => checkUnavailable ? "unavailable"
      : f.deps.secrets.versionStatus(ref, purpose, version, signal),
  };
  const { http, refresh } = await open(t, configured({
    BUSINESSOS_AUTH_PREVIOUS_REF: previousRef,
    BUSINESSOS_AUTH_PREVIOUS_UNTIL: String(now() + 100),
  }), { ...f.deps, secrets });
  await identity(http, f.credential("a")).expect(200);
  await identity(http, f.credential("b", "bearer", f.previous)).expect(200);
  const next = makeKey("version-2");
  const retired = f.credential("a", "bearer", f.previous);
  f.slots.set(currentRef, next);
  f.slots.set(previousRef, f.old);
  refreshUnavailable = true;
  await assert.rejects(refresh(), { reason: "UNAVAILABLE" });
  await identity(http, retired).expect(200);
  await identity(http, f.credential("a", "bearer", next)).expect(401);
  checkUnavailable = true;
  await identity(http, f.credential("a")).expect(503);
  checkUnavailable = false;
  refreshUnavailable = false;
  await Promise.all([refresh(), refresh()]);
  await identity(http, f.credential("a", "bearer", next)).expect(200);
  await identity(http, f.credential("a")).expect(200);
  await identity(http, retired).expect(401);
  f.revokedKeys.add(f.old.version);
  await identity(http, f.credential("a")).expect(401);
  await identity(http, f.credential("a", "bearer", next)).expect(200);
  f.sessions.set("session-a-bearer", { status: "denied" });
  await identity(http, f.credential("a", "bearer", next)).expect(401);
  assert.equal(f.logs.filter((entry) => entry.operation === "refresh" && entry.result === "ACCEPTED").length, 1);
});

test("AUTH-05 headers, per-route credentials, HTTPS and session-bound CSRF", async (t) => {
  const f = createFixtures();
  const { root, effects } = fixtureRoutes();
  const env = configured({
    BUSINESSOS_AUTH_TRANSPORT: "bearer-with-cookie", BUSINESSOS_AUTH_HTTPS: "required",
    BUSINESSOS_AUTH_BROWSER_ORIGINS: origin, BUSINESSOS_AUTH_TRUSTED_PROXIES: "127.0.0.1",
  });
  const { http } = await open(t, env, f.deps, root);
  const cookie = serializeSessionCookie(f.credential("a", "cookie"));
  assert.match(cookie, /^__Host-businessos-session=[^;]+; Path=\/; Secure; HttpOnly; SameSite=Lax$/);
  const onlyCookie = cookie.split(";", 1)[0];
  const secure = (req) => req.set("X-Forwarded-Proto", "https");
  const rawBrowser = () => http.post("/api/v1/auth-fixture/browser").set("Cookie", onlyCookie).send({ data: "fixture" });
  const browser = () => secure(rawBrowser());
  await rawBrowser().expect(403);
  await rawBrowser().set("X-Forwarded-Proto", ["https", "http"]).expect(403);
  await browser().expect(403);
  await browser().set("Origin", origin).expect(403);
  const csrfA = f.sessions.get("session-a-cookie").csrf;
  const csrfB = f.sessions.get("session-b-cookie").csrf;
  await browser().set("Origin", origin + ".wrong").set("X-CSRF-Token", csrfA).expect(403);
  await browser().set("Origin", origin).set("X-CSRF-Token", csrfB).expect(403);
  await browser().set("Origin", [origin, "https://other.invalid"]).set("X-CSRF-Token", csrfA).expect(403);
  await browser().set("Cookie", onlyCookie + "; " + onlyCookie).set("Origin", origin).set("X-CSRF-Token", csrfA).expect(401);
  await browser().set("Authorization", "Bearer " + f.credential("a")).set("Origin", origin).set("X-CSRF-Token", csrfA).expect(401);
  assert.equal(effects(), 0);
  const allowed = await browser().set("Origin", origin).set("X-CSRF-Token", csrfA).expect(201, { id: "fictional-a", saved: true });
  assert.equal(allowed.headers["strict-transport-security"], "max-age=31536000");
  assert.equal(allowed.headers["x-content-type-options"], "nosniff");
  assert.equal(allowed.headers["x-frame-options"], "DENY");
  assert.match(allowed.headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.equal(allowed.headers["cache-control"], "no-store");
  assert.equal(allowed.headers["x-powered-by"], undefined);
  assert.equal(allowed.headers["access-control-allow-credentials"], undefined);
  assert.equal(effects(), 1);
  await secure(http.get("/api/v1/me").set("Cookie", onlyCookie)).expect(401);
  await secure(identity(http, f.credential("a")).set("Cookie", onlyCookie)).expect(401);
  await secure(http.get("/api/v1/me").set("Authorization", [
    "Bearer " + f.credential("a"), "Bearer " + f.credential("b"),
  ])).expect(401);
  await secure(identity(http, f.credential("a"))).expect(200);
  const plain = await identity(http, f.credential("a")).expect(403);
  assert.equal(plain.headers["strict-transport-security"], undefined);
  const noProxy = await open(t, configured({ BUSINESSOS_AUTH_HTTPS: "required" }), f.deps);
  await secure(identity(noProxy.http, f.credential("a"))).expect(403);
  assert.equal(sessionCookieName, "__Host-businessos-session");
});

test("AUTH-06 debug errors, client correlation and authority timeouts stay redacted", async (t) => {
  const f = createFixtures();
  const sensitive = f.marker;
  let stuck = false;
  const provider = { verify: async (_request, signal) => {
    if (stuck) await wait(100, undefined, { signal });
    throw new Error("provider failure " + sensitive, { cause: { login: issuer, private: f.old.material } });
  } };
  const { http } = await open(t, configured({ BUSINESSOS_AUTH_VERIFY_MS: "50" }), { ...f.deps, provider });
  const token = f.credential("a");
  const unavailable = await identity(http, token).set("X-Request-Id", sensitive).expect(503);
  assert.deepEqual(unavailable.body, {
    code: "UNAVAILABLE", message: "The service is temporarily unavailable.", details: {}, requestId: sensitive,
  });
  stuck = true;
  await identity(http, token).expect(503);
  const payload = JSON.stringify(f.logs);
  for (const text of [sensitive, token, issuer, currentRef, "provider failure", f.old.material.toString("hex")]) {
    assert.equal(payload.includes(text), false);
  }
  assert.deepEqual(f.logs.map((entry) => entry.result), ["ACCEPTED", "UNAVAILABLE", "UNAVAILABLE"]);
  assert.ok(f.logs.every((entry) => Object.keys(entry).sort().join()
    === "correlationId,elapsedMs,operation,result,service"));
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("../../apps/api/dist/main.js", import.meta.url))], {
    env: { ...process.env, ...configured(), PORT: "0" }, encoding: "utf8", windowsHide: true, timeout: 5000,
  });
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /CONFIG_INVALID/);
  assert.doesNotMatch(cli.stderr + cli.stdout, /fixtures\/session|issuer\.businessos\.invalid/);
});
