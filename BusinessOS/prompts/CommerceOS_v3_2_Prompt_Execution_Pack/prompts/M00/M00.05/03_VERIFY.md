# M00.05 — Policy and legal decision gates — Verify

**CommerceOS prompt execution pack v3.2** · **Stage:** Verify · **Work item:** `M00.05` · **Milestone:** M00: Discovery and architecture decisions  
**Master trace:** `23.3 G-01…G-14` · **Applicable milestone gate:** RG0  
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
- Assign accountable owner/due-before-milestone for each gate.
- capture default policy and blocked capability.
- get GST, payment and payroll validation paths.

**Source contracts / data / UI deliverables:**
- `DECISIONS_LOG.md`, ADR template and feature approval checklist.

**Source risk and scaling controls:**
- Never allow coding agent to substitute a GST rate, merchant plan price, OTP provider or payment evidence policy.

**Source acceptance evidence:** RG0 list shows APPROVED or BLOCKED per gated decision.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Record owner, blocking stage and default-disabled behavior for G-01..G-14 and propose ADR-024 stack selections.

**Mandatory adversarial/exception exercise:** Prevent unapproved tax rates, payment authority, subscription prices and payroll formulas.

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

**Scope isolation:** Work on `M00.05` only. Previous work item: `M00.04`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: INDEPENDENT DOCUMENT / DESIGN VERIFICATION

1. Read the approved design and actual M00 deliverables for `M00.05`; independently check their traceability to the master.
2. Verify process maps, actor permissions, test/scenario matrices, actual merchant evidence and decision-gate records. Test the logical consistency of invariants with example edge cases.
3. Validate the feature-specific positive and adversarial scenarios described above against the documents; do not claim integration/E2E tests ran when no code exists.
4. Record gaps and corrections; get required named reviewer(s) to approve actual results. Do not forge merchant signoff or approve policy gates by assumption.
5. Write `docs/features/M00.05/VERIFICATION_REPORT.md`: PASS / FAIL / BLOCKED, traceability, reviewer, redacted evidence links, assumptions and unresolved risks.
6. Update `WORK_ITEM_STATUS.csv` only after actual reviewer signoff; otherwise leave BLOCKED. STOP, do not move automatically to the next ID.
