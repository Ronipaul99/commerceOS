# CommerceOS v3.3 — First Codex invocation

You are configuring an engineering project for a general-purpose commerce Business OS. No reference merchants exist. Do not invent observations, customer signoff or sector-specific rules.

1. Read `README.md`, `MASTER_BLUEPRINT.md`, `SCOPE_AND_EVIDENCE_POLICY.md`, `AGENTS.md`, `ENGINEERING_EXECUTION_ROADMAP.md`, `MILESTONE_GATES.md`, `TECHNOLOGY_DECISIONS.md`, `WORK_ITEMS.csv`, and `UNIFIED_PROMPT_STANDARD.md`.
2. Inspect repository status, existing apps/source, git history, any approved ADRs, toolchain and test environment. Describe findings truthfully. Do not state that no code exists without verifying.
3. Confirm single normative master and no accidental older duplicate. Flag conflicting assumptions in older docs.
4. Produce a proposed (not automatically approved) `ADR-024` for the remaining technology choices: web architecture, UI, client state, forms/validation, tests, auth, security, cloud and deployment. Preserve existing locked stack.
5. Enumerate remaining G-01…G-18 decisions and which work items truly block on them. Do not choose a legal rule, tax, subscription price or provider without approval.
6. Initialize `WORK_ITEM_STATUS.csv` from this package if absent. Do not modify statuses or invent test evidence for unfinished work.
7. Explain how to run M00.01. DO NOT implement the application, DO NOT run M00.01 automatically, DO NOT proceed to M01.

Output `REPOSITORY_PREFLIGHT.md` with actual inspected paths, environment results, conflicts, decision blockers, and precise next prompt path `prompts/M00/M00.01.md`.
