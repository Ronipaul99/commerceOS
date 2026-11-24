# CommerceOS prompt execution rules — v3.2

## Authority (not changed by this pack)

1. `source_v3_1/MASTER_BLUEPRINT.md` is the **only normative product and architectural source**. Do not replace it with proposed choices.
2. Approved ADRs may amend that master only after a human approves the diff. The v3.1 engineering roadmap is implementation guidance, not additional authority.
3. `AGENTS.md` contains binding agent safeguards; prompts operationalize those rules.
4. `WORK_ITEM_STATUS.csv` tracks actual decisions/results; `source_v3_1/WORK_ITEMS.csv` remains an unchanged evidence baseline.
5. No storefront/UI builder/runtime until separately approved M-F, and transactional partner order APIs require RG7.

## Execution protocol (required)

- Start with `00_START_HERE_PROMPT.md`, then `PROMPT_QUEUE.csv` row 1 and continue in order. Do not paste 369 prompts in one coding-agent request.
- For one work item, run **DESIGN** first. The agent must save its output to `docs/features/<ID>/DESIGN.md` and stop without coding.
- A human reviews and records `APPROVED` with reviewer, timestamp and any attached ADR; unresolved gates remain `BLOCKED` and affected implementation must not begin.
- Run **IMPLEMENT** second only after verified design approval. Use a feature branch, minimal PR, migrations/transactions, API/contracts, UI and tests as applicable. Agent stops after producing actual implementation evidence.
- Run **VERIFY** using an independent review context; fail or block on any missing required test/tenant denial, domain drift, missing reviewer or release gate.
- **Do not auto-advance** even on success. Explicit approval must mark `WORK_ITEM_STATUS.csv` with links to the actual PR, tests and signoff; then user instructs next prompt.
- If a design requires an unapproved tech provider, tax, payroll, pricing or retention policy, propose a decision and STOP that slice; never infer acceptance from this prompt pack.
- For M00 planning items, no application code is expected. M08 tasks are verification and controlled remediation, not invented feature deployments. For M-F, all three prompts are deferred until another separately approved program.
- Use `NOT_APPLICABLE` with reason for tests/contracts/migrations that truly do not apply; never generate fake test evidence to fill a checklist.

## Non-negotiable delivery evidence

Every coded work item: requirement ID trace, approved design, API/DB/UI/event boundary review, tenant/branch/role/field enforcement, actual automated tests, failure/retry/concurrency testing where applicable, audited changes, redacted telemetry, migration and rollout/rollback, actual commit/PR evidence, human verification.

Every documentation/audit item: source mapping, accurate diagrams/matrices, recorded assumptions, identified blockers, reviewer signoff and traceability. No false assertions about deployed software.

## Recommended development habits

- Re-read relevant source sections and existing source code every run; do not assume prior agent context persists.
- Keep end-to-end feature slices small enough to review; split a work item into numbered sub-PRs only if verified integration keeps one business behavior complete.
- Prefer strong business invariants, database constraints, OWASP ASVS/API review, and dependable recoverability over speculative infra complexity.
- The user operates as final product/design approver unless separately delegated; payroll, law/tax and security-sensitive releases require qualified review as required by gates.
