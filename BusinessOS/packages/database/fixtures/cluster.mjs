import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";
import pg from "pg";
import { adminUrl, fixtureUrl } from "./target.mjs";

const directory = fileURLToPath(new URL(".", import.meta.url));
const prisma = path.join(path.dirname(createRequire(import.meta.url).resolve("prisma/package.json")), "build/index.js");
const exec = promisify(execFile);
const nonce = () => randomBytes(6).toString("hex");

export function pool(connectionString) {
  return new pg.Pool({ connectionString, statement_timeout: 8000, connectionTimeoutMillis: 3000 });
}

async function runPrisma(args, env) {
  try {
    await exec(process.execPath, [prisma, ...args, "--config", "fixtures/prisma.config.ts"], {
      cwd: path.join(directory, ".."),
      env: { ...process.env, M0104_MIGRATION_URL: undefined, M0104_MIGRATION_PATH: undefined, ...env },
      timeout: 30_000,
    });
  } catch (error) {
    const output = String(error.stderr ?? "").replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL]");
    const safeSummary = output.split(/\r?\n/).filter((line) => /P\d{4}|Error:|Drift detected/.test(line));
    // The subprocess error can contain unredacted database diagnostics.
    // eslint-disable-next-line preserve-caught-error
    throw new Error(`Prisma ${args.slice(0, 2).join(" ")} failed (${error.code}). ${safeSummary.join(" ")}`);
  }
}

export async function generate() {
  // Prisma supports validation and generation with no datasource address.
  await Promise.all(["validate", "generate"].map((command) => runPrisma([command])));
}

export async function stageMigrations(folder, count) {
  const source = path.join(directory, "migrations");
  await mkdir(folder);
  await cp(path.join(source, "migration_lock.toml"), path.join(folder, "migration_lock.toml"));
  const entries = (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  for (const name of entries.slice(0, count)) {
    await cp(path.join(source, name), path.join(folder, name), { recursive: true });
  }
  return folder;
}

export async function migrate(db, stage) {
  await runPrisma(["migrate", "deploy"], {
    M0104_MIGRATION_URL: db.migrationUrl,
    M0104_MIGRATION_PATH: stage,
  });
}

export async function verifySchema(db) {
  const env = { M0104_MIGRATION_URL: db.migrationUrl, M0104_MIGRATION_PATH: undefined };
  await runPrisma(["migrate", "status"], env);
  await runPrisma([
    "migrate", "diff", "--from-config-datasource", "--to-schema", "fixtures/schema.prisma", "--exit-code",
  ], env);
}

export async function withDisposableServer(callback) {
  if (process.env.M0104_ADMIN_URL !== undefined) {
    return callback(adminUrl(process.env.M0104_ADMIN_URL));
  }

  const { PostgreSqlContainer } = await import("@testcontainers/postgresql");
  const container = await new PostgreSqlContainer("postgres:17.9-bookworm")
    .withDatabase("m0104_admin")
    .withUsername("m0104_admin")
    .withPassword(randomBytes(24).toString("hex"))
    .withStartupTimeout(60_000)
    .start();
  try {
    assert.ok(["127.0.0.1", "localhost"].includes(container.getHost()), "Use a local Docker engine.");
    const address = new URL(container.getConnectionUri());
    if (address.protocol === "postgres:") {
      address.protocol = "postgresql:";
    }
    address.hostname = "127.0.0.1";
    return await callback(adminUrl(address));
  } finally {
    await container.stop();
  }
}

export async function withCluster(address, callback) {
  const admin = pool(address.href);
  const roles = [];
  const databases = [];
  try {
    const { rows: [identity] } = await admin.query(
      "SELECT current_database() AS db, current_user AS role, current_setting('server_version') AS version",
    );
    assert.equal(identity.db, "m0104_admin");
    assert.equal(identity.role, "m0104_admin");

    async function createRole(kind) {
      const user = `m0104_${kind}_${nonce()}`;
      const password = randomBytes(24).toString("hex");
      await admin.query(`CREATE ROLE ${user} LOGIN PASSWORD '${password}'`);
      roles.push(user);
      return { user, password };
    }

    const migrator = await createRole("migrator");
    const runtime = await createRole("runtime");

    function connection(name, credentials, kind) {
      const url = new URL(address);
      url.username = credentials.user;
      url.password = credentials.password;
      url.pathname = "/" + name;
      return fixtureUrl(url, kind);
    }

    await callback(identity.version, async (template) => {
      const name = `m0104_test_${nonce()}`;
      const templateClause = template ? ` TEMPLATE ${template}` : "";
      assert.ok(!template || databases.includes(template), "snapshot source must belong to this run");
      await admin.query(`CREATE DATABASE ${name} OWNER ${migrator.user}${templateClause}`);
      databases.push(name);
      await admin.query(`REVOKE CONNECT ON DATABASE ${name} FROM PUBLIC`);
      await admin.query(`GRANT CONNECT ON DATABASE ${name} TO ${runtime.user}`);
      return {
        name,
        migrationUrl: connection(name, migrator, "migrator"),
        runtimeUrl: connection(name, runtime, "runtime"),
        runtimeUser: runtime.user,
      };
    });
  } finally {
    try {
      // Pool shutdown can resolve while PostgreSQL is still closing a connection.
      for (const name of databases.reverse()) await admin.query(`DROP DATABASE ${name}`);
      for (const user of roles.reverse()) await admin.query(`DROP ROLE ${user}`);
    } finally {
      await admin.end();
    }
  }
}

export async function grantRuntimeAccess(owner, runtimeUser) {
  await owner.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`);
  await owner.query(`GRANT USAGE ON SCHEMA public TO ${runtimeUser}`);
  await owner.query(`GRANT SELECT ON fixture_tenant, fixture_branch, fixture_transaction_probe TO ${runtimeUser}`);
  await owner.query(`GRANT UPDATE (version, updated_at) ON fixture_branch TO ${runtimeUser}`);
  await owner.query(`GRANT INSERT ON fixture_transaction_probe TO ${runtimeUser}`);
}
