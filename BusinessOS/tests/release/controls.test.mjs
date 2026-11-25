import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { authorizeHttp } from "../../packages/execution-context/dist/index.js";
import { loadRolloutHistory, releaseFlags } from "../../apps/api/dist/release/flags.js";
import { requireAdditiveSql, requireAuditHistory, requireCurrentReview, requireDependencyAudit,
  requireMigrationHistory, requireReleaseChecks, requireScopedReleaseChecks } from "../../scripts/release/policy.mjs";
import { findings } from "../../scripts/release/sast.mjs";
import { rehearse } from "../../scripts/release/rehearsal.mjs";
import { imageEvidence } from "../../scripts/release/artifact.mjs";

const head = "a".repeat(40);
const previous = "b".repeat(40);
const release = "release.fixture";
const clean = Object.fromEntries(["quality", "supply", "integration", "review", "rehearsal"].map((key) => [key, { result: "success" }]));
const pr = { user: { login: "author-fixture" }, head: { sha: head } };
const review = {
  id: 1, user: { type: "User", login: "reviewer-fixture" }, state: "APPROVED",
  author_association: "MEMBER", commit_id: head,
};

test("REL-01 blocks each failed, skipped, cancelled or missing prerequisite", () => {
  assert.doesNotThrow(() => requireReleaseChecks(clean));
  for (const key of Object.keys(clean)) {
    for (const result of ["failure", "skipped", "cancelled", undefined]) {
      assert.throws(() => requireReleaseChecks({ ...clean, [key]: { result } }),
        { message: "RELEASE_CHECK_FAILED_" + key.toUpperCase() });
    }
  }
});

test("REL-01 leaves unrelated PRs outside BusinessOS and blocks unknown scope", () => {
  const scope = { result: "success" };
  assert.doesNotThrow(() => requireScopedReleaseChecks({ scope }, "false"));
  assert.doesNotThrow(() => requireScopedReleaseChecks({ scope, ...clean }, "true"));
  assert.throws(() => requireScopedReleaseChecks({ scope }, "true"), /RELEASE_CHECK_FAILED_QUALITY/);
  assert.throws(() => requireScopedReleaseChecks({ scope }, undefined), /RELEASE_SCOPE_UNAVAILABLE/);
  assert.throws(() => requireScopedReleaseChecks({}, "false"), /RELEASE_SCOPE_UNAVAILABLE/);
});

test("REL-01 requires current independent human review and respects a change request", () => {
  assert.doesNotThrow(() => requireCurrentReview(pr, [[review], [{ ...review, id: 2, state: "COMMENTED" }]]));
  const rejected = [
    [], [[{ ...review, commit_id: previous }]], [[{ ...review, state: "DISMISSED" }]],
    [[{ ...review, user: { ...review.user, login: "AUTHOR-FIXTURE" } }]],
    [[{ ...review, user: { ...review.user, type: "Bot" } }]],
    [[{ ...review, author_association: "CONTRIBUTOR" }]],
    [[review, { ...review, id: 2, user: { ...review.user, login: "another-fixture" }, state: "CHANGES_REQUESTED" }]],
  ];
  for (const pages of rejected) assert.throws(() => requireCurrentReview(pr, pages), { message: "REVIEW_REQUIRED" });
  assert.throws(() => requireCurrentReview(pr, {}), { message: "REVIEW_UNAVAILABLE" });
});

