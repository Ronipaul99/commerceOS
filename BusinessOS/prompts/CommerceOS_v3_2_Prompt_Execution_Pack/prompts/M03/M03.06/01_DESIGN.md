# M03.06 — Reservation and release state machine — Design

**CommerceOS prompt execution pack v3.2** · **Stage:** Design · **Work item:** `M03.06` · **Milestone:** M03: Native catalog and authoritative inventory  
**Master trace:** `INV-003` · **Applicable milestone gate:** RG2 inventory  
**Feature scope policy:** Stock ledger transactional correctness is mandatory; never cache authority

Mandatory sources (read from the repository, not from memory):
1. `source_v3_1/MASTER_BLUEPRINT.md` (sole authority, v3.0.0).
2. `AGENTS.md` (original binding engineering agent policy).
3. `source_v3_1/ENGINEERING_EXECUTION_ROADMAP.md` (v3.1 implementation companion).
4. `source_v3_1/WORK_ITEMS.csv` (exact work-item row).
5. `source_v3_1/MILESTONE_GATES.md` (derived milestones; master wins).
6. `PROMPT_OPERATING_RULES.md` and `TECHNOLOGY_DECISIONS_STATUS.md`.
If any named source is missing, unreadable, or contradictory, stop and report; never replace it with guesses.

## The exact work item (source-derived)

**Source implementation actions:**
- Reserve available SKU in DB transaction.
- release/consume/expire with unique business source, TTL and separate on-hand/held calculations.
- use DB locking or proven atomic CAS.

**Source contracts / data / UI deliverables:**
- Reservations, stock availability API and expiry job.
- conflict/status UI.

**Source risk and scaling controls:**
- 50 concurrent reservations for one unit yield one winner.
- retries, cancel/convert race and worker crash not oversell.

**Source acceptance evidence:** INV-AC1/2 and SC-02 pass with ledger reconciliation.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Two staff try to hold the final one-piece SKU: exactly one reservation succeeds.

**Mandatory adversarial/exception exercise:** Fifty concurrent requests, expiry/consume race, duplicate release and worker crash.

## Non-negotiable constraints

Non-negotiable engineering constraints:
- NestJS modular monolith, TypeScript, PostgreSQL/Prisma, Redis/BullMQ; durable transactional outbox and idempotent consumers. Use declared domain facades instead of direct cross-module mutations.
- Trusted tenant from verified actor/credential context; tenant-safe FKs, branch/action/field policy, deny-by-default authorization in controllers, services and workers. Never trust a tenantId from the body.
- PostgreSQL is authoritative for money, stock, usage and finalized payroll; Redis and read projections are never their source of truth. Integer minor currency units and decimal-safe quantities. Track invariants in tests.
- Every sensitive mutation must define idempotency, version/conflict behavior, transaction scope, audit and outbox impact. No external network calls inside a DB transaction. No unbounded retries.
- Mask PII/secrets in APIs, logs, metrics, export, object links and jobs. Handle rate limits, abuse, timeouts and backpressure.
- Domain read models may be eventually consistent but must disclose freshness. Plan bounded pagination and indexes for tenant filters; never assert performance without measurements.
- Production rollout requires explicit release gates and a real reviewer. No test command/result may be claimed unless executed.
- Native storefront/editor, offline authoritative POS, external catalog/inventory/OMS replacement, generic ledger/accounting and unapproved automation money/stock/payroll actions are out of scope.
- Technology decisions not explicitly locked in v3 remain proposals; do not independently choose provider, auth method, price limits, statutory rates or cloud capacity. Record ADR proposal and block dependent work.


## How this feature must work end-to-end

- **Actor/operational journey:** Product configuration to available stock, hold, count/adjustment, transfer and stock alert.
- **Data and aggregate boundary:** Immutable movement source, balance projection, per-SKU/location locking, reservations and versioned pricing.
- **Security/tenancy/privacy:** Stock adjustment approval; branch access and SKU/media isolation; prevent client-authoritative price or stock.
- **Scale/reliability:** Hot SKU contention, short DB transactions, deterministic lock order, row/index efficiency, async projections.
- **UI and usability:** Stock availability explanation, conflicts, audit journals, approval and batch progress states.
- **Test emphasis:** Last-one-unit 50-way contention, duplicate job, ledger reconciliation, disabled branch and concurrency.
- **Feature-specific deep check:** Describe the exact balance equation and locking/conditional-update strategy; include simultaneous final-SKU mutation and audit projection rebuild. Simulate idempotent retries and out-of-order release/consume.

**Scope isolation:** Work on `M03.06` only. Previous work item: `M03.05`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: DESIGN ONLY

Prepare/refresh `docs/features/M03.06/DESIGN.md` with these exact sections:
1. Source mapping and decision/gate register, stating CONFIRMED vs PROPOSED vs BLOCKED.
2. User/actor journeys (primary, alternate, reversal), permissions by tenant/branch/field, and realistic UX wireflow/screen states. For non-UI infrastructure items document operator/developer journey instead.
3. Domain model/aggregate boundaries, state diagrams/command transition table, invariants and edge cases. Identify which domain owns each write.
4. Proposed database entities, fields/types, keys, tenant-safe FKs, unique/check constraints, indexes, data lifecycle, migration and backfill. Use 'not applicable' explicitly for documentation-only items.
5. Proposed REST/OpenAPI commands, DTO validation, error codes, pagination, idempotency/version behavior and generated-client impact; internal facades/events and schema versioning.
6. Transaction/consistency model, retry/backoff/DLQ or eventual-read semantics; classify all external side effects and failure compensation.
7. Security threat model: BOLA/BFLA, mass assignment, data leakage, abuse, spoofing, replay, excessive rights, provider/files as applicable. Tests for unauthorized second tenant.
8. Scalability/load model: expected access pattern, hot records, indexes, N+1 budget, tenant fairness, concurrency strategy, memory/job limits and unknown capacity assumptions.
9. Frontend UI/accessibility/loading/empty/offline-stale/error/permission states (or explain N/A).
10. Automated test matrix (unit, real-Postgres integration, API contract, UI E2E, concurrency, security, load/failure) tailored to this item, with exact assertions and fixtures.
11. Observability: structured logs without secrets, event correlation, metrics/alerts, runbook, flags, incremental rollout and rollback plan.
12. A *copyable* approval checklist listing each open choice and reviewer signature needed before implementation.
Only produce a design and decision proposal. Do not add application code, migrations or live configuration at design stage.

## Special design decisions to resolve for this feature

Write explicit values or mark unresolved (never silently default): request limits, entitlements, roles, effective dates, failure/retry semantics, tradeoffs, indexes, error codes, accessible UI states, approved regulatory/payment/provider dependencies. Base them on documented requirements and real repository capabilities, not guesses.

**Design-stage completion:** Create exact diagrams and sample valid/invalid payloads where relevant; an illustrative test plan with assertion inputs; proposed API and migration diff; decision blockers. For `M00` and audit-focused `M08`, replace irrelevant implementation artifacts with a signed evidence protocol. Final line: `STATUS: AWAITING HUMAN DESIGN APPROVAL`. STOP here.
