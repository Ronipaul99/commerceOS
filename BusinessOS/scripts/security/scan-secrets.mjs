import { spawnSync } from "node:child_process";
import console from "node:console";
import { randomBytes } from "node:crypto";
import {
  copyFileSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const version = "8.30.1";
const findingExit = 7;
const errno = { SCANNER_UNAVAILABLE: 2, CANARY_FAILED: 3, SOURCE_FINDING: 4, SCAN_FAILED: 5 };
const repository = realpathSync(fileURLToPath(new URL("../../", import.meta.url)));
const executable = process.env.GITLEAKS_BIN || "gitleaks";

function scan(root, config, ignore, target) {
  // Suppress all scanner output, including diagnostics. Only the exit code crosses this boundary.
  const result = spawnSync(executable, [
    "dir", "--config", config, "--gitleaks-ignore-path", ignore, "--ignore-gitleaks-allow",
    "--no-banner", "--redact=100", "--exit-code", String(findingExit), target,
  ], { cwd: root, stdio: "ignore", timeout: 90000, windowsHide: true });
  if (result.error || result.status === null) throw new Error("SCAN_FAILED");
  return result.status;
}

function sourcePaths() {
  const files = spawnSync("git", [
    "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--deduplicate", "--", ".",
  ], { cwd: repository, encoding: "utf8", maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  if (files.error || files.status !== 0 || !files.stdout) throw new Error("SCAN_FAILED");
  return [...new Set(files.stdout.split("\0").filter(Boolean))];
}

function snapshotSource(destination) {
  let count = 0;
  for (const name of sourcePaths()) {
    const source = path.resolve(repository, name);
    const target = path.resolve(destination, name);
    if (!source.startsWith(repository + path.sep) || !target.startsWith(destination + path.sep)) {
      throw new Error("SCAN_FAILED");
    }
    let info;
    try { info = lstatSync(source); } catch (error) {
      if (error.code === "ENOENT") continue; // A removed path has no checked-out bytes.
      throw error;
    }
    if (!info.isFile() || !realpathSync(source).startsWith(repository + path.sep)) throw new Error("SCAN_FAILED");
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
    count++;
  }
  if (!count) throw new Error("SCAN_FAILED");
  return count;
}

function verify() {
  const installed = spawnSync(executable, ["version"], { encoding: "utf8", timeout: 5000, windowsHide: true });
  if (installed.error || installed.status !== 0 || installed.stdout.trim() !== version) {
    throw new Error("SCANNER_UNAVAILABLE");
  }
  const temp = realpathSync(tmpdir());
  const root = realpathSync(mkdtempSync(path.join(temp, "businessos-m0107-")));
  if (path.dirname(root) !== temp || !/^businessos-m0107-[A-Za-z0-9]+$/.test(path.basename(root))) {
    throw new Error("SCAN_FAILED");
  }
  try {
    const config = path.join(root, "approved.toml");
    const ignore = path.join(root, ".gitleaksignore");
    const sample = path.join(root, "positive");
    const snapshot = path.join(root, "source");
    writeFileSync(config, "[extend]\nuseDefault = true\n", { mode: 0o600 });
    writeFileSync(ignore, "", { mode: 0o600 });
    mkdirSync(sample);
    mkdirSync(snapshot);
    const canary = "ghp_" + randomBytes(18).toString("hex");
    writeFileSync(path.join(sample, "fixture.txt"), "fixture = " + canary + "\n", { mode: 0o600 });
    if (scan(root, config, ignore, sample) !== findingExit) throw new Error("CANARY_FAILED");
    console.log("Synthetic secret positive control detected. Findings stayed redacted.");
    const count = snapshotSource(snapshot);
    const result = scan(root, config, ignore, snapshot);
    if (result === findingExit) throw new Error("SOURCE_FINDING");
    if (result !== 0) throw new Error("SCAN_FAILED");
    console.log("BusinessOS source scan passed for " + count + " files with Gitleaks " + version + ".");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

try {
  verify();
} catch (error) {
  const reason = error instanceof Error && Object.hasOwn(errno, error.message) ? error.message : "SCAN_FAILED";
  console.error("BusinessOS secret scan failed with " + reason + ". Raw findings were suppressed.");
  process.exitCode = errno[reason];
}
