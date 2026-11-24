import { createHash, randomUUID } from "node:crypto";
import { parseMinorUnits, parseQuantity, runTransaction } from "../src/index.ts";
import { a1, b1, b2 } from "./seed.mjs";

const scopes = new Set([a1, b1, b2]);

function enforceScope(scope) {
  if (!scopes.has(scope)) throw new Error("An authorized fixture scope is required.");
}

function lookup(scope, sourceKey) {
  enforceScope(scope);
  return { tenantId_branchId_sourceKey: { ...scope, sourceKey } };
}

export function getProbe(client, scope, sourceKey) {
  return client.transactionProbe.findUnique({ where: lookup(scope, sourceKey) });
}

export function advanceBranch(client, scope, branchId, expectedVersion) {
  enforceScope(scope);
  return client.branch.updateMany({
    where: {
      tenantId: scope.tenantId,
      id: { equals: scope.branchId, in: [branchId] },
      version: expectedVersion,
    },
    data: { version: { increment: 1 }, updatedAt: new Date() },
  });
}

function validateProbe(input) {
  const { sourceKey } = input;
  if (typeof sourceKey !== "string" || !/^[a-z0-9-]{1,40}(?![\s\S])/.test(sourceKey)) {
    throw new TypeError("Use a short fixture source key.");
  }
  const amount = parseMinorUnits(input.amount);
  const quantity = parseQuantity(input.quantity);
  if (quantity === "0" || quantity.startsWith("-")) throw new RangeError("Fixture quantity must be positive.");
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([amount.toString(), quantity, "USD", 1])).digest("hex");
  return { sourceKey, amount, quantity, fingerprint };
}

export function postProbe(client, scope, input) {
  enforceScope(scope);
  const { sourceKey, amount, quantity, fingerprint } = validateProbe(input);
  return runTransaction((work, options) => client.$transaction(work, options), async (tx) => {
    const { tenantId, branchId } = scope;
    const inserted = await tx.$executeRaw`
      INSERT INTO fixture_transaction_probe (
        id, tenant_id, branch_id, source_key, request_fingerprint, currency_code,
        amount_minor, quantity, fixture_policy_key, policy_snapshot_revision
      ) VALUES (
        ${randomUUID()}::uuid, ${tenantId}::uuid, ${branchId}::uuid, ${sourceKey},
        ${fingerprint}, 'USD', ${amount}, ${quantity}::numeric, 'fixture-v1', 1
      )
      ON CONFLICT (tenant_id, branch_id, source_key) DO NOTHING
    `;
    const record = await getProbe(tx, scope, sourceKey);
    if (!record || record.requestFingerprint !== fingerprint) throw new Error("Fixture source key conflict.");
    return { record, replayed: inserted === 0 };
  }, { deadlineMs: 5000 });
}

export async function postExpandedProbe(pool, scope, input) {
  enforceScope(scope);
  const { sourceKey, amount, quantity, fingerprint } = validateProbe(input);
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    const result = await insertLegacyProbe(connection, scope, sourceKey, { amount, quantity, fingerprint });
    await connection.query("COMMIT");
    return result;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}

export async function insertLegacyProbe(connection, scope, sourceKey, options = {}) {
  const {
    policy = "fixture-v1", amount = "9007199254740993", quantity = "1.234567",
    fingerprint = "a".repeat(64), revision,
  } = options;
  const columns = revision === undefined ? "" : ", policy_snapshot_revision";
  const values = revision === undefined ? "" : ", $9";
  const params = [
    randomUUID(), scope.tenantId, scope.branchId, sourceKey, fingerprint, amount, quantity, policy,
  ];
  if (revision !== undefined) params.push(revision);
  const { rows } = await connection.query(`
    INSERT INTO fixture_transaction_probe (
      id, tenant_id, branch_id, source_key, request_fingerprint,
      currency_code, amount_minor, quantity, fixture_policy_key${columns}
    )
    VALUES ($1, $2, $3, $4, $5, 'USD', $6, $7, $8${values})
    RETURNING id, tenant_id, branch_id, source_key, amount_minor::text, quantity::text, currency_code, version
  `, params);
  return rows[0];
}
