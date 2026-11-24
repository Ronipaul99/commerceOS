# M00.03 — State machines and invariants — Design

**CommerceOS prompt execution pack v3.2** · **Stage:** Design · **Work item:** `M00.03` · **Milestone:** M00: Discovery and architecture decisions  
**Master trace:** `6,8,10,13` · **Applicable milestone gate:** RG0  
**Feature scope policy:** Documentation and approval only; application code is forbidden

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
- Define states, commands, actors, transitions, failure paths and compensation for order/payment/fulfilment/shipment/RMA/reservation/PO/subscription.

**Source contracts / data / UI deliverables:**
- State diagrams, transition tables, idempotency policy, source-of-truth mapping.

**Source risk and scaling controls:**
- Model duplicate, out-of-order, concurrent cancellation, partial receipt, RTO and disputes before schema implementation.

**Source acceptance evidence:** Model-based test cases and impossible-state checklist signed.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Model last-unit hold, partial order cancellation, return inspection and settlement as separate transitions.

**Mandatory adversarial/exception exercise:** Generate impossible-state tests for replay, out-of-order events and concurrent commands.

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

- **Actor/operational journey:** Business owner, cashier, manager, staff, provider, platform operator actors; actual pilot merchant validation before approval.
- **Data and aggregate boundary:** Decision records, workflow maps, traceability, state diagrams, threat models, test fixtures; no invented implementations.
- **Security/tenancy/privacy:** Data minimization in discovery; model cross-tenant access and permission escalation.
- **Scale/reliability:** Evidence-based workload assumptions, contention cases and capacity budget; no promised production SLA.
- **UI and usability:** Process maps and screen journeys; accessibility and mobile/POS responsibilities documented.
- **Test emphasis:** Reviewable scenario matrices, impossible-state examples and explicit signed acceptance.
- **Feature-specific deep check:** Use tenant A/B adversarial fixtures, explicit ownership rules, idempotency where writes occur, and failure-mode testing. Document business assumptions requiring approval.

**Scope isolation:** Work on `M00.03` only. Previous work item: `M00.02`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: DESIGN ONLY

Prepare/refresh `docs/features/M00.03/DESIGN.md` with these exact sections:
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
