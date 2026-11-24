# M01.08 — File object and background jobs infrastructure — Verify

**CommerceOS prompt execution pack v3.2** · **Stage:** Verify · **Work item:** `M01.08` · **Milestone:** M01: Secure platform and developer experience  
**Master trace:** `17,20` · **Applicable milestone gate:** Engineering platform baseline  
**Feature scope policy:** Foundation code may be implemented; no actual merchant financial transitions

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
- Design authorized upload intents, object metadata, private storage, expiring signed download URLs and async scan/resize hooks.
- status/cancel endpoints for long tasks.

**Source contracts / data / UI deliverables:**
- `file_objects`, storage adapter, job progress API.

**Source risk and scaling controls:**
- Validate MIME/content, size, ownership, filenames, malware scanning and tenant-safe signed URLs.
- bound uploads/egress.

**Source acceptance evidence:** Cross-tenant file denial and expired URL tests pass.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Request upload, scan, store private object and download via authorized short-lived link.

**Mandatory adversarial/exception exercise:** Block unsupported file types, oversized uploads, path traversal and cross-tenant object access.

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

- **Actor/operational journey:** Developer fresh checkout, API request, queue job and traceable safe deployment from local to staging.
- **Data and aggregate boundary:** Typed contracts, schema migrations, ids and transaction helpers; no global mutable tenant context.
- **Security/tenancy/privacy:** Secrets never committed; session scope derived server-side; supply-chain verification; secure defaults.
- **Scale/reliability:** Stateless API/worker capacity, bounded concurrency, pool sizing, efficient routing and metrics instrumentation.
- **UI and usability:** Accessible shell, loading/error patterns and generated client/types where a UI exists.
- **Test emphasis:** Clean checkout builds, real Postgres integration, container smoke, CI scans and controlled failure injection.
- **Feature-specific deep check:** Design a separate denial matrix: valid actor wrong tenant, valid tenant wrong branch, unauthorized field, revoked session, action via worker or background job, and identifier enumeration.

**Scope isolation:** Work on `M01.08` only. Previous work item: `M01.07`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: VERIFY / RED TEAM / RELEASE EVIDENCE

Perform a skeptical, independent verification pass (prefer a fresh agent context). Do not assume implementation correctness:
1. Review master mapping, approved design, diff, migrations, API changes, UI, tests, permissions, risk register and actual commands/evidence; verify no unauthorized scope expansion.
2. Reproduce clean installation/build and execute applicable lint/typecheck/unit/real-DB integration/API contract/UI E2E/security/concurrency/load/recovery tests. Record precise command, environment, runtime, observed result, and why N/A where not applicable.
3. Execute at least one positive user/operator workflow plus a negative permission case for another tenant and a failure/retry/duplicate or concurrency case appropriate to this work item.
4. Inspect tenant-safe keys, object-level auth, field visibility, logged PII/secrets, command idempotency, stale results, compensation, events and schema compatibility.
5. Confirm dashboards, queue age, error metrics and safe rollout/rollback for deployed changes; don't claim production SLO or RPO/RTO without measured evidence.
6. Produce `docs/features/M01.08/VERIFICATION_REPORT.md` with evidence links, screenshots/log excerpts (redacted), unresolved risks, reviewer name, and outcome `PASS`, `FAIL`, or `BLOCKED`.
7. Update `WORK_ITEM_STATUS.csv` ONLY after real approver and the applicable gate/checklist have passed; keep `source_v3_1/WORK_ITEMS.csv` unchanged as source baseline.
8. If FAIL/BLOCKED, write precise remediation tasks and STOP; do not begin next item. Even PASS does not authorize next item without user instruction.

## Mandatory item-specific challenge

Reproduce: **Request upload, scan, store private object and download via authorized short-lived link**. Then attempt to break: **Block unsupported file types, oversized uploads, path traversal and cross-tenant object access**. Include a second-tenant denial case if an object/API/job handles merchant data. Verify it does not silently degrade the core invariant and that errors are visible to authorized users/operators.

**Outcome:** If any required test fails or a critical decision is unapproved, label `FAIL` or `BLOCKED`, and never mark completed. If passed with named reviewer, state the applicable release-gate readiness and links to actual evidence. STOP here.
