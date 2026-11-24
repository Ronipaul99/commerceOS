# M00.01 — Merchant process discovery — Implement

**CommerceOS prompt execution pack v3.2** · **Stage:** Implement · **Work item:** `M00.01` · **Milestone:** M00: Discovery and architecture decisions  
**Master trace:** `3,5; SC-01…SC-06` · **Applicable milestone gate:** RG0  
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
- Observe/record jewellery and saree workflows.
- document order, cash, purchase and return exceptions.
- create as-is/to-be process swimlanes.
- agree pilot data types.

**Source contracts / data / UI deliverables:**
- Produce workflow map, actor matrix, exception examples, screen list.
- no code.

**Source risk and scaling controls:**
- Do not assume merchant tax, jewellery hallmark, delivery method, or working hours.
- keep personal customer data out of discovery fixtures.

**Source acceptance evidence:** Two merchant representatives sign workflow examples and backlog trace.

## Concrete end-to-end scenario to design / implement / verify

**Happy-path exercise:** Compare a real jewellery sale with a saree sale from enquiry through cash close; record evidence and merchant deviations.

**Mandatory adversarial/exception exercise:** Do not treat assumptions about GST, delivery, product variants or existing process as merchant approvals.

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

**Scope isolation:** Work on `M00.01` only. Previous work item: `none`; inspect prerequisites, but never auto-implement unapproved dependencies.

## Your assignment: PRODUCE APPROVED ENGINEERING DESIGN ARTIFACTS (NO APP CODE)

1. Read `docs/features/M00.01/DESIGN.md` and require recorded reviewer approval; if missing, STOP.
2. Perform exactly the approved research/analysis documented in the source work-item actions. Create the process diagrams, matrices, ADR proposals, signed review templates, edge-case examples and traceability required for this M00 item.
3. Separate verified merchant observations from proposed policies. Record named owners, evidence sources, unresolved gates and assumptions. Do not claim merchant interviews occurred unless evidence exists.
4. Review security, failure/scale and UAT assumptions where required; generate negative test **plans**, not fictitious executed code-test results.
5. Write `docs/features/M00.01/IMPLEMENTATION_EVIDENCE.md` summarizing actual document changes, evidence gathered, reviewers required and unresolved blockers. Mark migrations, APIs and deployed telemetry N/A with reason.
6. STOP. Do not implement code or proceed to next work item. Final line: `STATUS: AWAITING INDEPENDENT VERIFICATION`.
