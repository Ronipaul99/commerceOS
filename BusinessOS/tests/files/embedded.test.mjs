import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath, URL } from "node:url";
import { seedFixtures } from "../../packages/database/fixtures/seed.mjs";
import { exerciseFiles } from "./acceptance.mjs";

// Diagnostic fallback for hosts without a container runtime. Reuse Prisma's locked embedded engine.
const databaseRequire = createRequire(new URL("../../packages/database/package.json", import.meta.url));
const prismaRequire = createRequire(databaseRequire.resolve("prisma/package.json"));
const devRequire = createRequire(prismaRequire.resolve("@prisma/dev"));
const { PGlite } = devRequire("@electric-sql/pglite");

const asSql = (database) => ({
  $queryRawUnsafe: async (sql, ...params) => (await database.query(sql, params)).rows,
  $executeRawUnsafe: async (sql, ...params) => (await database.query(sql, params)).affectedRows,
});

test("M01.08 embedded PostgreSQL and protected HTTP", async (t) => {
  const pg = new PGlite();
  try {
    const path = new URL("../../packages/database/fixtures/migrations/", import.meta.url);
    const migrations = (await readdir(fileURLToPath(path), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const name of migrations) await pg.exec(await readFile(new URL(name + "/migration.sql", path), "utf8"));
    await seedFixtures(pg);
    const { rows } = await pg.query("SELECT current_setting('server_version') AS version");
    t.diagnostic("Embedded PostgreSQL " + rows[0].version + " with " + migrations.length + " checked-in migrations");
    await exerciseFiles(t, { ...asSql(pg), $transaction: (work) => pg.transaction((tx) => work(asSql(tx))) });
  } finally {
    await pg.close();
  }
});
