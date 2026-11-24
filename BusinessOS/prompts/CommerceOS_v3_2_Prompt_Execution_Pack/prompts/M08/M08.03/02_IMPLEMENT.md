# M08.03 — Transaction concurrency and load test — Implement

**CommerceOS prompt execution pack v3.2** · **Stage:** Implement · **Work item:** `M08.03` · **Milestone:** M08: Two-merchant UAT, security, resilience and release  
**Master trace:** `16.6,21` · **Applicable milestone gate:** RG3 and pilot RG5  
**Feature scope policy:** Evidence-gathering and remediation; test proof, not invented results

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
- Simulate last-unit booking bursts, order submits/retries, 10k-row imports, slow report export, queue surge and provider webhooks.
- profile locks, SQL plans, p95 and memory.

**Source contracts / data / UI deliverables:**
- k6/Artillery scripts, query plans, representative datasets and telemetry baselines.

**Source risk and scaling controls:**
- Avoid speculative throughput claims.
- tune indexes/pools under realistic concurrency and isolate noisy tenants.

**Source acceptance evidence:** Target workload report shows correctness and measured latency or explicit blocker.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Load test hot SKU and payment callback under retries and realistic contention.

**Mandatory adversarial/exception exercise:** Observe p95, connections, deadlocks, queue age; no universal throughput claims.

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

- **Actor/operational journey:** Operate both independent pilot merchants through day-end cash/stock reconciliation and deployment rehearsal.
- **Data and aggregate boundary:** Reconciliation evidence, migrated fixture lineage, test artifacts, restoring referential integrity.
- **Security/tenancy/privacy:** Independent audit and remediation of tenant/object/field auth, abuse, backups and production secrets.
- **Scale/reliability:** Measured p95, DB locks/pool, workload, worker queues, restore time and safe rollback.
- **UI and usability:** Merchant sign-off and actual user traces/screenshots; critical usability defects logged.
- **Test emphasis:** Run full UAT, chaos/failure drills, load, restore and security suite with exact commands/results.
- **Feature-specific deep check:** Use tenant A/B adversarial fixtures, explicit ownership rules, idempotency where writes occur, and failure-mode testing. Document business assumptions requiring approval.

**Scope isolation:** Work on `M08.03` only. Previous work item: `M08.02`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: EXECUTE APPROVED PILOT VALIDATION / HARDENING TASK

1. Read the approved design and actual implementation; if approval, required environments or pilot consent are missing, STOP and record blockers.
2. Run the exact pilot, migration, security, load, backup, incident or deployment rehearsal described for `M08.03`. Capture observed commands/measurements, environment, fixture lineage and operator/merchant actions.
3. Create only necessary approved test harnesses, remediation changes or observability/runbook updates. Never simulate results or perform uncontrolled destructive production experiments.
4. For detected defects, open focused follow-up issues/PRs and verify fixes, preserving audit evidence. Re-run impacted acceptance scenarios.
5. Write `docs/features/M08.03/IMPLEMENTATION_EVIDENCE.md` with actual results, risks, rollback/readiness and reviewers. Missing measurements are `NOT_RUN`, not passes. STOP and await independent verification.
