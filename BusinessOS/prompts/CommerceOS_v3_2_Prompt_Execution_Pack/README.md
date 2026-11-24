# CommerceOS v3.2 — Prompt-by-prompt engineering implementation pack

**Generated:** 24 November 2026  
**Source:** CommerceOS v3.0 master and v3.1 engineering roadmap, copied unchanged into `source_v3_1/`.

## Contents and counts

- **123 work items** from original v3.1 CSV, IDs and source trace preserved.
- **369 standalone executable prompts**: design, implement, verify for each work item.
- **120 in-scope Business OS work items** (360 staged prompts); **3 future M-F work items** (9 deferred prompts).
- Each file references the same master source and item; adds a concrete happy path, adversarial case, domain guidance, architecture, security, scale, test and delivery checklist.
- Exact copy-ready prompt sequence: `PROMPT_QUEUE.csv`; fast browsing: `PROMPT_ATLAS.md`.

## Execute this way

1. Put this pack in the repository root, retaining directory names. If an existing repo has files, merge carefully without overwriting implementation.
2. Run `00_START_HERE_PROMPT.md` once; it verifies sources and proposes ADR-024 but writes no application code.
3. Run `prompts/M00/M00.01/01_DESIGN.md`; review the proposed design and get real merchant approval.
4. Run `02_IMPLEMENT.md` only if that slice is approved. For M00 this produces approved documentation, not code; do not pretend implementation tests exist.
5. Run `03_VERIFY.md` independently and record evidence before advancing to `M00.02`.
6. Continue through all in-scope M00–M10, M11 and M12 tasks. M11 can be moved earlier only via approved ADR and prerequisites; do not run M-F now.

**Important:** Prompts are not source-code generators that guarantee enterprise quality. Each prompt is an executable engineering contract requiring explicit decisions, real code, test evidence and human review. Missing approvals must BLOCK execution. Running all prompts without satisfying those conditions is not compliant.

## Files

- `AGENTS.md`: original required agent rules.
- `source_v3_1/MASTER_BLUEPRINT.md`: immutable, sole authoritative product specification.
- `PROMPT_OPERATING_RULES.md`: quality gates and stop conditions.
- `TECHNOLOGY_DECISIONS_STATUS.md`: baseline and unresolved ADR-024 choices.
- `00_START_HERE_PROMPT.md`: first runnable preflight prompt.
- `PROMPT_QUEUE.csv`: strict order and links to 369 prompts.
- `PROMPT_ATLAS.md`: readable browsing index with scenario summary for each feature.
- `WORK_ITEM_STATUS.csv`: fresh execution-tracking sheet.
- `prompts/MXX/MXX.YY/*.md`: one ready-to-copy prompt per phase of feature.

## Source integrity and scope

No code is included or claimed to be built. `source_v3_1/` contains unmodified v3.1 source files. Missing policy decisions (G-01–G-14) are not answered by the pack. Local legal and payment conditions require review. Storefront builder is future scope; native catalog, inventory and OMS always belong to CommerceOS.
