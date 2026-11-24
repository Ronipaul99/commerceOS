import assert from "node:assert/strict";
import { createHash, createSecretKey, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { Buffer } from "node:buffer";
import process from "node:process";
import { URL } from "node:url";
import { authorizeHttp, authorizeWrite } from "../../packages/execution-context/dist/index.js";
import { runTransaction } from "../../packages/database/src/index.ts";
import { fixtureUrl } from "../../packages/database/fixtures/target.mjs";
import { grantRuntimeAccess } from "../../packages/database/fixtures/cluster.mjs";
import { a1, b1, b2, seedFixtures } from "../../packages/database/fixtures/seed.mjs";
import { access, appendProbeEvent, defaultLimits, deliveryId } from "../../apps/worker/dist/outbox/index.js";

const dbRequire = createRequire(new URL("../../packages/database/package.json", import.meta.url));
const { PrismaPg } = dbRequire("@prisma/adapter-pg");
export const options = { lockDuration: 450, stalledInterval: 250, concurrency: 3, maxStalledCount: 1 };
export const limits = { ...defaultLimits, leaseMs: 350, reconcileMs: 75, maxAttempts: 3, backoffMs: 45 };
export const executor = { kind: "service", id: "fixture-consumer", identityRef: "synthetic-worker" };
export const dispatcher = { kind: "service", id: "fixture-relay", identityRef: "synthetic-relay" };

export function redisConnection() {
  const url = new URL(process.env.M0106_REDIS_URL ?? "");
  if (url.protocol !== "redis:" || url.hostname !== "127.0.0.1" || !url.port
      || url.username || url.password || (url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) {
    throw new Error("Use the dedicated loopback M01.06 Redis fixture.");
  }
  return { host: "127.0.0.1", port: Number(url.port), connectTimeout: 2000,
    retryStrategy: (times) => times <= 4 ? 100 : null, maxRetriesPerRequest: 1, commandTimeout: 5000 };
}

export function workerConnection() {
  return { ...redisConnection(), maxRetriesPerRequest: null, commandTimeout: undefined };
}

export async function prismaRuntime(url) {
  const { PrismaClient } = await import("../../packages/database/dist/fixture-client/client.ts");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: fixtureUrl(url, "runtime") }) });
}

export async function provision(owner, fixture) {
  await seedFixtures(owner);
  await grantRuntimeAccess(owner, fixture.runtimeUser);
  assert.match(fixture.runtimeUser, /^m0104_runtime_[a-f0-9]{12}$/);
  await owner.query(`
    GRANT SELECT, INSERT ON outbox_events TO ${fixture.runtimeUser};
    GRANT UPDATE (state, next_attempt_at, lease_token, lease_until, generation, dispatch_attempts,
      attempts_used, proof_digest, proof_expires_at, updated_at) ON outbox_events TO ${fixture.runtimeUser};
    GRANT SELECT, INSERT ON inbox_dedupes, job_failures, fixture_outbox_projection TO ${fixture.runtimeUser};
    GRANT UPDATE (effect_ref) ON inbox_dedupes TO ${fixture.runtimeUser};
  `);
}

const principalFor = (scope) => ({
  kind: "human", id: scope.branchId === a1.branchId ? "actor-a" : "actor-b",
  identityRef: "session-" + scope.branchId,
});

async function authority(tx, principal, scope, lock = false) {
  const [branch] = await tx.$queryRawUnsafe(
    "SELECT id FROM fixture_branch WHERE tenant_id = $1::uuid AND id = $2::uuid" + (lock ? " FOR SHARE" : ""),
    scope.tenantId, scope.branchId,
  );
  if (!branch) return undefined;
  const grants = principal.kind === "service" ? [access.apply] : [access.publish, access.inspect, access.replay];
  return {
    principal, tenantId: scope.tenantId, active: true, membershipId: principal.kind === "human" ? "fixture-membership" : undefined,
    branch: { id: branch.id, tenantId: scope.tenantId, active: true }, revision: "1",
    grants: grants.map((operation) => ({ ...operation, scope: "BRANCH", branchId: branch.id })),
  };
}

export async function reload(tx, auth) {
  return auth.scope.kind === "branch" ? authority(tx, auth.principal, {
    tenantId: auth.tenantId, branchId: auth.scope.branchId,
  }, true) : undefined;
}

export function consumerBinding(db, key, changes = {}) {
  return {
    executor,
    authenticateService: async () => executor,
    keyFor: async (id) => id === "test-key" ? key : undefined,
    resolve: (principal, selection) => authority(db, principal, selection),
    lockAuthority: reload,
    ...changes,
  };
}

