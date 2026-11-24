import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { URL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { isRetryableTransactionError, runTransaction } from "../src/index.ts";
import {
  generate, grantRuntimeAccess, migrate, pool, stageMigrations, verifySchema, withCluster, withDisposableServer,
} from "./cluster.mjs";
import { advanceBranch, getProbe, insertLegacyProbe, postExpandedProbe, postProbe } from "./probe.mjs";
import { a1, b1, b2, seedFixtures } from "./seed.mjs";

const exact = { sourceKey: "exact", amount: "9223372036854775807", quantity: "99999999999999.999999" };
const migrationSql = (id) => readFile(new URL(`./migrations/${id}/migration.sql`, import.meta.url), "utf8");

async function probeRow(connection, scope, sourceKey) {
  const { rows } = await connection.query(`
    SELECT id, tenant_id, branch_id, source_key, amount_minor::text, quantity::text,
      currency_code, version, policy_snapshot_revision
    FROM fixture_transaction_probe WHERE tenant_id = $1 AND branch_id = $2 AND source_key = $3
  `, [scope.tenantId, scope.branchId, sourceKey]);
  assert.equal(rows.length, 1);
  return rows[0];
}

async function seed(owner, db) {
  await seedFixtures(owner);
  await seedFixtures(owner);
  const { rows } = await owner.query(`
    SELECT (SELECT count(*)::int FROM fixture_tenant) AS tenants,
           (SELECT count(*)::int FROM fixture_branch) AS branches
  `);
  assert.deepEqual(rows, [{ tenants: 2, branches: 3 }]);
  await grantRuntimeAccess(owner, db.runtimeUser);
}

async function stagedUpgrade(t, createDatabase, temp, PrismaClient) {
  const db = await createDatabase();
  const expansion = await stageMigrations(path.join(temp, "expand"), 2);
  const backfill = await stageMigrations(path.join(temp, "backfill"), 3);
  await migrate(db, expansion);
  const owner = pool(db.migrationUrl);
  const runtime = pool(db.runtimeUrl);
  let legacy;
  let late;
  const legacyInput = { sourceKey: "legacy", amount: "9007199254740993", quantity: "1.234567" };
  try {
    await seed(owner, db);
    legacy = await postExpandedProbe(runtime, a1, legacyInput);
    assert.deepEqual(await probeRow(runtime, a1, "legacy"), { ...legacy, policy_snapshot_revision: null });
    const unknown = await insertLegacyProbe(runtime, b1, "unknown", { policy: "unmapped" });
    await migrate(db, backfill);
    const repeat = await migrationSql("20261124000300_backfill_policy_revision");
    await owner.query(repeat);
    assert.deepEqual(await probeRow(runtime, a1, "legacy"), { ...legacy, policy_snapshot_revision: 1 });

    late = await insertLegacyProbe(runtime, a1, "late-compatible");
    const lock = await owner.connect();
    try {
      const tighten = await migrationSql("20261124000400_require_policy_revision");
      await assert.rejects(lock.query(tighten), { code: "23514" });
      await lock.query("ROLLBACK");
    } finally {
      lock.release();
    }
    assert.deepEqual(await probeRow(runtime, b1, "unknown"), { ...unknown, policy_snapshot_revision: null });
    assert.deepEqual(await probeRow(runtime, a1, "late-compatible"), { ...late, policy_snapshot_revision: null });
    await owner.query("DELETE FROM fixture_transaction_probe WHERE id = $1", [unknown.id]);
    const compatible = await insertLegacyProbe(runtime, b2, "explicit-revision", { revision: 1 });
    assert.deepEqual(await probeRow(runtime, b2, "explicit-revision"), {
      ...compatible, policy_snapshot_revision: 1,
    });
  } finally {
    await Promise.all([owner.end(), runtime.end()]);
  }

  const restored = await createDatabase(db.name);
  await migrate(db);
  await verifySchema(db);
  const after = pool(db.runtimeUrl);
  const adapter = new PrismaClient({ adapter: new PrismaPg({ connectionString: db.runtimeUrl }) });
  try {
    assert.deepEqual(await probeRow(after, a1, "legacy"), { ...legacy, policy_snapshot_revision: 1 });
    assert.deepEqual(await probeRow(after, a1, "late-compatible"), { ...late, policy_snapshot_revision: 1 });
    await assert.rejects(insertLegacyProbe(after, a1, "old-writer"), { code: "23502" });
    await insertLegacyProbe(after, a1, "new-writer", { revision: 1 });
    const replay = await postProbe(adapter, a1, legacyInput);
    assert.equal(replay.replayed, true);
    assert.equal(replay.record.id, legacy.id);
    assert.equal(replay.record.amountMinor.toString(), legacyInput.amount);
    assert.equal(replay.record.quantity.toFixed(6), legacyInput.quantity);
    await migrate(db);
  } finally {
    await Promise.all([adapter.$disconnect(), after.end()]);
  }
  t.diagnostic("DB-02 preserved original values and rolled back failed tightening on the unmapped policy.");

  const snapshot = pool(restored.runtimeUrl);
  try {
    assert.deepEqual(await probeRow(snapshot, a1, "late-compatible"), { ...late, policy_snapshot_revision: null });
    await insertLegacyProbe(snapshot, a1, "restored-old-writer");
    await migrate(restored);
    await verifySchema(restored);
    assert.deepEqual(await probeRow(snapshot, a1, "legacy"), { ...legacy, policy_snapshot_revision: 1 });
    assert.deepEqual(await probeRow(snapshot, a1, "late-compatible"), { ...late, policy_snapshot_revision: 1 });
    assert.equal((await probeRow(snapshot, a1, "restored-old-writer")).policy_snapshot_revision, 1);
  } finally {
    await snapshot.end();
  }
  t.diagnostic("DB-06 restored the disposable expanded snapshot, ran the older writer and reapplied the final migration.");
}

async function transactionChecks(t, adapter, runtime) {
  const rollback = new Error("fixture rollback marker");
  await assert.rejects(adapter.$transaction(async (tx) => {
    await advanceBranch(tx, a1, a1.branchId, 1);
    await tx.$executeRaw`
      INSERT INTO fixture_transaction_probe
        (id, tenant_id, branch_id, source_key, request_fingerprint, currency_code,
         amount_minor, quantity, fixture_policy_key, policy_snapshot_revision)
      VALUES (gen_random_uuid(), ${a1.tenantId}::uuid, ${a1.branchId}::uuid,
              'rolled-back', repeat('a', 64), 'USD', 1, 1, 'fixture-v1', 1)
    `;
    throw rollback;
  }), (error) => error === rollback);
  assert.equal(await getProbe(adapter, a1, "rolled-back"), null);
  assert.equal((await postProbe(adapter, a1, { ...exact, sourceKey: "rolled-back" })).replayed, false);
  assert.deepEqual(await advanceBranch(adapter, a1, a1.branchId, 1), { count: 1 });
  assert.deepEqual(await advanceBranch(adapter, a1, a1.branchId, 1), { count: 0 });

  const blocker = await runtime.connect();
  try {
    await blocker.query("BEGIN");
    await blocker.query("SELECT id FROM fixture_branch WHERE id = $1 FOR UPDATE", [a1.branchId]);
    let attempts = 0;
    await assert.rejects(runTransaction(
      (work, options) => adapter.$transaction(work, options),
      async (tx) => {
        attempts++;
        await tx.$executeRaw`SET LOCAL lock_timeout = '200ms'`;
        await tx.$queryRaw`SELECT id FROM fixture_branch WHERE id = ${a1.branchId}::uuid FOR UPDATE`;
      },
      { deadlineMs: 5000 },
    ), (error) => error.code === "P2010" && error.meta?.driverAdapterError?.cause?.originalCode === "55P03");
    assert.equal(attempts, 1);
  } finally {
    await blocker.query("ROLLBACK");
    blocker.release();
  }
  assert.equal((await adapter.branch.findUnique({ where: { id: a1.branchId } })).version, 2);
  t.diagnostic("DB-05 Prisma lock timeout mapped to P2010/55P03 and was not retried.");

  const firstLocks = [Promise.withResolvers(), Promise.withResolvers()];
  const observedDeadlocks = [];
  const deadlockResults = await Promise.all([a1, b1].map(async (scope, index, scopes) => {
    let attempts = 0;
    await runTransaction(async (work, options) => {
      try {
        return await adapter.$transaction(work, options);
      } catch (error) {
        observedDeadlocks.push(error);
        throw error;
      }
    }, async (tx) => {
      const other = scopes[1 - index];
      const ordered = ++attempts === 1 ? [scope, other] : scopes;
      for (const [position, branch] of ordered.entries()) {
        await tx.$queryRaw`SELECT id FROM fixture_branch WHERE id = ${branch.branchId}::uuid FOR UPDATE`;
        if (attempts === 1 && position === 0) {
          firstLocks[index].resolve();
          await firstLocks[1 - index].promise;
        }
      }
    }, { deadlineMs: 5000 });
    return attempts;
  }));
  assert.deepEqual(deadlockResults.sort(), [1, 2]);
  assert.equal(observedDeadlocks.length, 1);
  assert.equal(observedDeadlocks[0].code, "P2010");
  assert.equal(observedDeadlocks[0].meta.driverAdapterError.cause.originalCode, "40P01");
  assert.equal(isRetryableTransactionError(observedDeadlocks[0]), true);

  let attempts = 0;
  let observed;
  await runTransaction(async (work, options) => {
    try {
      return await adapter.$transaction(work, options);
    } catch (error) {
      observed = [error.code, error.meta?.code].filter(Boolean).join("/");
      throw error;
    }
  }, async (tx) => {
    const branch = await tx.branch.findUnique({ where: { id: a1.branchId } });
    attempts++;
    if (attempts === 1) {
      await runtime.query("UPDATE fixture_branch SET version = version + 1 WHERE id = $1", [a1.branchId]);
    }
    assert.deepEqual(await advanceBranch(tx, a1, a1.branchId, branch.version), { count: 1 });
  }, { deadlineMs: 5000 });
  assert.equal(attempts, 2);
  assert.equal((await adapter.branch.findUnique({ where: { id: a1.branchId } })).version, 4);
  t.diagnostic(`DB-05 observed Prisma deadlock P2010/40P01 and serialization signal ${observed}; one committed retry effect.`);
}

test("M01.04 real PostgreSQL rollout and transaction verification", { timeout: 240_000 }, async (t) => {
  await generate();
  const { PrismaClient } = await import("../dist/fixture-client/client.ts");
  const tempRoot = await realpath(os.tmpdir());
  const temp = await realpath(await mkdtemp(path.join(tempRoot, "businessos-m0104-")));
  assert.equal(path.dirname(temp), tempRoot);
  assert.match(path.basename(temp), /^businessos-m0104-[a-zA-Z0-9]+$/);
  try {
    await withDisposableServer((address) => withCluster(address, async (version, createDatabase) => {
      t.diagnostic(`Dedicated PostgreSQL ${version} on IPv4 loopback.`);
      await t.test("DB-02 and DB-06 staged upgrade, compatibility and restore", async (subtest) => {
        await stagedUpgrade(subtest, createDatabase, temp, PrismaClient);
      });

      const fresh = await createDatabase();
      await migrate(fresh);
      await verifySchema(fresh);
      const owner = pool(fresh.migrationUrl);
      const runtime = pool(fresh.runtimeUrl);
      const adapter = new PrismaClient({ adapter: new PrismaPg({ connectionString: fresh.runtimeUrl }) });
      try {
        await t.test("DB-01 clean migrations, drift check, repeated seed and separate privileges", async () => {
          await seed(owner, fresh);
          await assert.rejects(runtime.query("CREATE TABLE forbidden_fixture (id integer)"), { code: "42501" });
          await assert.rejects(runtime.query("SELECT * FROM _prisma_migrations"), { code: "42501" });
          await assert.rejects(runtime.query("DELETE FROM fixture_transaction_probe"), { code: "42501" });
          await assert.rejects(runtime.query("UPDATE fixture_branch SET code = 'OTHER'"), { code: "42501" });
        });
        await t.test("DB-03 validated number forms and database bounds", async () => {
          for (const input of [
            { amount: "12.3" }, { amount: "9223372036854775808" }, { quantity: "0.0000001" },
            { quantity: "NaN" }, { quantity: "100000000000000" }, { quantity: "-1" }, { quantity: "0" },
          ]) assert.throws(() => postProbe(adapter, a1, { ...exact, ...input }));
          assert.equal(await getProbe(adapter, a1, exact.sourceKey), null);
          for (const quantity of ["0", "-0.000001", "NaN"]) {
            await assert.rejects(insertLegacyProbe(runtime, a1, "invalid", { quantity, revision: 1 }), {
              code: "23514",
            });
          }
          await assert.rejects(insertLegacyProbe(runtime, a1, "overflow", {
            quantity: "100000000000000", revision: 1,
          }), { code: "22003" });
          assert.equal(await getProbe(adapter, a1, "invalid"), null);
          assert.equal(await getProbe(adapter, a1, "overflow"), null);
          const { record } = await postProbe(adapter, a1, exact);
          assert.equal(record.amountMinor.toString(), exact.amount);
          assert.equal(record.quantity.toFixed(6), exact.quantity);
          assert.equal(record.policySnapshotRevision, 1);
        });
        await t.test("DB-04 separate tenant and branch scopes, concurrent replay and changed reuse", async () => {
          assert.throws(() => getProbe(adapter, undefined, "exact"), /authorized fixture scope/);
          assert.throws(() => getProbe(adapter, { ...b1, tenantId: a1.tenantId }, "exact"), /authorized fixture scope/);
          await assert.rejects(insertLegacyProbe(runtime, { ...b1, tenantId: a1.tenantId }, "cross", { revision: 1 }), {
            code: "23503",
          });
          assert.equal(await getProbe(adapter, b1, "exact"), null);
          const other = await postProbe(adapter, b1, exact);
          assert.notEqual(other.record.id, (await getProbe(adapter, a1, "exact")).id);
          assert.equal(await getProbe(adapter, b2, "exact"), null);
          assert.deepEqual(await advanceBranch(adapter, a1, b1.branchId, 1), { count: 0 });
          assert.deepEqual(await advanceBranch(adapter, b1, b2.branchId, 1), { count: 0 });
          const input = { ...exact, sourceKey: "two-writers", quantity: "1.230000" };
          const results = await Promise.all([
            postProbe(adapter, a1, input), postProbe(adapter, a1, { ...input, quantity: "1.23" }),
          ]);
          assert.equal(results[0].record.id, results[1].record.id);
          assert.deepEqual(results.map(({ replayed }) => replayed).sort(), [false, true]);
          await assert.rejects(postProbe(adapter, a1, { ...input, amount: "1" }), /source key conflict/);
          const { rows } = await runtime.query(
            "SELECT count(*)::int AS effects FROM fixture_transaction_probe WHERE source_key = 'two-writers'",
          );
          assert.equal(rows[0].effects, 1);
        });
        await t.test("DB-05 rollback, stale version, lock timeout, deadlock and serialization", async (subtest) => {
          await transactionChecks(subtest, adapter, runtime);
        });
      } finally {
        await Promise.all([adapter.$disconnect(), owner.end(), runtime.end()]);
      }
    }));
  } finally {
    await rm(temp, { recursive: true });
  }
});
