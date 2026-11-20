import { spawnSync } from "node:child_process";
import path from "node:path";
if (!process.env.E2E_DATABASE_URL)
  throw new Error(
    "Set E2E_DATABASE_URL to a dedicated database with TIYAS migrations and development seed. Never use a shared/live database.",
  );
if (!process.env.npm_execpath)
  throw new Error("Run this script with npm run test:e2e");
const env = { ...process.env, API_INTERNAL_URL: "http://127.0.0.1:4100" };
function run(args) {
  const result = spawnSync(process.execPath, args, {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run([process.env.npm_execpath, "run", "build"]);
run([
  path.resolve("node_modules/playwright/cli.js"),
  "test",
  ...process.argv.slice(2),
]);
