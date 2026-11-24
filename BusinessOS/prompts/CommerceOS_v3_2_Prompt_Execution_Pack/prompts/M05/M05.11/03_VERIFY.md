# M05.11 — Failed delivery, RTO and carrier reconciliation — Verify

**CommerceOS prompt execution pack v3.2** · **Stage:** Verify · **Work item:** `M05.11` · **Milestone:** M05: OMS, fulfilment, shipment and returns  
**Master trace:** `OMS-005/007` · **Applicable milestone gate:** RG2 order lifecycle  
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
- Track failed attempts, RTO initiated/received, original-stock disposition, COD non-collection, carrier fees and pending follow-up.

**Source contracts / data / UI deliverables:**
- `rto_cases`, shipment events and RTO work queue.

**Source risk and scaling controls:**
- Do not mark customer paid from carrier promise.
- lost/RTO stock only returned after inspection/receipt.

**Source acceptance evidence:** SC-06 separate RTO leaves settlement and stock accurate.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Track failed delivery, RTO initiation, reverse logistics and COD discrepancy.

**Mandatory adversarial/exception exercise:** Out-of-order courier callbacks must not mark delivered after RTO without review.

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

**Scope isolation:** Work on `M05.11` only. Previous work item: `M05.10`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: VERIFY / RED TEAM / RELEASE EVIDENCE

Perform a skeptical, independent verification pass (prefer a fresh agent context). Do not assume implementation correctness:
1. Review master mapping, approved design, diff, migrations, API changes, UI, tests, permissions, risk register and actual commands/evidence; verify no unauthorized scope expansion.
2. Reproduce clean installation/build and execute applicable lint/typecheck/unit/real-DB integration/API contract/UI E2E/security/concurrency/load/recovery tests. Record precise command, environment, runtime, observed result, and why N/A where not applicable.
3. Execute at least one positive user/operator workflow plus a negative permission case for another tenant and a failure/retry/duplicate or concurrency case appropriate to this work item.
4. Inspect tenant-safe keys, object-level auth, field visibility, logged PII/secrets, command idempotency, stale results, compensation, events and schema compatibility.
5. Confirm dashboards, queue age, error metrics and safe rollout/rollback for deployed changes; don't claim production SLO or RPO/RTO without measured evidence.
6. Produce `docs/features/M05.11/VERIFICATION_REPORT.md` with evidence links, screenshots/log excerpts (redacted), unresolved risks, reviewer name, and outcome `PASS`, `FAIL`, or `BLOCKED`.
7. Update `WORK_ITEM_STATUS.csv` ONLY after real approver and the applicable gate/checklist have passed; keep `source_v3_1/WORK_ITEMS.csv` unchanged as source baseline.
8. If FAIL/BLOCKED, write precise remediation tasks and STOP; do not begin next item. Even PASS does not authorize next item without user instruction.

## Mandatory item-specific challenge

Reproduce: **Track failed delivery, RTO initiation, reverse logistics and COD discrepancy**. Then attempt to break: **Out-of-order courier callbacks must not mark delivered after RTO without review**. Include a second-tenant denial case if an object/API/job handles merchant data. Verify it does not silently degrade the core invariant and that errors are visible to authorized users/operators.

**Outcome:** If any required test fails or a critical decision is unapproved, label `FAIL` or `BLOCKED`, and never mark completed. If passed with named reviewer, state the applicable release-gate readiness and links to actual evidence. STOP here.
