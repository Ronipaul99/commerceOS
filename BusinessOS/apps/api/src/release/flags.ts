import { createHash } from "node:crypto";
import { scopeFor } from "@businessos/execution-context";
import type { Access, RequestContext } from "@businessos/execution-context";

const flagId = /^release\.[a-z][a-z0-9-]{0,47}(?![\s\S])/;
const tenantId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?![\s\S])/;

type Setting = Readonly<{ enabled: boolean; basisPoints: number }>;
export type RolloutAudit = Readonly<{
  revision: number; reason: "BASELINE" | "PILOT" | "RAMP" | "ROLLBACK" | "DISABLE";
  flags: Readonly<Record<string, Setting>>;
}>;

export function loadRolloutHistory(input: unknown): readonly RolloutAudit[] {
  if (!input || typeof input !== "object" || !("schemaVersion" in input) || input.schemaVersion !== 1
    || !("history" in input) || !Array.isArray(input.history) || !input.history.length || Object.keys(input).length !== 2) {
    throw new Error("Invalid release flag history.");
  }
  const reasons = new Set(["BASELINE", "PILOT", "RAMP", "ROLLBACK", "DISABLE"]);
  const snapshots: RolloutAudit[] = [];
  for (const entry of input.history) {
    const revision = snapshots.length + 1;
    if (!entry || Object.keys(entry).length !== 3 || entry.revision !== revision || !reasons.has(entry.reason)
        || (entry.reason === "BASELINE") !== (revision === 1)
        || !entry.flags || typeof entry.flags !== "object" || Array.isArray(entry.flags)) {
      throw new Error("Invalid release flag revision.");
    }
    const flags: Record<string, Setting> = Object.create(null);
    for (const [key, raw] of Object.entries(entry.flags)) {
      const value = raw as Setting | undefined;
      if (!flagId.test(key) || !value || Object.keys(value).length !== 2 || typeof value.enabled !== "boolean"
          || !Number.isInteger(value.basisPoints) || value.basisPoints < 0 || value.basisPoints > 10_000
          || (!value.enabled && value.basisPoints !== 0) || (revision === 1 && value.enabled)) {
        throw new Error("Invalid rollout setting.");
      }
      flags[key] = Object.freeze({ enabled: value.enabled, basisPoints: value.basisPoints });
    }
    snapshots.push(Object.freeze({ revision, reason: entry.reason, flags: Object.freeze(flags) }));
  }
  return Object.freeze(snapshots);
}

export function releaseFlags(input: unknown, registered: readonly string[]) {
  const history = loadRolloutHistory(input);
  const current = history.at(-1)!;
  const keys = new Set(registered);
  if (registered.some((key) => !flagId.test(key))) throw new Error("Invalid rollout registration.");
  return Object.freeze({
    revision: current.revision,
    evaluate(key: string, context: RequestContext, operation: Access, entitled: boolean): boolean {
      if (!keys.has(key) || entitled !== true) return false;
      const setting = current.flags[key];
      if (!setting?.enabled) return false;
      try {
        const { tenantId: tenant } = scopeFor(context, operation);
        if (!tenantId.test(tenant)) return false;
        const sample = createHash("sha256").update("businessos-rollout-v1\0" + key + "\0" + tenant).digest().readUInt32BE(0);
        return Math.floor(sample * 10_000 / 0x100000000) < setting.basisPoints;
      } catch {
        return false;
      }
    },
  });
}
