# M05.02 — Manual/social order draft and server quote — Design

**CommerceOS prompt execution pack v3.2** · **Stage:** Design · **Work item:** `M05.02` · **Milestone:** M05: OMS, fulfilment, shipment and returns  
**Master trace:** `OMS-003` · **Applicable milestone gate:** RG2 order lifecycle  
**Feature scope policy:** Separate authoritative aggregate states, compensating actions and audit

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
- Start draft from customer/enquiry/quote/booking.
- validate line quantities, SKU visibility, branch price, discount authority, tax and availability.
- present recalculation.

**Source contracts / data / UI deliverables:**
- `POST /orders`, quote command, draft UI.
- no stock issue or invoice yet.

**Source risk and scaling controls:**
- Tenant/branch scope and field allowlist.
- change quote price safely, no client-submitted paid/discount override.

**Source acceptance evidence:** User edits draft; unavailable SKU yields explainable conflict without side effect.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Enter manual/social draft, compute server quote, and show price/stock conflict.

**Mandatory adversarial/exception exercise:** Reject client-submitted totals and stale price versions.

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

- **Actor/operational journey:** Order draft → confirmation → pick/pack/dispatch → delivered or cancel/RTO/RMA/exchange.
- **Data and aggregate boundary:** Separate order/payment/fulfilment/shipment/return state machines and immutable price/tax/cost snapshots.
- **Security/tenancy/privacy:** No raw order.status or payment state toggles; enforce actor/branch/fulfilment scope and audited overrides.
- **Scale/reliability:** Row-version CAS, idempotent command handling, async shipping adapters and pagination of timelines.
- **UI and usability:** Fulfilment workbench, activity history, resolution reason codes, partial quantities, accessible error/conflict states.
- **Test emphasis:** Duplicate dispatch, split parcels, cancellation after shipment, out-of-order carrier events and multi-tenant RMA.
- **Feature-specific deep check:** Describe the exact balance equation and locking/conditional-update strategy; include simultaneous final-SKU mutation and audit projection rebuild. Simulate idempotent retries and out-of-order release/consume.

**Scope isolation:** Work on `M05.02` only. Previous work item: `M05.01`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: DESIGN ONLY

Prepare/refresh `docs/features/M05.02/DESIGN.md` with these exact sections:
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
