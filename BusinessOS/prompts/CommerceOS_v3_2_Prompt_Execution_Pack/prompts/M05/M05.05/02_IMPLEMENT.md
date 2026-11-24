# M05.05 — Packing, parcels and dispatch — Implement

**CommerceOS prompt execution pack v3.2** · **Stage:** Implement · **Work item:** `M05.05` · **Milestone:** M05: OMS, fulfilment, shipment and returns  
**Master trace:** `OMS-004` · **Applicable milestone gate:** RG2 order lifecycle  
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
- Pack verified lines into packages, generate manifest/label if configured, dispatch selected qty and post inventory issue once, preserve partial package history.

**Source contracts / data / UI deliverables:**
- `packages/shipments`, dispatch command, label stub, scan/status UI.

**Source risk and scaling controls:**
- Atomic stock issue/source key and separate carrier external call.
- idempotent command replay.
- no dispatch beyond allocated/verified qty.

**Source acceptance evidence:** Split parcels produce correct stock, fulfilment, shipment and usage prereqs.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Pack verified quantities into parcels and dispatch through a safe transition.

**Mandatory adversarial/exception exercise:** Do not decrement twice; block dispatch without available allocated goods.

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

**Scope isolation:** Work on `M05.05` only. Previous work item: `M05.04`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: IMPLEMENT ONLY AFTER APPROVAL

Build the smallest **approved** vertical slice; do not implement the entire milestone. Work in this order:
1. Read signed `docs/features/M05.05/DESIGN.md`; verify explicit approval and all blocker gates. If absent, STOP and list required approvals—do not code.
2. Inspect existing code and tests for this slice; explain files and modules to change, ownership and API compatibility. Make a feature branch / small PR.
3. Implement transaction-safe DB migration/constraints and real test fixtures first where applicable; use expand/backfill/contract compatibility. Skip DB files when design says N/A.
4. Implement domain commands/queries, state transitions, authorization, consistent error semantics, idempotency, audit, outbox and background workers where required. No hidden new endpoint or direct cross-domain table write.
5. Implement versioned REST/OpenAPI DTOs and generated TS client; add portal/business web/POS/mobile UI only where this slice requires; accessible states and authorization-consistent presentation.
6. Add the specific test matrix from the approved design. Use real PostgreSQL/Testcontainers where concurrency/ledger correctness matters; stubs cannot substitute for transaction tests.
7. Add redacted logs/metrics/traces, feature flags, configuration validation, operator runbook, retry and DLQ handling as appropriate.
8. Run all locally available checks; show exact commands, outputs, failures and skipped suites. Do not mark not-run tests as passed.
9. Write `docs/features/M05.05/IMPLEMENTATION_EVIDENCE.md`: changed files, branch/commit/PR, migration/backfill, OpenAPI diff, test commands/results, security impact, observability, rollback and known gaps.
10. STOP. Do not run independent verification or the next work item until reviewer asks for the verify prompt.

## Feature-specific implementation focus

Implement exactly the source actions listed above, not a minimal placeholder controller or decorative UI. Make the user/operator exercise actually work with real services or explicitly scoped test adapters, and implement the exception exercise with a failing-before/fixed-after test where practical. Expose missing configuration as a controlled blocked setup, not a hard-coded commercial rule. Preserve compatibility with existing clients and update the generated SDK.

**Implementation completion:** Provide a working walkthrough and a runnable, linked test suite; report *NOT RUN* for anything you could not execute. Final line: `STATUS: AWAITING INDEPENDENT VERIFICATION`. STOP here.
