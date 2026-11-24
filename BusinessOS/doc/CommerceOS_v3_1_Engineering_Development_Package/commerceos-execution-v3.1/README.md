# CommerceOS v3.1 — Engineering Execution Companion

Prepared 24 Nov 2026. **Planning artifacts only: no application code or verified tests.**

## Authority
1. `MASTER_BLUEPRINT.md` v3.1.0 is the authoritative specification. [ADR-025](MASTER_BLUEPRINT.md#235-adr-025-general-purpose-saas-foundation) defines the general-purpose SaaS foundation. [ADR-024](MASTER_BLUEPRINT.md#234-adr-024-businessos-engineering-toolchain) records the engineering toolchain.
2. Approved ADR changes **must** first amend the master; no derived roadmap overrides it.
3. `AGENTS.md`: mandatory execution instructions for coding agents.
4. `ENGINEERING_EXECUTION_ROADMAP.md`: detailed engineering sequence, patterns, security, test and release criteria.
5. `WORK_ITEMS.csv`: 123 work items with IDs, implementation, data/interfaces, risk tests, exit proof and status fields.
6. `MILESTONE_GATES.md`: milestone checklists; master RG0–RG7 are authoritative.
7. `prompts/`: one prompt per milestone, not authorization for full milestone in one PR.
8. `IMPLEMENTATION_TRACEABILITY_v3.csv`: original master v3 trace matrix unchanged.

The packaged Word roadmap is an earlier snapshot. Use `ENGINEERING_EXECUTION_ROADMAP.md` for the current roadmap.

## Implementation sequence
`M00 → M01 → M02 → M03 → M04 → M05 → M06 → M07 → M08 → M09 → M10 → M12` with M11 separately scheduled behind its dependencies and RG6. M-F is entirely future.

M00–M02 deliver the shared workspace foundation. The later commerce milestones describe an optional capability path and its operating pilot. Workspace use starts independently of those modules and paid subscription setup.

**No storefront builder/customer storefront, API transactional live activation, payroll finalization, live gateway or tier pricing is approved solely by this package.**

In every coding-agent request: require source master ID, one WORK_ITEMS.csv story, migrations + API + UI + event + audit + observability + real tests, security risks, rollout/rollback, and evidence.

## Totals
- Master v3.1.0 includes ADR-024 and ADR-025
- 123 detailed work items
- 14 milestone groups including the future storefront group
- 7 core release gates defined in v3 (RG0–RG7, eight labels including RG0)
- 14 unresolved policy gates in master (G-01…G-14)
