import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import process from "node:process";
import { test } from "node:test";
import { URL } from "node:url";
import { generate, migrate, pool, verifySchema, withCluster, withDisposableServer } from "../../packages/database/fixtures/cluster.mjs";
import { seedFixtures } from "../../packages/database/fixtures/seed.mjs";
import { startFileJobs } from "../../apps/worker/dist/files/runtime.js";
import { exerciseFiles } from "./acceptance.mjs";

const require = createRequire(new URL("../../packages/database/package.json", import.meta.url));
const { PrismaPg } = require("@prisma/adapter-pg");

test("M01.08 private objects on PostgreSQL and BullMQ", { timeout: 180000 }, async (t) => {
  const redis = new URL(process.env.M0108_REDIS_URL ?? "");
  assert.equal(redis.protocol, "redis:");
  assert.equal(redis.hostname, "127.0.0.1");
  assert.ok(redis.port && !redis.username && !redis.password && !redis.search && !redis.hash && ["", "/"].includes(redis.pathname));
  const connection = { host: "127.0.0.1", port: Number(redis.port), connectTimeout: 2000, maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => attempt < 4 ? 100 : null };
  await withDisposableServer((address) => withCluster(address, async (_version, createDatabase) => {
    const fixture = await createDatabase();
    await generate();
    await migrate(fixture);
    await verifySchema(fixture);
    const owner = pool(fixture.migrationUrl);
    const { PrismaClient } = await import("../../packages/database/dist/fixture-client/client.ts");
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: fixture.runtimeUrl }) });
    try {
      await seedFixtures(owner);
      assert.match(fixture.runtimeUser, /^m0104_runtime_[a-f0-9]{12}$/);
      await owner.query(`GRANT SELECT, INSERT, UPDATE ON file_objects, file_jobs TO ${fixture.runtimeUser}`);
      await exerciseFiles(t, db, (options) => startFileJobs({
        ...options, connection, workerConnection: { ...connection, maxRetriesPerRequest: null },
        prefix: "m0108-" + randomUUID(),
      }));
    } finally {
      await Promise.all([owner.end(), db.$disconnect()]);
    }
  }));
});
