# M01.04 Database migrations and transaction toolkit

## 1. Scope and boundaries

**State** PROPOSED. **Implementation** Pending explicit M01.04 design approval. This item defines a Prisma migration baseline, scoped transaction toolkit, exact money and quantity primitives, and a repeatable verification path on disposable PostgreSQL. Developers need a reviewed way to advance schema. QA needs isolated Tenant A/B fixtures for constraint, migration and contention checks. No product tables for future domains, provider interactions, legal rules, billing, inventory operations or UI are required. Fixture checks are internal synthetic evidence. [M01.04 prompt](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.04.md) · [Master consistency rules](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#163-data-consistency-and-asynchronous-behavior)

## 2. Primary and alternate journeys

On a disposable PostgreSQL instance, validate and generate the Prisma client, then apply the checked-in fixture bootstrap and expansion. Seed fictional Tenant A at A1 and Tenant B at B1 and B2 with deterministic UUIDs. A fixture command posts an integer minor-unit amount and a decimal quantity within one verified tenant/branch. Run the same command again and verify there was one committed effect. Verify that a thrown operation leaves no rows or consumed business key. Apply the next migration, verify the backfill against the original values, and test rollback of the compatible application revision. A second run starts from a fresh database and applies the complete chain. Missing config, a failed migration, incomplete backfill, an invalid value or a cross-scope reference must fail visibly. UI, user onboarding and business approval flows are **NOT_APPLICABLE**.

## 3. Domain and data ownership

The database toolkit owns migration tooling, a typed transaction runner and value primitives. Application owners supply their own scoped repository and business command. The toolkit exposes no generic ID-only lookup and no caller-controlled tenant or branch context. The fixtures exercise the interfaces without changing the M01.02 `local_fixture` schema, M01.03 HTTP transport, or future identity, outbox and domain ownership. Plan the database module as an internal server dependency. Keep the disposable migration chain and seed entry point separate from production migration inputs. [Ownership design](../M00.02/DESIGN.md) · [Local fixture setup](../M01.02/DESIGN.md) · [HTTP command boundary](../M01.03/DESIGN.md)

## 4. Persistence and migration strategy

### Proposed fixture models

| Fixture | Columns | Constraints and query shape |
|---|---|---|
| Tenant | UUID ID, label, UTC `created_at` and `updated_at`, positive integer version | Primary key by ID. Fixed test IDs for A and B. |
| Branch | UUID ID, tenant UUID, branch code, UTC timestamps, positive integer version | Composite unique `(tenant_id,id)` for references and unique `(tenant_id,code)`. Tenant FK with restrictive deletion. |
| Transaction probe | UUID ID, tenant and branch UUID, source key, SHA-256 request fingerprint, currency code, `amount_minor BIGINT`, `quantity NUMERIC(20,6)`, UTC timestamps, positive version, policy snapshot revision | Composite FK `(tenant_id,branch_id)` to Branch, composite uniqueness on `(tenant_id,id)`, one source effect by `(tenant_id,branch_id,source_key)`. Tenant/branch/source indexes follow those keys. Append-only probe effects and no cascading deletion. |

Represent UUIDs and timestamps as PostgreSQL UUID and `TIMESTAMPTZ`. Use database-generated timestamps stored as UTC instants. Bump the version and set the update time in the same guarded write for mutable metadata. A stale version or wrong scope yields zero affected rows. Compare indexes with the intended lookup shape and record plans with realistic fixtures before drawing performance conclusions. The probe models the integrity contract only. Future tenant, branch and financial schemas belong to their approved domain work items. [Master data model](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#17-data-model-and-schema-migration-guidance)

### Type and range rules

- Money input is a canonical signed integer string converted directly to `bigint`. Validate signed 64-bit storage bounds and check arithmetic for overflow. Do not pass money through JavaScript `number`. Keep amounts associated with an explicit currency. Currency exponent and rounding come from a reviewed policy in later domain operations. Fixture amounts use synthetic minor units and do not assert rates or fees.
- Quantity input is a canonical decimal string with at most 14 integer digits and six fractional digits, for conversion to Prisma's exact Decimal type. Check scale and magnitude before database coercion. PostgreSQL rounds input to a declared numeric scale, so application rejection of excess precision requires a test before insertion. SQL asserts the stored value's range and excludes non-finite values. Domain policy chooses allowed sign and unit. The fixture enforces its chosen valid quantity and tests rejection. [PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html)
- Versioned state uses a scoped compare-and-update or a row lock within the same transaction as the effect. Fingerprint normalized validated input and the version precondition, excluding fields managed by migrations. A repeated operation with the same scope, key and fingerprint reads the committed fixture result even after the policy metadata backfill. Changed reuse is a conflict. The unique index is the persistent race guard. Treat constraint violations as outcomes and reconcile only after the rejected transaction rolls back.

### Expand, backfill, switch and rollback

1. Establish the fixture baseline and run an additive migration that introduces a nullable policy snapshot revision. Seed an old-shape row with a known synthetic policy association and run the transaction probe against the expanded schema.
2. Backfill the revision from the explicit versioned fixture policy association. Verify row count, original amount, quantity, currency, scope and source key. Re-run the backfill and prove the same result. Abort tightening if any row remains unmapped. Phase the fixture releases so these validations occur between expansion and tightening.
3. Switch the test writer to supply the revision, verify compatibility, and enforce non-null in the final migration. For a future concurrent production rollout, use compatible writers or pause affected writes before the final validation and tightening. No production backfill is approved here.
4. Prove the prior compatible reader and writer against the expanded schema. After tightening, use the compatible writer, a forward repair, or an approved snapshot restore based on a rehearsed runbook. Run the disposable restore rehearsal from a pre-change snapshot and reapply the chain. Keep applied migration history immutable.

Use a pinned, compatible Prisma ORM release with the committed migration history. The proposed Prisma 7 approach uses `prisma migrate deploy` for noninteractive application and checks schema parity separately. The implementation will verify the exact tool versions when dependencies are available. Run migrations through a direct connection with a dedicated migration role. Application access uses separate, limited runtime credentials. A migration status check alone does not detect schema drift, so CI must compare the final catalog and required constraints to the expected schema. [Prisma migration workflows](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)

## 5. Contracts

REST/OpenAPI, generated HTTP clients, UI and events are **NOT_APPLICABLE**. Internal commands receive already-resolved tenant and branch UUIDs, validated inputs and a source key. The transaction helper accepts an authorized, database-only callback and returns the committed result. Callers distinguish stale-version conflict, duplicate-effect replay, conflicting source-key reuse, and retry exhaustion. Quantity and amount remain exact through serialization and comparisons. No demo endpoint is planned.

## 6. Security and privacy

| Actor | Allowed access |
|---|---|
| Migration process | Direct connection and schema-specific DDL rights for the intended database. Check the target before mutation. |
| Runtime command | Limited data privileges. All lookups and effects use the verified tenant/branch scope. No schema and no cross-tenant ownership rights. |
| CI fixture runner | Unique disposable database, fictional Tenant A/B, approved seed and probe commands. No staging or production connection inherited from the host. |

Prove a mismatched composite reference fails in PostgreSQL. Separately verify that scoped reads and updates cannot see or change the other tenant or branch. A foreign key proves referential integrity without conferring application access. The M01.05 work item owns construction of verified context. RLS would need its own review. Keep raw connection URLs, payloads and real tenant information out of test fixtures and logs. Future provider, cookie and webhook controls are outside this slice.

## 7. Concurrency, retries and recovery

Use interactive `Serializable` transactions for the probe and pass the transaction client into the scoped command. Keep callbacks short and database-only. If multiple rows must be locked, order acquisition by stable tenant/branch/resource keys. The intentional deadlock test may invert that order only in the disposable fixture. Make retries bounded. The proposed test default is at most three attempts, with jittered 25–100 ms waits and a caller deadline. Use the known transaction-conflict/deadlock signal (`P2034` or tested driver mapping for PostgreSQL `40001`/`40P01`). Verify the pinned adapter's actual mapping. Reject or surface lock-timeout, permission, validation and ambiguous commit failures instead of retrying blindly. A duplicate caller operation resolves by its original durable key and committed result. Allocate an explicit lock timeout and transaction timeout in the test harness. Production budgets need G-11 evidence. [Prisma transaction retry guidance](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)

## 8. Verification plan

| ID | Planned check | Required outcome |
|---|---|---|
| DB-01 | Fresh PostgreSQL, empty database, migrate and seed twice | Clean checked-in chain applies without drift; seed is idempotent. |
| DB-02 | Stage the expansion, commit a transaction probe, and migrate through backfill and tightening | Original values and scope match. The revision is populated for every known row. Re-run changes nothing. Unknown policy blocks tightening. |
| DB-03 | Fractional/overflow minor units, excess precision, NaN and quantity overflow | Invalid input rejected before effect. SQL checks reject invalid stored quantity and preserve exact valid decimals. |
| DB-04 | Same alias across tenants, wrong tenant/branch FK, missing scope, concurrent duplicate and changed source key | Each permitted tenant stays independent. Invalid references and scope fail. One effect per scoped key and conflicting reuse fails. |
| DB-05 | First write then throw, stale version, lock contention, coordinated deadlock and serialization conflict | Atomic rollback, bounded waiting, typed conflict, bounded retry on the confirmed signal, and once-only committed effect. Verify non-retryable and exhausted paths. |
| DB-06 | Prior compatible writer on expansion, disposable snapshot restore and second forward migration | Prove repeatability, original values, and expected compatibility boundary without rewriting applied history. |

Use unit tests for numeric parsing and retry selection. Use real disposable PostgreSQL and a fresh connection for database outcomes and two coordinated independent sessions for locking. CI should provision PostgreSQL and run the checks against the locked migration inputs. The local shell currently has no Docker engine or PostgreSQL CLI. Container execution is pending a capable environment. No PostgreSQL, CI, performance or restore result is claimed. [M01.02 verification](../M01.02/VERIFICATION.md) · [M01.03 verification](../M01.03/VERIFICATION.md)

## 9. Operations

Proposed outputs are a migration runner, disposable seed, application toolkit, database tests and dedicated CI job, limited to M01.04. Record the target class, migration revision, success/failure, elapsed time and redacted retry outcome. Never log database passwords or raw DSNs. If deployment or backfill fails, stop at its recorded phase, inspect applied history and row checks, preserve recovery evidence and use the rehearsed compatible rollback or approved restore. No live database operation or staging deployment is in this design phase.

## 10. Decision log and approval

| State | Decision |
|---|---|
| CONFIRMED | RG0 is approved and ADR-003/004 define PostgreSQL/Prisma and composite tenant boundaries. ADR-024 preserves the relevant toolchain, including conditional PgBouncer and a direct migration path when pooling is configured. |
| PROPOSED | Adopt the fixture-only schema example, bounded retry policy, explicit expansion/backfill checkpoints and separate migration/runtime roles described above. |
| BLOCKED | M01.04 requires explicit human approval of this design before implementation and a separate reviewer before merge. A live rollout and operational targets remain subject to their gates. Docker/PostgreSQL execution evidence and prior-item reviews are separately tracked. |

[RG0 signoff](../../RG0_SIGNOFF.md) · [ADR-024](../../adr/ADR-024.md) · [Decision gates](../M00.05/DECISIONS_LOG.md#gate-register)
