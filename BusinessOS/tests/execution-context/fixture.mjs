import { createHash, randomUUID } from "node:crypto";
import { authorizeWrite, ContextError, scopeFor } from "../../packages/execution-context/dist/index.js";
import { runTransaction } from "../../packages/database/src/index.ts";
import { a1, b1, b2, seedFixtures } from "../../packages/database/fixtures/seed.mjs";
import { grantRuntimeAccess } from "../../packages/database/fixtures/cluster.mjs";

export const read = Object.freeze({ resource: "fixture-probe", action: "read", ownership: "branch" });
export const update = Object.freeze({ resource: "fixture-branch", action: "update", ownership: "branch" });
export const effect = Object.freeze({ resource: "fixture-probe", action: "record-effect", ownership: "branch" });
const amount = 9007199254740993n;
export const quantity = "1.234567";
const keys = [a1, b1, b2];
export const actors = keys.map((_scope, index) => ({
  kind: "human", id: index === 0 ? "actor-a" : "actor-b", identityRef: "session-" + index,
}));
export const executor = { kind: "service", id: "fixture-worker", identityRef: "worker-binding" };
export const operation = { issuer: "fixture-owner", audience: "fixture-worker", queue: "fixture", operation: "record-effect" };

export async function provision(owner, db) {
  await seedFixtures(owner);
  await grantRuntimeAccess(owner, db.runtimeUser);
  await owner.query(`
    CREATE TABLE fixture_execution_authority (
      identity_ref TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      membership_id TEXT NOT NULL,
      tenant_id UUID NOT NULL,
      branch_id UUID NOT NULL,
      revision INT NOT NULL DEFAULT 1,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      branch_active BOOLEAN NOT NULL DEFAULT TRUE,
      lock_hint BOOLEAN NOT NULL DEFAULT FALSE,
      FOREIGN KEY (tenant_id, branch_id) REFERENCES fixture_branch (tenant_id, id)
    )
  `);
  await owner.query(`GRANT SELECT ON fixture_execution_authority TO ${db.runtimeUser}`);
  await owner.query(`GRANT UPDATE (lock_hint) ON fixture_execution_authority TO ${db.runtimeUser}`);
  const ids = [];
  for (const [index, scope] of keys.entries()) {
    const actor = actors[index];
    await owner.query(`
      INSERT INTO fixture_execution_authority (identity_ref, actor_id, membership_id, tenant_id, branch_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [actor.identityRef, actor.id, "membership-" + actor.id, scope.tenantId, scope.branchId]);
    const id = randomUUID();
    ids.push(id);
    await owner.query(`
      INSERT INTO fixture_transaction_probe (
        id, tenant_id, branch_id, source_key, request_fingerprint, currency_code,
        amount_minor, quantity, fixture_policy_key, policy_snapshot_revision
      )
      VALUES ($1, $2, $3, 'LOCAL', repeat('a',64), 'USD', $4, $5, 'fixture-v1', 1)
    `, [id, scope.tenantId, scope.branchId, amount, quantity]);
  }
  return ids;
}

export function openAuthority(Prisma) {
  return async (client, principal, lock = false) => {
    const [row] = await client.$queryRaw`
      SELECT identity_ref, actor_id, membership_id, tenant_id, branch_id, revision, active, branch_active
      FROM fixture_execution_authority
      WHERE identity_ref = ${principal.identityRef} AND actor_id = ${principal.id}
      ${lock ? Prisma.sql`FOR SHARE` : Prisma.empty}
    `;
    if (!row) return undefined;
    return {
      principal: { kind: "human", id: row.actor_id, identityRef: row.identity_ref },
      membershipId: row.membership_id, active: row.active, tenantId: row.tenant_id,
      branch: { tenantId: row.tenant_id, id: row.branch_id, active: row.branch_active },
      revision: String(row.revision),
      grants: [read, update, effect].map((access) => ({ ...access, scope: "BRANCH", branchId: row.branch_id })),
    };
  };
}

function branchFilter(scope) {
  // These fixture objects have no employee owner column.
  if (!scope.branchId || scope.ownerId !== undefined) throw new ContextError("FORBIDDEN");
  return { tenantId: scope.tenantId, branchId: scope.branchId };
}

export function repository(client, authority) {
  const transaction = (command, options) => client.$transaction(command, options);
  const recheck = (tx, auth) => authority(tx, auth.principal, true);
  const budget = { deadlineMs: 5000 };
  return {
    read(context, id) {
      return client.transactionProbe.findFirst({
        where: { AND: [branchFilter(scopeFor(context, read)), { id }] },
        select: { id: true, sourceKey: true, version: true },
      });
    },
    count(context) {
      return client.transactionProbe.count({ where: branchFilter(scopeFor(context, read)) });
    },
    update(context, id, version) {
      return runTransaction(transaction, (tx) => authorizeWrite(tx, context, update, recheck, (db, scope) => {
        const { tenantId, branchId } = branchFilter(scope);
        return db.branch.updateMany({
          where: { AND: [{ tenantId, id: branchId }, { id, version }] },
          data: { version: { increment: 1 }, updatedAt: new Date() },
        });
      }), budget);
    },
    apply(context, input) {
      return runTransaction(transaction, (tx) => authorizeWrite(tx, context, effect, recheck, async (db, scope) => {
        if (context.origin.source !== "worker" || input !== "fixture-effect") throw new ContextError("FORBIDDEN");
        const { tenantId, branchId } = branchFilter(scope);
        const source = "record-effect:" + context.origin.jobId;
        const fingerprint = createHash("sha256").update(input).digest("hex");
        const created = await db.$executeRaw`
          INSERT INTO fixture_transaction_probe (
            id, tenant_id, branch_id, source_key, request_fingerprint, currency_code,
            amount_minor, quantity, fixture_policy_key, policy_snapshot_revision
          ) VALUES (
            ${randomUUID()}::uuid, ${tenantId}::uuid, ${branchId}::uuid, ${source}, ${fingerprint},
            'USD', ${amount}, ${quantity}::numeric, 'fixture-v1', 1
          )
          ON CONFLICT (tenant_id, branch_id, source_key) DO NOTHING
        `;
        const record = await db.transactionProbe.findUnique({
          where: { tenantId_branchId_sourceKey: { tenantId, branchId, sourceKey: source } },
        });
        if (record?.requestFingerprint !== fingerprint) throw new ContextError("FORBIDDEN");
        return { id: record.id, replayed: created === 0 };
      }), budget);
    },
  };
}

export async function snapshot(owner, where) {
  const { rows } = await owner.query(`
    SELECT 'branch' AS kind, id, tenant_id, id AS branch_id, code AS source,
           version, NULL AS amount, NULL AS quantity
    FROM fixture_branch WHERE tenant_id = $1 AND ($2::uuid IS NULL OR id = $2)
    UNION ALL
    SELECT 'probe', id, tenant_id, branch_id, source_key, version, amount_minor::text, quantity::text
    FROM fixture_transaction_probe WHERE tenant_id = $1 AND ($2::uuid IS NULL OR branch_id = $2)
    ORDER BY kind, id
  `, [where.tenantId, where.branchId ?? null]);
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}
