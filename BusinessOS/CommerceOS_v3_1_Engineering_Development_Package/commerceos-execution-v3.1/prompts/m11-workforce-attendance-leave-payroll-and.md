# CommerceOS M11 — Workforce attendance, leave, payroll and incentives seam

**Prior authority:** Read `MASTER_BLUEPRINT.md` v3, `AGENTS.md`, current approved ADRs, and Section 3 + M11 of `ENGINEERING_EXECUTION_ROADMAP.md`. Conflicts require a master change.

**Prerequisites:** M02 + M06; may reorder via ADR. **Required gate:** RG6 for payroll. **Target evidence:** Private attendance and leave operate; payroll releases only after legal/role/calculation gate.

## Work item IDs (do not implement all at once)

M11.01, M11.02, M11.03, M11.04, M11.05, M11.06, M11.07, M11.08

## Execute one work item at a time

1. Select exactly one ID from the list above and read its entire entry in the execution roadmap and CSV. Confirm the mapped requirements in the original v3 master.
2. Before coding, map actor/branch/tenant context, data ownership, states, failure/replay and threat model; report gates blocked.
3. Describe concrete schema/API/typed client, UI, audit, events and async processing; ensure no second catalog/inventory/OMS.
4. Implement smallest complete vertical slice with transaction safety, idempotency and approved provider mocks where unresolved.
5. Run and **quote real** lint/typecheck/unit/integration/tenant-isolation/contract/E2E/negative tests; include concurrency/security tests appropriate to the feature.
6. Present migration/backfill/rollback, OpenAPI diff, traces/metrics, UAT evidence, residual risks and release readiness.
7. Stop before next work item until this one has review and applicable gate evidence.

**Absolutely no native storefront or visual builder implementation in M00–M12.** M-F requires a separately approved program.