test("REL-01 enforces the dependency severity threshold and blocks unavailable advisory reports", () => {
  const report = (high, critical, moderate = 0) => ({
    metadata: { vulnerabilities: { info: 0, low: 0, moderate, high, critical } },
  });
  assert.doesNotThrow(() => requireDependencyAudit(report(0, 0)));
  assert.doesNotThrow(() => requireDependencyAudit(report(0, 0, 4), 1));
  assert.throws(() => requireDependencyAudit(report(1, 0), 1), { message: "DEPENDENCY_RISK" });
  assert.throws(() => requireDependencyAudit(report(0, 1)), { message: "DEPENDENCY_RISK" });
  assert.throws(() => requireDependencyAudit({ error: "offline" }, 1), { message: "DEPENDENCY_AUDIT_UNAVAILABLE" });
  assert.throws(() => requireDependencyAudit(report(0, 0), 1), { message: "DEPENDENCY_AUDIT_UNAVAILABLE" });
  assert.throws(() => requireDependencyAudit(report(0, 0, 4), 2), { message: "DEPENDENCY_AUDIT_UNAVAILABLE" });
  assert.throws(() => requireDependencyAudit(report(0, 0, "4"), 1), { message: "DEPENDENCY_AUDIT_UNAVAILABLE" });
});

test("REL-02 permits narrow additive SQL and rejects altered history and destructive statements", () => {
  const base = { "20261124000001_baseline": "CREATE TABLE tenant (id UUID PRIMARY KEY);" };
  const good = "BEGIN; CREATE TABLE file (id UUID PRIMARY KEY, tenant_id UUID REFERENCES tenant(id) ON DELETE RESTRICT);"
    + "CREATE INDEX file_tenant ON file (tenant_id); ALTER TABLE file ADD COLUMN public_label TEXT; COMMIT;";
  const name = "20261124000002_expand";
  assert.deepEqual(requireMigrationHistory(base, { ...base, [name]: good }), { baseline: 1, additive: 1 });
  assert.throws(() => requireMigrationHistory(base, { ...base, "20261124000001_baseline": good }), /HISTORY_CHANGED/);
  for (const sql of [
    "ALTER TABLE file ALTER COLUMN public_label SET NOT NULL;", "DROP TABLE tenant;",
    "DO $$ BEGIN DROP TABLE tenant; END $$;", "ALTER TABLE tenant ADD COLUMN public_label TEXT DEFAULT 'public';",
    "CREATE TABLE file AS SELECT * FROM tenant;", "TRUNCATE TABLE tenant;",
    "CREATE TABLE file (tenant UUID REFERENCES tenant(id) ON DELETE CASCADE);",
    "CREATE TABLE file (id UUID DEFAULT gen_random_uuid());",
    "CREATE UNIQUE INDEX tenant_label ON tenant (label);",
  ]) assert.throws(() => requireAdditiveSql(sql), /MIGRATION_SQL_/);
});

test("REL-02 flags preserve audit history and fail closed on malformed revisions", async () => {
  const baseline = JSON.parse(await readFile(new URL("../../infra/release/rollout.json", import.meta.url), "utf8"));
  const before = loadRolloutHistory(baseline);
  const next = { revision: 2, reason: "PILOT", flags: { [release]: { enabled: true, basisPoints: 2000 } } };
  const after = loadRolloutHistory({ ...baseline, history: [...baseline.history, next] });
  assert.doesNotThrow(() => requireAuditHistory(before, after));
  assert.throws(() => requireAuditHistory(after, before), /ROLLOUT_AUDIT_HISTORY_CHANGED/);
  assert.throws(() => loadRolloutHistory({ ...baseline, history: [...baseline.history, { ...next, revision: 3 }] }), /revision/);
});

async function context(tenantId, branchId, id) {
  const principal = { kind: "human", id, identityRef: "session-" + id };
  const operation = { resource: "fixture", action: "read", ownership: "branch" };
  const issued = await authorizeHttp(principal, operation, async () => ({
    principal, active: true, tenantId, membershipId: "membership-" + id, revision: "1",
    branch: { id: branchId, active: true, tenantId }, grants: [{ ...operation, scope: "BRANCH", branchId }],
  }));
  return { issued, operation };
}

