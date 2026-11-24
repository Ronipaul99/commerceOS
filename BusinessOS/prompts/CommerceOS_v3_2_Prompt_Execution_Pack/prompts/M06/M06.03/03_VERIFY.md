# M06.03 — Mixed tender and POS order confirmation — Verify

**CommerceOS prompt execution pack v3.2** · **Stage:** Verify · **Work item:** `M06.03` · **Milestone:** M06: POS and financial operations  
**Master trace:** `9,10` · **Applicable milestone gate:** RG2 finance + applicable G-05/G-06  
**Feature scope policy:** Verified collections, separate merchant settlement, immutable financial documents

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
- Accept cash, UPI, approved manual transfer, optional COD/credit policy.
- allocate tender amounts to order and issue receipt only after valid domain outcome.

**Source contracts / data / UI deliverables:**
- `pos_tenders`, payment allocations, POS confirm command and receipt UI.

**Source risk and scaling controls:**
- Duplicate double-click/retry cannot create order/charge twice.
- client display never sets paid.

**Source acceptance evidence:** SC-04 cash+UPI tender totals and stock reconcile.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Accept mixed cash/UPI tender and confirm one POS order transaction.

**Mandatory adversarial/exception exercise:** Duplicate submit or interrupted network cannot create two orders.

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

- **Actor/operational journey:** Counter sale and collections → payment allocation → provider/COD settlement → invoice/cash close/report.
- **Data and aggregate boundary:** Separate collection/allocation/settlement/refund/cash ledgers; integer paise; immutable invoice/credit changes.
- **Security/tenancy/privacy:** Provider signature and verification, maker-checker refunds, scoped financial visibility, no screenshots as paid proof.
- **Scale/reliability:** Short transactional settlements, idempotency keys, asynchronous provider calls and reconciliation at batch scale.
- **UI and usability:** Cashier speed plus manual verification warning, payment evidence, reconciliation exception and cash close states.
- **Test emphasis:** Forged callback, duplicate refund, partial/mixed tender, fees/payout mismatch, invoice sequence and replay.
- **Feature-specific deep check:** Identify the authoritative evidence required for each financial state, who may correct it and the immutable reversal path; separate merchant settlement from platform subscription billing; test exact minor units.

**Scope isolation:** Work on `M06.03` only. Previous work item: `M06.02`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: VERIFY / RED TEAM / RELEASE EVIDENCE

Perform a skeptical, independent verification pass (prefer a fresh agent context). Do not assume implementation correctness:
1. Review master mapping, approved design, diff, migrations, API changes, UI, tests, permissions, risk register and actual commands/evidence; verify no unauthorized scope expansion.
2. Reproduce clean installation/build and execute applicable lint/typecheck/unit/real-DB integration/API contract/UI E2E/security/concurrency/load/recovery tests. Record precise command, environment, runtime, observed result, and why N/A where not applicable.
3. Execute at least one positive user/operator workflow plus a negative permission case for another tenant and a failure/retry/duplicate or concurrency case appropriate to this work item.
4. Inspect tenant-safe keys, object-level auth, field visibility, logged PII/secrets, command idempotency, stale results, compensation, events and schema compatibility.
5. Confirm dashboards, queue age, error metrics and safe rollout/rollback for deployed changes; don't claim production SLO or RPO/RTO without measured evidence.
6. Produce `docs/features/M06.03/VERIFICATION_REPORT.md` with evidence links, screenshots/log excerpts (redacted), unresolved risks, reviewer name, and outcome `PASS`, `FAIL`, or `BLOCKED`.
7. Update `WORK_ITEM_STATUS.csv` ONLY after real approver and the applicable gate/checklist have passed; keep `source_v3_1/WORK_ITEMS.csv` unchanged as source baseline.
8. If FAIL/BLOCKED, write precise remediation tasks and STOP; do not begin next item. Even PASS does not authorize next item without user instruction.

## Mandatory item-specific challenge

Reproduce: **Accept mixed cash/UPI tender and confirm one POS order transaction**. Then attempt to break: **Duplicate submit or interrupted network cannot create two orders**. Include a second-tenant denial case if an object/API/job handles merchant data. Verify it does not silently degrade the core invariant and that errors are visible to authorized users/operators.

**Outcome:** If any required test fails or a critical decision is unapproved, label `FAIL` or `BLOCKED`, and never mark completed. If passed with named reviewer, state the applicable release-gate readiness and links to actual evidence. STOP here.
