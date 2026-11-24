# M09.05 — Overage rating and explainable invoice lines — Verify

**CommerceOS prompt execution pack v3.2** · **Stage:** Verify · **Work item:** `M09.05` · **Milestone:** M09: Merchant subscription billing and quotas  
**Master trace:** `SAAS-002/003; G-07` · **Applicable milestone gate:** RG4 + RG5  
**Feature scope policy:** Separate SaaS billing ledger and approved pricing/plan policies

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
- Rate eligible usage above included allowance using plan snapshot and tax-inclusivity policy, create reproducible charges and correction entries.
- preview next bill.

**Source contracts / data / UI deliverables:**
- `billing_periods/overage_charges`, rating job and subscription invoice screen.

**Source risk and scaling controls:**
- Integer paise, policy version and idempotency.
- no accidental second billing due to retroactive events.

**Source acceptance evidence:** SC-09 order 51 charges once under approved contract; dispute trace ties to order IDs.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Compute explainable overage invoice lines from immutable plan/pricing version.

**Mandatory adversarial/exception exercise:** Do not silently choose tax-inclusive/exclusive rule or double-rate replay.

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

- **Actor/operational journey:** Merchant trial/plan → entitlement checks and usage metering → invoice/collections → renewal/grace.
- **Data and aggregate boundary:** Separate platform billing, plan/terms snapshots, immutable usage/reversals, effective-dated entitlements.
- **Security/tenancy/privacy:** Billing role separation, price/tax decisions gated, no data destruction on grace/suspend.
- **Scale/reliability:** Atomic quota checks, tenant fair usage jobs, backfill/rebuild and idempotent rating.
- **UI and usability:** Explain usage and overages, grace/suspension notices, invoice evidence, accessible billing settings.
- **Test emphasis:** Split shipment billed once, concurrent quota create, replay rating, fail payment, downgrade and dispute.
- **Feature-specific deep check:** Identify the authoritative evidence required for each financial state, who may correct it and the immutable reversal path; separate merchant settlement from platform subscription billing; test exact minor units.

**Scope isolation:** Work on `M09.05` only. Previous work item: `M09.04`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: VERIFY / RED TEAM / RELEASE EVIDENCE

Perform a skeptical, independent verification pass (prefer a fresh agent context). Do not assume implementation correctness:
1. Review master mapping, approved design, diff, migrations, API changes, UI, tests, permissions, risk register and actual commands/evidence; verify no unauthorized scope expansion.
2. Reproduce clean installation/build and execute applicable lint/typecheck/unit/real-DB integration/API contract/UI E2E/security/concurrency/load/recovery tests. Record precise command, environment, runtime, observed result, and why N/A where not applicable.
3. Execute at least one positive user/operator workflow plus a negative permission case for another tenant and a failure/retry/duplicate or concurrency case appropriate to this work item.
4. Inspect tenant-safe keys, object-level auth, field visibility, logged PII/secrets, command idempotency, stale results, compensation, events and schema compatibility.
5. Confirm dashboards, queue age, error metrics and safe rollout/rollback for deployed changes; don't claim production SLO or RPO/RTO without measured evidence.
6. Produce `docs/features/M09.05/VERIFICATION_REPORT.md` with evidence links, screenshots/log excerpts (redacted), unresolved risks, reviewer name, and outcome `PASS`, `FAIL`, or `BLOCKED`.
7. Update `WORK_ITEM_STATUS.csv` ONLY after real approver and the applicable gate/checklist have passed; keep `source_v3_1/WORK_ITEMS.csv` unchanged as source baseline.
8. If FAIL/BLOCKED, write precise remediation tasks and STOP; do not begin next item. Even PASS does not authorize next item without user instruction.

## Mandatory item-specific challenge

Reproduce: **Compute explainable overage invoice lines from immutable plan/pricing version**. Then attempt to break: **Do not silently choose tax-inclusive/exclusive rule or double-rate replay**. Include a second-tenant denial case if an object/API/job handles merchant data. Verify it does not silently degrade the core invariant and that errors are visible to authorized users/operators.

**Outcome:** If any required test fails or a critical decision is unapproved, label `FAIL` or `BLOCKED`, and never mark completed. If passed with named reviewer, state the applicable release-gate readiness and links to actual evidence. STOP here.
