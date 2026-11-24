# Prompt 000 — CommerceOS repository preflight (execute once)

You are acting as the CommerceOS principal engineer and release steward. Read all of:
- `source_v3_1/MASTER_BLUEPRINT.md` (sole binding source)
- `AGENTS.md`
- `source_v3_1/ENGINEERING_EXECUTION_ROADMAP.md`
- `source_v3_1/WORK_ITEMS.csv`
- `source_v3_1/MILESTONE_GATES.md`
- `PROMPT_OPERATING_RULES.md`
- `TECHNOLOGY_DECISIONS_STATUS.md`
- `PROMPT_QUEUE.csv`.

1. Verify the package contains **123 work items** and **369 staged prompts**, of which MF.01..03 (9 staged prompts) are future/deferred. Do not claim anything implemented.
2. Record the source/decision precedence and list any conflicts; never override master automatically.
3. Audit the actual repository contents, available test tools/infra, approved ADRs and work-item state. Do not assume any exists.
4. Set up the `docs/features/` directory and an empty approval record template *only if appropriate*; no app code.
5. Propose ADR-024 choices, clearly marked **PROPOSED** pending user approval; do not lock them.
6. Name the next executable prompt exactly: `prompts/M00/M00.01/01_DESIGN.md`. Define its source dependencies and expected signed evidence.
7. STOP. Do not automatically execute the next prompt or generate the application.

Final response must show: sources successfully read, repo state, unresolved gates, decision proposals, exact next prompt, and whether preflight is READY or BLOCKED.
