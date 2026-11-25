import { readFileSync } from "node:fs";
import console from "node:console";
import process from "node:process";
import { requireCurrentReview, requireDependencyAudit, requireScopedReleaseChecks } from "./policy.mjs";

try {
  const [action, first, second] = process.argv.slice(2);
  const read = (path) => JSON.parse(readFileSync(path, "utf8"));
  if (action === "review") requireCurrentReview(read(first), read(second));
  else if (action === "audit") requireDependencyAudit(read(first), Number(second ?? "0"));
  else if (action === "complete") requireScopedReleaseChecks(
    JSON.parse(process.env.M0109_CHECK_RESULTS ?? "{}"), process.env.M0109_AFFECTED,
  );
  else throw new Error("UNKNOWN_RELEASE_CHECK");
  console.log("BusinessOS release guard passed.");
} catch (error) {
  console.error(/^([A-Z_]+)$/.test(error.message) ? error.message : "RELEASE_GUARD_UNAVAILABLE");
  process.exitCode = 1;
}
