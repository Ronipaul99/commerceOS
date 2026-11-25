import { execFileSync } from "node:child_process";
import console from "node:console";
import { readFileSync, readdirSync } from "node:fs";
import process from "node:process";
import { requireAuditHistory, requireMigrationHistory } from "./policy.mjs";
import { loadRolloutHistory } from "../../apps/api/dist/release/flags.js";

export const migrationPath = "packages/database/fixtures/migrations";
const flagPath = "infra/release/rollout.json";
const validSha = /^[0-9a-f]{40}$/;
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const normalized = (text) => text.replaceAll("\r\n", "\n");

export function baseSource(base) {
  if (!validSha.test(base ?? "")) throw new Error("RELEASE_BASE_INVALID");
  const top = git("rev-parse", "--show-prefix").trim();
  const readAt = (path) => normalized(git("show", base + ":" + top + path));
  const files = git("ls-tree", "-r", "--name-only", base, "--", migrationPath).trim().split(/\r?\n/);
  const names = files.filter((name) => name.startsWith(migrationPath + "/") && name.endsWith("/migration.sql"))
    .map((name) => name.slice((migrationPath + "/").length, -"/migration.sql".length));
  return {
    migrations: Object.fromEntries(names.map((name) => [name, readAt(migrationPath + "/" + name + "/migration.sql")])),
    lock: readAt(migrationPath + "/migration_lock.toml"),
    flags: () => {
      const result = git("ls-tree", "--name-only", base, "--", flagPath);
      return result.trim() ? JSON.parse(readAt(flagPath)) : undefined;
    },
  };
}

function currentSource() {
  const folder = readdirSync(migrationPath, { withFileTypes: true });
  if (folder.some((entry) => !entry.isDirectory() && entry.name !== "migration_lock.toml")) {
    throw new Error("MIGRATION_HISTORY_INVALID");
  }
  return Object.fromEntries(folder.filter((entry) => entry.isDirectory()).map(({ name }) => {
    const files = readdirSync(migrationPath + "/" + name, { withFileTypes: true });
    if (files.length !== 1 || files[0].name !== "migration.sql" || !files[0].isFile()) throw new Error("MIGRATION_HISTORY_INVALID");
    return [name, normalized(readFileSync(migrationPath + "/" + name + "/migration.sql", "utf8"))];
  }));
}

export function preflight(base) {
  const prior = baseSource(base);
  if (prior.lock !== normalized(readFileSync(migrationPath + "/migration_lock.toml", "utf8"))) {
    throw new Error("MIGRATION_HISTORY_CHANGED");
  }
  const counts = requireMigrationHistory(prior.migrations, currentSource());
  const current = loadRolloutHistory(JSON.parse(readFileSync(flagPath, "utf8")));
  const original = prior.flags();
  requireAuditHistory(original === undefined ? [] : loadRolloutHistory(original), current);
  return { ...counts, flagRevision: current.at(-1).revision };
}

if (process.argv[1]?.endsWith("preflight.mjs")) {
  try { console.log(JSON.stringify(preflight(process.env.M0109_BASE_SHA))); } catch (error) {
    console.error(/^([A-Z_]+)$/.test(error.message) ? error.message : "RELEASE_PREFLIGHT_UNAVAILABLE");
    process.exitCode = 1;
  }
}
