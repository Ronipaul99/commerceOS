# CommerceOS M00 — Discovery, workflows, contracts and policy decisions

**Prior authority:** Read `MASTER_BLUEPRINT.md`, including [ADR-025](../MASTER_BLUEPRINT.md#235-adr-025-general-purpose-saas-foundation), `AGENTS.md`, and Section 3 + M00 of `ENGINEERING_EXECUTION_ROADMAP.md`. Conflicts require a master change.

**Prerequisites:** —. **Required gate:** RG0. **Target evidence:** Product and Architecture review the generic workspace journeys, ownership and permission model, state and failure cases, deferred decisions, and WS-01 through WS-03 with synthetic tenants. Merchant walkthroughs belong to the relevant operating pilot.

## Work item IDs (do not implement all at once)

M00.01, M00.02, M00.03, M00.04, M00.05, M00.06

## Execute one work item at a time

1. Select one ID and read its full roadmap and tracker entries. Trace the selected work to the current master.
2. Document the generic workspace journey, actor and tenant scope, and the relevant ownership, states, or failure cases for that item.
3. Use synthetic tenant scenarios for expected behavior. Record open decisions and route capability-specific questions to the work that will enable them.
4. Validate the design artifacts and requirement references. Record actual review evidence and apply the gate for that item before moving to the next one.

**Absolutely no native storefront or visual builder implementation in M00–M12.** M-F requires a separately approved program.
