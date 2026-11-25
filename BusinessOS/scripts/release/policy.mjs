import { isDeepStrictEqual } from "node:util";

const hash = /^[0-9a-f]{40}$/;
const migrationName = /^\d{14}_[a-z0-9_]+$/;
const reviewerAssociations = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

export function requireCurrentReview(pr, pages) {
  if (!pr?.head?.sha || !hash.test(pr.head.sha) || !pr.user?.login || !Array.isArray(pages)
    || !pages.every(Array.isArray)) throw new Error("REVIEW_UNAVAILABLE");
  const effective = new Map();
  for (const review of pages.flat().sort((a, b) => a.id - b.id)) {
    const user = review?.user;
    if (user?.type !== "User" || typeof user.login !== "string"
      || user.login.toLowerCase() === pr.user.login.toLowerCase()
      || !reviewerAssociations.has(review.author_association)
      || !["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(review.state)) continue;
    effective.set(user.login.toLowerCase(), review);
  }
  if ([...effective.values()].some((review) => review.state === "CHANGES_REQUESTED")
      || ![...effective.values()].some((review) => review.state === "APPROVED" && review.commit_id === pr.head.sha)) {
    throw new Error("REVIEW_REQUIRED");
  }
}

export function requireDependencyAudit(report, status = 0) {
  const totals = report?.metadata?.vulnerabilities;
  const severities = ["info", "low", "moderate", "high", "critical"];
  if (![0, 1].includes(status) || report?.error || !totals
      || !severities.every((key) => Number.isSafeInteger(totals[key]) && totals[key] >= 0)
      || (status === 1 && !severities.some((key) => totals[key] > 0))) {
    throw new Error("DEPENDENCY_AUDIT_UNAVAILABLE");
  }
  if (totals.high + totals.critical > 0) throw new Error("DEPENDENCY_RISK");
}

export function requireReleaseChecks(results) {
  for (const name of ["quality", "supply", "integration", "review", "rehearsal"]) {
    if (results?.[name]?.result !== "success") throw new Error("RELEASE_CHECK_FAILED_" + name.toUpperCase());
  }
}

export function requireScopedReleaseChecks(results, affected) {
  if (results?.scope?.result !== "success" || !["true", "false"].includes(affected)) {
    throw new Error("RELEASE_SCOPE_UNAVAILABLE");
  }
  if (affected === "true") requireReleaseChecks(results);
}

function statements(sql) {
  if (typeof sql !== "string" || !sql.length || sql.length > 400_000
      || /[^\t\n\r -~]/u.test(sql)) throw new Error("MIGRATION_SQL_UNSUPPORTED");
  // Replace strings and line comments before recognizing statement boundaries and keywords.
  return sql.replace(/'(?:[^']|'')*'|--[^\r\n]*/g, (token) => token[0] === "'" ? " <literal> " : " ")
    .split(";").map((statement) => statement.trim().replace(/\s+/g, " ").toUpperCase()).filter(Boolean);
}

export function requireAdditiveSql(sql) {
  const identifier = "[A-Z_][A-Z0-9_]*";
  const type = "(?:UUID|BOOLEAN|TEXT|INTEGER|BIGINT|TIMESTAMPTZ(?:\\([0-6]\\))?|VARCHAR\\([1-9][0-9]{0,4}\\))";
  const reference = "REFERENCES " + identifier + " *\\(" + identifier + "\\)"
    + "(?: ON (?:DELETE|UPDATE) (?:RESTRICT|NO ACTION))*";
  const column = identifier + " " + type + "(?: NOT NULL)?(?: PRIMARY KEY| UNIQUE| " + reference + ")?";
  const createTable = new RegExp("^CREATE TABLE " + identifier + " \\(" + column + "(?: *, *" + column + ")*\\)$");
  const createIndex = new RegExp("^CREATE INDEX (?:CONCURRENTLY )?" + identifier
    + " ON " + identifier + " \\(" + identifier + "(?: *, *" + identifier + ")*\\)$");
  const nullableColumn = new RegExp("^ALTER TABLE " + identifier + " ADD COLUMN " + identifier
    + " " + type + "$");
  const parsed = statements(sql);
  if (!parsed.length || !parsed.some((statement) => statement !== "BEGIN" && statement !== "COMMIT")) {
    throw new Error("MIGRATION_SQL_UNSUPPORTED");
  }
  for (const statement of parsed) {
    if (statement === "BEGIN" || statement === "COMMIT") continue;
    if (createTable.test(statement) || createIndex.test(statement) || nullableColumn.test(statement)) continue;
    throw new Error("MIGRATION_SQL_UNSAFE");
  }
}

export function requireMigrationHistory(before, after) {
  const baseline = Object.keys(before).sort();
  const candidate = Object.keys(after).sort();
  if (!baseline.length || candidate.some((name) => !migrationName.test(name))) throw new Error("MIGRATION_HISTORY_INVALID");
  for (const [index, name] of baseline.entries()) {
    if (name !== candidate[index] || before[name] !== after[name]) throw new Error("MIGRATION_HISTORY_CHANGED");
  }
  for (const name of candidate.slice(baseline.length)) requireAdditiveSql(after[name]);
  return { baseline: baseline.length, additive: candidate.length - baseline.length };
}

export function requireAuditHistory(before, after) {
  if (before.length > after.length || before.some((entry, index) => !isDeepStrictEqual(entry, after[index]))) {
    throw new Error("ROLLOUT_AUDIT_HISTORY_CHANGED");
  }
}
