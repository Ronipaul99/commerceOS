import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

async function start(t, script) {
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));

  const child = spawn(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, BUSINESSOS_LOCAL_STACK: "0", HOST: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const exit = once(child, "close");
  t.after(async () => {
    child.kill();
    await exit;
  });

  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 150 && child.exitCode === null; attempt++) {
    try {
      const response = await fetch(base + "/health", { signal: AbortSignal.timeout(500) });
      if (response.ok) return base;
    } catch {
      // The child starts listening asynchronously.
    }
    await setTimeout(100);
  }
  throw new Error(`Smoke service did not start: ${stderr}`);
}

test("API preserves identity and distinguishes liveness from missing readiness configuration", async (t) => {
  const base = await start(t, "apps/api/dist/main.js");
  assert.deepEqual(await (await fetch(base + "/")).json(), { service: "businessos-api" });
  assert.deepEqual(await (await fetch(base + "/health")).json(), { status: "ok" });
  const ready = await fetch(base + "/ready");
  assert.equal(ready.status, 503);
  assert.equal(ready.headers.get("cache-control"), "no-store");
  assert.deepEqual(await ready.json(), { status: "not_ready" });
});

test("object stub handles only its bounded fixture", async (t) => {
  const base = await start(t, "infra/local/object-store.mjs");
  const url = base + "/objects/smoke.txt";
  assert.equal((await fetch(url)).status, 404);
  assert.equal((await fetch(url, { method: "PUT", body: "fixture" })).status, 204);
  assert.equal(await (await fetch(url)).text(), "fixture");
  assert.equal((await fetch(url, { method: "PUT", body: "x".repeat(4097) })).status, 413);
  assert.equal(await (await fetch(url)).text(), "fixture");
  assert.equal((await fetch(url, { method: "DELETE" })).status, 405);
  assert.equal((await fetch(base + "/objects/another.txt", { method: "PUT", body: "x" })).status, 404);
});

test("launcher rejects reset without confirmation and invalid ports before invoking Docker", () => {
  function launch(args, env) {
    return spawnSync(process.execPath, ["infra/local/manage.mjs", ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: "utf8",
      windowsHide: true,
    });
  }
  const reset = launch(["reset"]);
  assert.equal(reset.status, 1);
  assert.match(reset.stderr, /Reset requires --confirm-local-reset/);

  const port = launch(["up"], { BUSINESSOS_LOCAL_API_PORT: "not-a-port" });
  assert.equal(port.status, 1);
  assert.match(port.stderr, /must be between 1024 and 65535/);
});
