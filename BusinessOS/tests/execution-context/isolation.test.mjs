import assert from "node:assert/strict";
import { createSecretKey, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";
import { URL } from "node:url";
import { createApi } from "../../apps/api/dist/create-api.js";
import { AppModule } from "../../apps/api/dist/app.module.js";
import { StringFieldsPipe } from "../../apps/api/dist/http/contract.js";
import { RequireScope, requireExecutionContext } from "../../apps/api/dist/http/scoped.js";
import { authorizeHttp, createJobConsumer, signJobReference } from "../../packages/execution-context/dist/index.js";
import { generate, migrate, pool, withCluster, withDisposableServer } from "../../packages/database/fixtures/cluster.mjs";
import { a1, b1, b2, tenantB } from "../../packages/database/fixtures/seed.mjs";
import {
  actors, effect, executor, openAuthority, operation, provision, quantity, read, repository, snapshot, update,
} from "./fixture.mjs";

const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
const { Body, Controller, Get, Module, NotFoundException, Patch, Req } = apiRequire("@nestjs/common");
const supertest = apiRequire("supertest");
const dbRequire = createRequire(new URL("../../packages/database/package.json", import.meta.url));
const { PrismaPg } = dbRequire("@prisma/adapter-pg");

async function startApi(repo, resolve, audit) {
  class FixtureController {
    async target(req) {
      const record = await repo.read(requireExecutionContext(req), req.params.id);
      if (!record) throw new NotFoundException();
      return record;
    }

    async count(req) {
      return { count: await repo.count(requireExecutionContext(req)) };
    }

    async patch(req, fields) {
      const result = await repo.update(requireExecutionContext(req), req.params.id, Number(fields.version));
      if (!result.count) throw new NotFoundException();
      return { version: Number(fields.version) + 1 };
    }
  }

  Controller("api/v1/context-fixture")(FixtureController);
  const target = FixtureController.prototype;
  for (const [name, method, path, access] of [
    ["target", Get, "records/:id", read],
    ["count", Get, "count", read],
    ["patch", Patch, "branches/:id", update],
  ]) {
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    method(path)(target, name, descriptor);
    RequireScope(access)(target, name, descriptor);
    Req()(target, name, 0);
  }
  Body(new StringFieldsPipe({ version: /^[1-9]$/ }))(target, "patch", 1);
  class TestModule {}
  Module({ imports: [AppModule], controllers: [FixtureController] })(TestModule);
  const verify = async (token) => {
    const index = ["token-a", "token-b1", "token-b2"].indexOf(token);
    if (index < 0) return undefined;
    const actor = actors[index];
    return { subject: actor.id, sessionId: actor.identityRef, memberships: [] };
  };
  const app = await createApi(verify, TestModule, { resolve, audit: (entry) => { audit.push(entry); } });
  await app.listen(0, "127.0.0.1");
  return app;
}

function worker(db, loadAuthority, repo, audit, correlationId) {
  const now = Math.floor(Date.now() / 1000);
  const secret = createSecretKey(randomBytes(32));
  const identity = { ...operation, jobId: "job-a", correlationId };
  const job = { identity, principal: actors[0], selection: a1, input: "fixture-effect" };
  const claims = { ...identity, version: 1, keyId: "current", issuedAt: now, expiresAt: now + 120 };
  const signed = signJobReference(claims, secret);
  const attempts = [];
  const binding = {
    route: operation, access: effect, executor, allowDelegation: true,
    keyFor: async (id) => id === claims.keyId ? secret : undefined,
    authenticateService: async () => executor,
    loadJob: async (id) => id === "job-a" ? job : undefined,
    resolve: (principal) => loadAuthority(db, principal),
    audit: (entry) => { audit.push(entry); },
  };
  const receive = (overrides = {}) => createJobConsumer({ ...binding, ...overrides }, (context, input) => {
    attempts.push(context);
    return repo.apply(context, input);
  });
  return { attempts, receive, signed, claims, job, sign: (value) => signJobReference(value, secret) };
}

test("M01.05 tenant and branch isolation on real PostgreSQL", { timeout: 240000 }, async (t) => {
  await withDisposableServer((address) => withCluster(address, async (pgVersion, createDatabase) => {
    await generate();
    const { PrismaClient, Prisma } = await import("../../packages/database/dist/fixture-client/client.ts");
    const fixture = await createDatabase();
    await migrate(fixture);
    t.diagnostic(`PostgreSQL ${pgVersion} with the M01.04 migrations.`);
    const owner = pool(fixture.migrationUrl);
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: fixture.runtimeUrl }) });
    const audit = [];
    try {
      const ids = await provision(owner, fixture);
      const loadAuthority = openAuthority(Prisma);
      const repo = repository(client, loadAuthority);
      const resolve = (principal) => loadAuthority(client, principal);
      let beforeUpdate;
      let lastRead;
      const app = await startApi({
        ...repo,
        read: (context, id) => {
          lastRead = context;
          return repo.read(context, id);
        },
        update: async (...args) => {
          await beforeUpdate?.();
          return repo.update(...args);
        },
      }, resolve, audit);
      try {
        const req = supertest(app.getHttpServer());
        const path = (suffix) => "/api/v1/context-fixture/" + suffix;
        const attach = (request, token = "token-a") => request.set("Authorization", "Bearer " + token);
        const see = (id, token) => attach(req.get(path("records/" + id)), token);
        const modify = (branchId, token, body = { version: "1" }) => attach(req.patch(path("branches/" + branchId)), token).send(body);
        const initial = await Promise.all([a1, { tenantId: tenantB }, b2].map((scope) => snapshot(owner, scope)));
        await t.test("CTX-01 verified HTTP scope and active branch", async () => {
          await req.get(path("records/" + ids[0])).expect(401);
          const found = await see(ids[0]).expect(200);
          assert.deepEqual(found.body, { id: ids[0], sourceKey: "LOCAL", version: 1 });
          assert.throws(() => repo.read(lastRead, ids[0]), { code: "FORBIDDEN" });
          assert.deepEqual((await attach(req.get(path("count"))).expect(200)).body, { count: 1 });
        });

        await t.test("CTX-02 scoped reads, counts and writes ignore guessed IDs and reject overrides", async () => {
          const denied = await see(ids[1]).expect(404);
          const missing = await see(randomUUID()).expect(404);
          for (const response of [denied, missing]) {
            assert.equal(response.body.code, "NOT_FOUND");
            assert.deepEqual(response.body.details, {});
            assert.equal(response.body.requestId, response.headers["x-request-id"]);
            assert.equal(response.body.message, "The resource is unavailable.");
          }
          await see(ids[2], "token-b1").expect(404);
          await see(ids[2], "token-b2").expect(200);
          await attach(req.get(path("count")), "token-b1").expect(200, { count: 1 });
          await attach(req.get(path("count"))).query({ "filter[tenant_id]": tenantB }).expect(400);
          await see(ids[0]).set("X-Tenant-Id", tenantB).expect(400);
          await see(ids[0]).set("Branch_Id", b2.branchId).expect(400);
          await modify(a1.branchId, "token-a", { version: "1", tenant_id: tenantB }).expect(400);
          await modify(a1.branchId, "token-a", { version: "1", nested: [{ branchId: b2.branchId }] }).expect(400);
          await modify(b1.branchId, "token-a").expect(404);
          await modify(b2.branchId, "token-b1").expect(404);
          assert.deepEqual(await Promise.all([a1, { tenantId: tenantB }, b2].map((scope) => snapshot(owner, scope))), initial);
        });

        const opened = audit.find((entry) => entry.source === "http" && entry.action === "read" && entry.actorId === actors[0].id);
        assert.ok(opened);
        const job = worker(client, loadAuthority, repo, audit, opened.correlationId);

        await t.test("CTX-03 forged and unauthorized jobs fail before effects during a valid attempt", async () => {
          const ignored = [
            [{ ...job.signed, tenantId: tenantB }, "INVALID_PROOF"],
            [{ ...job.signed, branch_id: b2.branchId }, "INVALID_PROOF"],
            [{ ...job.signed, operation: "other" }, "INVALID_PROOF"],
            [job.sign({ ...job.claims, audience: "other" }), "INVALID_PROOF"],
            [job.sign({ ...job.claims, issuedAt: job.claims.issuedAt - 60, expiresAt: job.claims.issuedAt }), "INVALID_PROOF"],
            [job.sign({ ...job.claims, jobId: "missing" }), "FORBIDDEN"],
          ];
          const consume = job.receive();
          const [accepted, duplicate] = await Promise.all([
            consume(job.signed),
            consume(job.signed),
            ...ignored.map(([delivery, code]) => assert.rejects(consume(delivery), { code })),
            assert.rejects(job.receive({ loadJob: async () => ({ ...job.job, selection: b1 }) })(job.signed), { code: "FORBIDDEN" }),
          ]);
          assert.equal(job.attempts.length, 2);
          assert.equal(accepted.id, duplicate.id);
          assert.deepEqual([accepted.replayed, duplicate.replayed].sort(), [false, true]);
          assert.equal(job.attempts[0].origin.correlationId, opened.correlationId);
          assert.notEqual(job.attempts[0].origin.attemptId, opened.attemptId);
          assert.equal(job.attempts[0].origin.executor.id, executor.id);
        });

        await t.test("CTX-04 concurrent replay and current authority revalidation", async () => {
          assert.throws(() => repo.count(undefined), { code: "FORBIDDEN" });
          assert.throws(() => repo.count({ kind: "platform", operatorId: "fixture-support" }), { code: "FORBIDDEN" });
          const consume = job.receive();
          const results = await Promise.all([consume(job.signed), consume(job.signed)]);
          assert.ok(results.every((result) => result.replayed));
          assert.equal(results[0].id, results[1].id);
          assert.equal(new Set(job.attempts.map((entry) => entry.origin.attemptId)).size, 4);

          const stale = await authorizeHttp(actors[0], update, resolve);
          beforeUpdate = () => owner.query("UPDATE fixture_execution_authority SET branch_active = FALSE, revision = 2 WHERE identity_ref = $1", [
            actors[0].identityRef,
          ]);
          await modify(a1.branchId, "token-a").expect(403);
          beforeUpdate = undefined;
          await assert.rejects(consume(job.signed), { code: "FORBIDDEN" });
          await assert.rejects(repo.update(stale, a1.branchId, 1), { code: "FORBIDDEN" });
          await modify(a1.branchId, "token-a").expect(403);
          await owner.query("UPDATE fixture_execution_authority SET branch_active = TRUE, active = FALSE, revision = 3 WHERE identity_ref = $1", [
            actors[0].identityRef,
          ]);
          await assert.rejects(consume(job.signed), { code: "FORBIDDEN" });
          assert.equal(job.attempts.length, 4);
          await owner.query("UPDATE fixture_execution_authority SET active = TRUE, revision = 4 WHERE identity_ref = $1", [
            actors[0].identityRef,
          ]);
        });

        await t.test("CTX-05 real writes and composite FK constraints preserve the other tenant", async () => {
          const { rows: effects } = await owner.query(`
            SELECT tenant_id, branch_id, amount_minor::text, quantity::text
            FROM fixture_transaction_probe WHERE source_key = 'record-effect:job-a'
          `);
          assert.deepEqual(effects, [{
            tenant_id: a1.tenantId, branch_id: a1.branchId, amount_minor: "9007199254740993", quantity,
          }]);
          assert.notEqual(await snapshot(owner, a1), initial[0]);
          await modify(a1.branchId).expect(200, { version: 2 });
          await modify(a1.branchId).expect(404);
          await assert.rejects(owner.query(`
            INSERT INTO fixture_transaction_probe (
              id, tenant_id, branch_id, source_key, request_fingerprint, currency_code,
              amount_minor, quantity, fixture_policy_key, policy_snapshot_revision
            ) VALUES ($1, $2, $3, 'wrong-scope', repeat('c',64), 'USD', 1, 1, 'fixture-v1', 1)
          `, [randomUUID(), a1.tenantId, b2.branchId]), { code: "23503" });
          assert.equal(await snapshot(owner, { tenantId: tenantB }), initial[1]);
          assert.equal(await snapshot(owner, b2), initial[2]);
        });

        await t.test("CTX-06 causal audit is redacted and HTTP context does not leak", async () => {
          const entries = audit.filter((entry) => entry.jobId === "job-a");
          assert.equal(entries.length, 4);
          assert.ok(entries.every((entry) => entry.actorId === actors[0].id && entry.executorId === executor.id));
          assert.ok(entries.every((entry) => entry.correlationId === opened.correlationId));
          assert.ok(audit.some((entry) => entry.decision === "INVALID_PROOF" && entry.tenantId === undefined));
          assert.doesNotMatch(JSON.stringify(audit), /token-a|session-0|worker-binding|signature|fixture-effect/);
          assert.deepEqual((await attach(req.get("/api/v1/me")).expect(200)).body, { id: actors[0].id });
          assert.deepEqual((await req.get("/health").expect(200)).body, { status: "ok" });
        });
      } finally {
        await app.close();
      }
    } finally {
      await Promise.all([client.$disconnect(), owner.end()]);
    }
  }));
});