export function keyFromEnvironment() {
  return createSecretKey(Buffer.from(process.env.M0106_TEST_PROOF_KEY, "base64"));
}

export function operator(db, scope, allowed = true) {
  const principal = principalFor(scope);
  return { authorize: (operation) => authorizeHttp(principal, operation, (actor) => allowed ? authority(db, actor, scope) : undefined),
    lockAuthority: reload };
}

export async function publish(db, scope, source, interrupted = false) {
  const principal = principalFor(scope);
  const context = await authorizeHttp(principal, access.publish, (actor) => authority(db, actor, scope));
  return runTransaction((command, options) => db.$transaction(command, options), async (tx) => {
    // Take the aggregate lock before authority recheck to avoid lock promotion between publishers.
    const [branch] = await tx.$queryRawUnsafe(
      "SELECT version FROM fixture_branch WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE",
      scope.tenantId, scope.branchId,
    );
    return authorizeWrite(tx, context, access.publish, reload, async (sql, where) => {
      assert.equal(where.tenantId, scope.tenantId);
      assert.equal(where.branchId, scope.branchId);
      const [existing] = await sql.$queryRawUnsafe(`
        SELECT e.event_id AS id FROM fixture_transaction_probe p
        JOIN outbox_events e ON e.tenant_id = p.tenant_id AND e.branch_id = p.branch_id AND e.payload->>'probeRef' = p.id::text
        WHERE p.tenant_id = $1::uuid AND p.branch_id = $2::uuid AND p.source_key = $3
      `, where.tenantId, where.branchId, source);
      if (existing) return existing.id;
      const probe = randomUUID();
      const version = branch.version + 1;
      await sql.$executeRawUnsafe(`
        UPDATE fixture_branch SET version = $3::int, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1::uuid AND id = $2::uuid
      `, where.tenantId, where.branchId, version);
      await sql.$executeRawUnsafe(`
        INSERT INTO fixture_transaction_probe (id, tenant_id, branch_id, source_key, request_fingerprint,
          currency_code, amount_minor, quantity, fixture_policy_key, policy_snapshot_revision)
        VALUES ($1::uuid,$2::uuid,$3::uuid,$4,repeat('a',64),'USD',9007199254740993,1.234567,'fixture-v1',1)
      `, probe, where.tenantId, where.branchId, source);
      const eventId = await appendProbeEvent(sql, context, version, probe);
      if (interrupted) throw new Error("Fixture producer interrupted.");
      return eventId;
    });
  }, { deadlineMs: 5000 });
}

export async function state(owner, id) {
  return (await owner.query(
    "SELECT event_id,state,generation,attempts_used,dispatch_attempts,lease_token,proof_digest,proof_expires_at FROM outbox_events WHERE event_id = $1", [id],
  )).rows[0];
}

export async function counts(owner, id) {
  return (await owner.query(`
    SELECT (SELECT count(*)::int FROM inbox_dedupes WHERE event_id = $1) AS receipt,
           (SELECT count(*)::int FROM fixture_outbox_projection WHERE event_id = $1) AS projection
  `, [id])).rows[0];
}

export async function putInvalidEvent(owner, scope, eventType, schemaVersion, payload) {
  const values = [randomUUID(), scope.tenantId, scope.branchId, eventType, schemaVersion,
    eventType === "fixture.probe_recorded" && schemaVersion === 1 ? scope.branchId : randomUUID(),
    randomUUID(), randomUUID(), payload];
  await owner.query(`
    INSERT INTO outbox_events (event_id,tenant_id,branch_id,event_type,schema_version,aggregate_type,
        aggregate_id,aggregate_version,correlation_id,causation_id,payload,consumer)
    VALUES ($1,$2,$3,$4,$5,'fixture.branch',$6,9999,$7,$8,$9,'fixture-projection')
  `, values);
  return values[0];
}

export async function branchDigest(owner, branch = b2) {
  const { rows } = await owner.query(`
    SELECT b.version AS branch_version,
      (SELECT count(*) FROM fixture_transaction_probe p WHERE p.branch_id=b.id AND p.tenant_id=b.tenant_id) AS probes,
      (SELECT count(*) FROM fixture_outbox_projection p WHERE p.branch_id=b.id AND p.tenant_id=b.tenant_id) AS effects
    FROM fixture_branch b WHERE b.tenant_id=$1::uuid AND b.id=$2::uuid
  `, [branch.tenantId, branch.branchId]);
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export async function queueState(queue, id, generation = 1) {
  return (await queue.observe(deliveryId(id, generation))).state;
}

export { a1, b1, b2 };
