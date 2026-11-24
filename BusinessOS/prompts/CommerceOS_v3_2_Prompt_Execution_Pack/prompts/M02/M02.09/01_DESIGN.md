# M02.09 — Employee invites and assignment baseline — Design

**CommerceOS prompt execution pack v3.2** · **Stage:** Design · **Work item:** `M02.09` · **Milestone:** M02: Identity and guided merchant onboarding  
**Master trace:** `WF-001; OWN-003` · **Applicable milestone gate:** RG1  
**Feature scope policy:** Use secure identity/tenant setup and onboarding domain; no orders/payments

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
- Invite staff, link employee record to optional identity, assign branches/roles and revoke access.
- preserve historic order attribution after termination.

**Source contracts / data / UI deliverables:**
- Invites, employees, branch assignments and role UI.

**Source risk and scaling controls:**
- Invite expiry/reuse, stolen link, revoked sessions, salary fields hidden from cashier.

**Source acceptance evidence:** Staff can operate permitted branch after invite and loses access on revocation.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Invite employee, accept scoped invitation and assign branch roles with expiry.

**Mandatory adversarial/exception exercise:** Block reused invitation, wrong-tenant acceptance, offboarded access and role overreach.

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

- **Actor/operational journey:** Merchant registration to active workspace through invited employee and completed/resumable setup.
- **Data and aggregate boundary:** Tenant/membership/branch/role/setting/import with tenant-safe FK, uniqueness, versions, audited updates.
- **Security/tenancy/privacy:** BOLA/BFLA/IDOR, account takeover, session revocation, invite replay, field-level privacy and data export access.
- **Scale/reliability:** Tenant-scoped indexes, import streaming/batching, resumable jobs, idempotent activation, bounded onboarding mutations.
- **UI and usability:** Web wizard with draft/validation/retry/progress; role-limited pages, clear error and recovery states.
- **Test emphasis:** Two-tenant permutations, role matrix, revoked invites, concurrent setup, malicious CSV, partial import failure.
- **Feature-specific deep check:** Describe the exact balance equation and locking/conditional-update strategy; include simultaneous final-SKU mutation and audit projection rebuild. Simulate idempotent retries and out-of-order release/consume.

**Scope isolation:** Work on `M02.09` only. Previous work item: `M02.08`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: DESIGN ONLY

Prepare/refresh `docs/features/M02.09/DESIGN.md` with these exact sections:
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
