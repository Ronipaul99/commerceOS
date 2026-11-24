# CommerceOS M01 — Engineering platform, secure SDLC and event backbone

**Prior authority:** Read `MASTER_BLUEPRINT.md`, including the approved toolchain in [ADR-024](../MASTER_BLUEPRINT.md#234-adr-024-businessos-engineering-toolchain), `AGENTS.md`, and Section 3 + M01 of `ENGINEERING_EXECUTION_ROADMAP.md`. Conflicts require a master change.

**Prerequisites:** M00. **Required gate:** Platform baseline. **Target evidence:** Reproducible monorepo/CI/staging, tenant context, storage, outbox, secrets and deploy/restore runbooks.

## Work item IDs (do not implement all at once)

M01.01, M01.02, M01.03, M01.04, M01.05, M01.06, M01.07, M01.08, M01.09, M01.10

## Execute one work item at a time

1. Select exactly one ID from the list above and read its entire entry in the execution roadmap and CSV. Confirm the mapped requirements in the current master. Apply ADR-024 to tooling within the selected work item.
2. Before coding, map actor/branch/tenant context, data ownership, states, failure/replay and threat model; report gates blocked.
3. Describe concrete schema/API/typed client, UI, audit, events and async processing; ensure no second catalog/inventory/OMS.
4. Implement smallest complete vertical slice with transaction safety, idempotency and approved provider mocks where unresolved.
5. Run and **quote real** lint/typecheck/unit/integration/tenant-isolation/contract/E2E/negative tests; include concurrency/security tests appropriate to the feature.
6. Present migration/backfill/rollback, OpenAPI diff, traces/metrics, UAT evidence, residual risks and release readiness.
7. Stop before next work item until this one has review and applicable gate evidence.

**Absolutely no native storefront or visual builder implementation in M00–M12.** M-F requires a separately approved program.
