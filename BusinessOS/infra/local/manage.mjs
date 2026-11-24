import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../../", import.meta.url));
const localProject = "businessos-local";
const envFile = resolve(root, ".env");
const command = process.argv[2] ?? "up";
const extra = process.argv.slice(3);

function docker(args, env, capture = false) {
  const result = spawnSync("docker", args, {
    cwd: root,
    env,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) {
    throw new Error(result.error.code === "ENOENT"
      ? "Docker CLI was not found. Start a local Docker engine with Compose v2."
      : result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(`Docker command failed (${result.status ?? result.signal}).`);
  }
  return capture ? result.stdout.trim() : undefined;
}

function compose(project, config, env, context) {
  const args = ["--context", context, "compose", "--env-file", ".env.example",
    "-p", project, "-f", "compose.yaml"];
  if (config === "test") {
    args.push("-f", "infra/local/test.compose.yaml");
  }
  return (...options) => docker([...args, ...options], env);
}

function migrate(run) {
  run("up", "-d", "--wait", "--wait-timeout", "90", "postgres");
  run("run", "--rm", "--no-deps", "fixtures");
}

function up(run) {
  migrate(run);
  run("up", "-d", "--build", "--wait", "--wait-timeout", "120", "api");
}

function smoke(run) {
  run("run", "--rm", "--no-deps", "fixtures", "--file", "/fixtures/smoke.sql");
  // APPENDONLY Redis is shared with no other project. Use a dedicated disposable key.
  const key = `m0102:smoke:${randomUUID()}`;
  run("exec", "-T", "redis", "sh", "-ec",
    'redis-cli RPUSH "$1" local-smoke >/dev/null; test "$(redis-cli --raw BLPOP "$1" 2)" = "$(printf "%s\\nlocal-smoke" "$1")"',
    "queue-smoke", key);
  run("exec", "-T", "api", "node", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    for (const [path, status] of [["/", undefined], ["/health", "ok"], ["/ready", "ready"]]) {
      const response = await fetch("http://127.0.0.1:3001" + path, { signal: AbortSignal.timeout(4000) });
      assert.equal(response.status, 200);
      const body = await response.json();
      if (status === undefined) assert.equal(body.service, "businessos-api");
      else assert.equal(body.status, status);
    }
    const url = "http://storage:3100/objects/smoke.txt";
    const options = () => ({ signal: AbortSignal.timeout(4000) });
    assert.equal((await fetch(url, options())).status, 404);
    assert.equal((await fetch(url, { ...options(), method: "PUT", body: "fixture-only" })).status, 204);
    const result = await fetch(url, options());
    assert.equal(result.status, 200);
    assert.equal(await result.text(), "fixture-only");
  `);
  console.log("PASS API, fixtures, Redis queue round trip and storage stub");
}

function main() {
  if (!["up", "down", "reset", "migrate", "test"].includes(command)) {
    throw new Error("Usage: node infra/local/manage.mjs [up|down|migrate|test|reset --confirm-local-reset]");
  }
  if (command === "reset" ? extra.length !== 1 || extra[0] !== "--confirm-local-reset" : extra.length !== 0) {
    throw new Error("Invalid arguments. Reset requires --confirm-local-reset.");
  }

  const test = command === "test";
  const fileValues = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
  const port = process.env.BUSINESSOS_LOCAL_API_PORT ?? fileValues.BUSINESSOS_LOCAL_API_PORT ?? "13001";
  if (!/^\d{4,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
    throw new Error("BUSINESSOS_LOCAL_API_PORT must be between 1024 and 65535.");
  }
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(COMPOSE_|BUSINESSOS_LOCAL_|DOCKER_HOST$|DOCKER_CONTEXT$|DOCKER_TLS_VERIFY$|DOCKER_CERT_PATH$)/i.test(key)));
  const context = docker(["context", "show"], env, true);
  assert.ok(context, "A local Docker context is required.");
  const endpoint = docker(["context", "inspect", context, "--format", "{{.Endpoints.docker.Host}}"], env, true);
  if (!/^unix:\/\/\/(?:[^\s]+\/)?[^/\s]+\.sock$/.test(endpoint)
      && !/^npipe:\/\/\/\/\.\/pipe\/docker[\w.-]*$/i.test(endpoint)) {
    throw new Error("Use a Docker context backed by a local Unix socket or Windows Docker named pipe.");
  }
  env.BUSINESSOS_LOCAL_DB = test ? "businessos_test" : "businessos_local";
  env.BUSINESSOS_LOCAL_API_PORT = port;
  const project = test ? `businessos-test-${randomUUID().slice(0, 8)}` : localProject;
  const run = compose(project, test ? "test" : "local", env, context);
  if (test) {
    try {
      up(run);
      migrate(run);
      smoke(run);
      run("down", "--volumes");
      up(run);
      smoke(run);
      console.log("PASS clean-volume reset and reseed");
    } finally {
      run("down", "--volumes");
    }
    return;
  }
  if (command === "migrate") {
    migrate(run);
    return;
  }
  if (command === "down" || command === "reset") {
    run("down", ...(command === "reset" ? ["--volumes"] : []));
  }
  if (command !== "down") {
    up(run);
    console.log(`BusinessOS local API at http://127.0.0.1:${port}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
