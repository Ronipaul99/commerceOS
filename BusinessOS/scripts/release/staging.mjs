import assert from "node:assert/strict";
import console from "node:console";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import process from "node:process";
import path from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as wait } from "node:timers/promises";
import { URL } from "node:url";
import { baseSource, preflight } from "./preflight.mjs";
import { rehearse } from "./rehearsal.mjs";
import { migrate, verifySchema, pool, withCluster } from "../../packages/database/fixtures/cluster.mjs";
import { adminUrl } from "../../packages/database/fixtures/target.mjs";
import { seedFixtures } from "../../packages/database/fixtures/seed.mjs";

const imageId = /^sha256:[0-9a-f]{64}$/;
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", timeout: 120_000, stdio: ["ignore", "pipe", "pipe"] }).trim();
const smoke = "const signal=AbortSignal.timeout(1800); const req=(path)=>fetch('http://127.0.0.1:3001'+path,{signal});"
  + "for(const [path,status,key] of [['/health',200,'ok'],['/ready',200,'ready'],['/api/v1/me',401,undefined]]){"
  + "const r=await req(path);if(r.status!==status||(key&&(await r.json()).status!==key))process.exit(1)}";

async function main() {
  const [previous, candidate] = process.argv.slice(2);
  if (process.env.GITHUB_ACTIONS !== "true" || process.env.RUNNER_ENVIRONMENT !== "github-hosted"
      || process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT || process.env.M0104_ADMIN_URL
      || !imageId.test(previous ?? "") || !imageId.test(candidate ?? "") || previous === candidate
      || docker("context", "show") !== "default") {
    throw new Error("DISPOSABLE_STAGING_REQUIRED");
  }
  docker("image", "inspect", previous, candidate);
  const base = process.env.M0109_BASE_SHA;
  preflight(base);
  const source = baseSource(base);
  const nonce = randomBytes(8).toString("hex");
  const net = "businessos-release-" + nonce;
  const tmp = realpathSync(tmpdir());
  const scratch = realpathSync(mkdtempSync(path.join(tmp, "businessos-release-")));
  assert.equal(path.dirname(scratch), tmp);
  assert.match(path.basename(scratch), /^businessos-release-[A-Za-z0-9]+$/);
  const observed = [];
  const names = [];
  const capture = (phase) => {
    observed.push(phase);
    console.log(phase);
  };
  let createdNetwork = false;
  function start(name, alias, ...rest) {
    docker("run", "-d", "--name", name, "--network", net, "--network-alias", alias, ...rest);
    names.push(name);
  }
  const api = net + "-api";
  let runningApi = false;
  try {
    for (const [name, sql] of Object.entries(source.migrations)) {
      mkdirSync(path.join(scratch, name));
      writeFileSync(path.join(scratch, name, "migration.sql"), sql);
    }
    writeFileSync(path.join(scratch, "migration_lock.toml"), source.lock);
    docker("network", "create", "--internal", net);
    createdNetwork = true;
    const pg = net + "-postgres";
    const password = randomBytes(24).toString("hex");
    docker("run", "-d", "--name", pg, "-p", "127.0.0.1::5432", "-e", "POSTGRES_USER=m0104_admin",
      "-e", "POSTGRES_DB=m0104_admin", "-e", "POSTGRES_PASSWORD=" + password, "postgres:17.9-bookworm");
    names.push(pg);
    docker("network", "connect", "--alias", "postgres", net, pg);
    for (let attempt = 0; ; attempt++) {
      try { docker("exec", pg, "pg_isready", "-h", "127.0.0.1", "-d", "m0104_admin"); break; } catch {
        if (attempt >= 30) throw new Error("STAGING_DATABASE_UNAVAILABLE");
        await wait(500);
      }
    }
    const binding = /^127\.0\.0\.1:(\d+)$/.exec(docker("port", pg, "5432/tcp"));
    if (!binding) throw new Error("STAGING_DATABASE_UNAVAILABLE");
    const url = new URL("postgresql://m0104_admin@127.0.0.1:" + binding[1] + "/m0104_admin");
    url.password = password;
    await withCluster(adminUrl(url.href), async (_version, createDatabase) => {
      const fixture = await createDatabase();
      const owner = pool(fixture.migrationUrl);
      try {
        start(net + "-redis", "redis", "redis:7.4.8-alpine", "redis-server", "--save", "");
        start(net + "-storage", "storage", "--entrypoint", "node", previous, "-e",
          "require('node:http').createServer((q,s)=>s.end('ok')).listen(3100,'0.0.0.0')");
        const readFixtures = async () => (await owner.query(
          "SELECT tenant.id, tenant.label, branch.id AS branch, branch.code FROM fixture_tenant tenant"
          + " JOIN fixture_branch branch ON branch.tenant_id=tenant.id ORDER BY tenant.id, branch.id",
        )).rows;
        let snapshot;
        const verifySeeds = async () => assert.deepEqual(await readFixtures(), snapshot);
        await rehearse({
          prepare: async () => {
            await migrate(fixture, scratch);
            await seedFixtures(owner);
            snapshot = await readFixtures();
            assert.equal(snapshot.length, 3);
          },
          migrate: async () => {
            await migrate(fixture);
            await verifySchema(fixture);
            await verifySeeds();
          },
          activate: async (image) => {
            if (runningApi) {
              docker("rm", "-f", api);
              names.splice(names.indexOf(api), 1);
              runningApi = false;
            }
            start(api, "api", "-e", "HOST=0.0.0.0", "-e", "BUSINESSOS_LOCAL_STACK=1", image);
            runningApi = true;
            assert.equal(docker("inspect", "--format", "{{.Image}}", api), image);
          },
          smoke: async () => {
            for (let attempts = 0; attempts < 25; attempts++) {
              try { docker("exec", api, "node", "--input-type=module", "-e", smoke); return; } catch { await wait(500); }
            }
            throw new Error("STAGING_SMOKE_FAILED");
          },
          record: capture,
        }, previous, candidate);
        await verifySeeds();
      } finally {
        await owner.end();
      }
    });
    writeFileSync(process.env.M0109_REHEARSAL_REPORT ?? path.join(scratch, "report.json"),
      JSON.stringify({ previous, candidate, observed }, null, 2) + "\n");
  } finally {
    for (const name of names.reverse()) {
      try { docker("rm", "-f", name); } catch { process.exitCode = 1; }
    }
    if (createdNetwork) {
      try { docker("network", "rm", net); } catch { process.exitCode = 1; }
    }
    rmSync(scratch, { recursive: true });
  }
}
try { await main(); } catch (error) {
  console.error(/^([A-Z_]+)$/.test(error.message) ? error.message : "STAGING_REHEARSAL_UNAVAILABLE");
  process.exitCode = 1;
}