test("REL-03 cohort membership follows the verified tenant across branch and session changes", async () => {
  const a = "10000000-0000-4000-8000-000000000001";
  const b = "20000000-0000-4000-8000-000000000001";
  const catalog = (bps) => releaseFlags({ schemaVersion: 1, history: [
    { revision: 1, reason: "BASELINE", flags: {} },
    { revision: 2, reason: "PILOT", flags: { [release]: { enabled: true, basisPoints: bps } } },
  ] }, [release]);
  const one = await context(a, "branch-a1", "actor-a");
  const two = await context(a, "branch-a2", "actor-b");
  const peer = await context(b, "branch-b1", "actor-c");
  const evalFlag = (catalog, fixture) => catalog.evaluate(release, fixture.issued, fixture.operation, true);
  let comparedDistinct = false;
  for (const bps of [0, 2000, 4000, 6000, 8000, 10000]) {
    const policy = catalog(bps);
    assert.equal(evalFlag(policy, one), evalFlag(policy, two));
    comparedDistinct ||= evalFlag(policy, one) !== evalFlag(policy, peer);
  }
  assert.equal(comparedDistinct, true);
  assert.equal(evalFlag(catalog(0), one), false);
  const policy = catalog(10000);
  assert.equal(evalFlag(policy, one), true);
  assert.equal(policy.evaluate(release, { ...one.issued }, one.operation, true), false);
  assert.equal(policy.evaluate(release, one.issued, one.operation, false), false);
  assert.equal(policy.evaluate("release.unknown", one.issued, one.operation, true), false);
  assert.equal(policy.evaluate(release, one.issued, { ...one.operation, action: "write" }, true), false);
});

test("REL-04 rehearsal keeps the prior image on a bad candidate and advances only after migration", async () => {
  function adapter(reject) {
    const calls = [];
    let active;
    return {
      calls,
      async prepare() { calls.push("prepare"); },
      async migrate() { calls.push("migrate"); if (reject === "migration") throw new Error("MIGRATION_FAILED"); },
      async activate(image) { active = image; calls.push(image); },
      async smoke() { calls.push("smoke-" + active); if (reject === active) throw new Error("NOT_READY"); },
      record(phase) { calls.push(phase); },
    };
  }
  const good = adapter();
  assert.equal(await rehearse(good, "prior", "candidate"), "candidate");
  assert.deepEqual(good.calls, [
    "prepare", "prior", "smoke-prior", "BASELINE_SMOKED", "migrate", "MIGRATION_APPLIED", "smoke-prior", "PRIOR_SCHEMA_COMPATIBLE",
    "candidate", "smoke-candidate", "CANDIDATE_SMOKED", "prior", "smoke-prior", "ROLLBACK_SMOKED",
    "candidate", "smoke-candidate", "ROLL_FORWARD_SMOKED",
  ]);
  const bad = adapter("candidate");
  await assert.rejects(rehearse(bad, "prior", "candidate"), /STAGING_CANDIDATE_FAILED/);
  assert.deepEqual(bad.calls.slice(-3), ["prior", "smoke-prior", "PRIOR_RESTORED"]);
  const broken = adapter("migration");
  await assert.rejects(rehearse(broken, "prior", "candidate"), /MIGRATION_FAILED/);
  assert.ok(!broken.calls.includes("candidate"));
});

test("REL-04 artifact metadata binds the candidate and rejects missing provenance", () => {
  const image = "sha256:" + "1".repeat(64);
  const metadata = { "containerimage.config.digest": image, "containerimage.digest": "sha256:" + "2".repeat(64),
    "buildx.build.provenance": { buildType: "fixture" } };
  assert.equal(imageEvidence(metadata, image, head).image, image);
  assert.throws(() => imageEvidence({ ...metadata, "buildx.build.provenance": {} }, image, head), /PROVENANCE_INVALID/);
});

test("REL-01 static analysis reports dynamic execution without executing its input", () => {
  assert.deepEqual(findings("fixture.ts", "const ok = /a/.exec(input)").map((item) => item.rule), []);
  assert.deepEqual(findings("fixture.ts", "eval(variable); childProcess.exec(variable);").map((item) => item.rule),
    ["DYNAMIC_CODE", "SHELL_EXEC"]);
});
