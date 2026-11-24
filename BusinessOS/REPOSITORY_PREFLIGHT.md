# BusinessOS v3.3 repository preflight

**Date** 24 November 2026, Asia/Kolkata

**Result** Preflight complete. **BLOCKED** for advancing the v3.3 work-item queue until Product and Architecture reconcile its M00.01 scope and the previously approved ADRs with the v3.3 master.

## Sources and package integrity

The nine required v3.3 sources were present and read. The queue and trackers contain **123 matching work-item IDs**, each with one prompt. All queue paths resolve. There are **120 Business OS prompts and three deferred storefront prompts**, MF.01–MF.03. The package already contains `WORK_ITEM_STATUS.csv`. [Queue](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/PROMPT_QUEUE.csv) · [Status sheet](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/WORK_ITEM_STATUS.csv)

| Inspected source | Purpose |
|---|---|
| [Start prompt](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/00_START_HERE.md) and [README](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/README.md) | Preflight scope and execution order. |
| [Master blueprint](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md) and [Scope and evidence policy](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/SCOPE_AND_EVIDENCE_POLICY.md) | Requirements, stock-tracked baseline, synthetic-only engineering evidence, and capability boundaries. |
| [AGENTS.md](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/AGENTS.md) and [Unified prompt standard](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/UNIFIED_PROMPT_STANDARD.md) | One-item execution, approval, and verification rules. |
| [Execution roadmap](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/ENGINEERING_EXECUTION_ROADMAP.md), [Work items](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/WORK_ITEMS.csv), and [Milestone gates](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MILESTONE_GATES.md) | Item IDs, traces, sequencing, and release dependencies. |
| [Technology decisions](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/TECHNOLOGY_DECISIONS.md) | Locked foundations and choices the v3.3 pack lists as proposals. |

## Authority and conflicts

The v3.3 pack designates its `MASTER_BLUEPRINT.md` as the sole normative master **within the pack**. Approved ADRs become part of that master through its change protocol. Roadmaps, queues, prompts, and trackers derive from it. Existing engineering artifacts show what was actually approved, produced, or verified.

The repository still presents two active-looking baselines. The root [BusinessOS README](README.md) links the v3.1 execution guide. The three copies of the v3.1.0 master under `doc/` are byte-identical. The v3.3 archive and the v3.2 pack’s embedded master are identical v3.0.0 snapshots. Use those snapshots as historical references. Keep the v3.1.0 approvals and evidence traceable while reconciling them with v3.3. [Prior approved master](doc/CommerceOS_v3_1_Engineering_Development_Package/commerceos-execution-v3.1/MASTER_BLUEPRINT.md#234-adr-024-businessos-engineering-toolchain) · [v3.3 authority](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#11-document-hierarchy)

| Conflict | Impact and proposed resolution |
|---|---|
| Existing ADR-024 is approved in v3.1.0. The v3.3 technology inventory labels several of the same choices proposed. | Carry forward the recorded approval through the v3.3 change protocol. Keep genuinely open choices pending under G-18 and the relevant provider or operational gate. |
| Existing ADR-025 defines M00.01 around workspace creation, invitations, and isolation using WS-01–WS-03. The v3.3 prompt expands M00.01 to synthetic stock-led workflow hypotheses for sales, purchasing, payments, and returns. | Preserve the approved workspace evidence. Product and Architecture must decide how to carry it forward and whether to review the wider commerce hypotheses under the same work item. The prior design approval covers its reviewed revision. |
| The v3.3 M01.01 row calls for a POS shell. ADR-025 schedules POS with the optional POS capability, and the current scaffold has five apps. | Reconcile POS timing before judging the existing scaffold against the v3.3 M01.01 contract. Keep its local checks scoped to the five apps that were built. |
| Older documents used jewellery and saree pilots or real merchant signatures. The v3.3 master defines RG3 as synthetic internal readiness and uses G-16 for later external validation. A legacy M08 summary in v3.3 §22.1 still refers to merchant training. | Use the v3.3 evidence policy and RG3/G-16 distinction. Require genuine external evidence before merchant-fit or commercial claims. |
| Older planning examples mention India-specific payment and tax terms or Bengali-ready layout. The v3.3 master leaves initial jurisdiction, currencies, locale, and compliance adapters to G-17. | Treat examples and layout targets as design inputs. Any live jurisdiction-specific behavior requires the relevant approval. |

## Repository and environment findings

Git root is `D:/GIT_HUB/commerceOS`. The inspected workspace is `BusinessOS/` on `main`, at commit `959dc99` dated 24 November 2026. Git status showed existing staged and working-tree material. Preflight inspection used `git status`, `git rev-parse`, and `git log`.

| Area | Evidence in the workspace |
|---|---|
| Apps | `apps/api` has a NestJS HTTP shell. `apps/worker` boots a NestJS application context. `apps/business-web` and `apps/platform-admin` have Next.js shells. `apps/business-mobile` has an Expo Router shell. |
| Shared packages | `packages/config`, `packages/design-tokens`, `packages/ui-web`, and the scaffolded public `packages/api-contracts` and `packages/api-client` entry points. |
| Toolchain | Node.js `22.22.2`, pnpm `9.4.0`, workspace `pnpm-lock.yaml`, Turborepo, TypeScript, ESLint, and dependency-cruiser. The parent Git repository has a BusinessOS-scoped CODEOWNERS rule. |
| Test infrastructure | Lint and typecheck commands are available. Workspace Jest and Playwright binaries/configs, Docker Compose, a Prisma schema, and root GitHub Actions workflows were absent in the inspected paths. Docker, PostgreSQL, Redis, k6, and Terraform CLIs were unavailable on this shell’s PATH. |
| M00.01 | The prior workspace design, its matching human approval digest, and implementation evidence are present. Independent verification is pending. The v3.3 tracker shows `NOT_STARTED` for its wider work-item scope. |
| M01.01 | The prior tracker shows `IN_REVIEW` with local scaffold evidence. The v3.3 tracker still shows `NOT_STARTED`. |

| Check run for this preflight | Result |
|---|---|
| Source, CSV, and prompt-path validation | All nine sources, 123 queue rows, 123 prompt files, and 18 decision IDs verified. Prior M00.01 approval digest matched the design. |
| `pnpm.cmd run lint` | Passed. Dependency-cruiser checked 19 modules and eight dependencies. |
| `pnpm.cmd run typecheck --concurrency=2 --force` | Passed all nine tasks with zero Turbo cache hits. |

The prior M01.01 record contains install, build, bundle, and shell smoke results. This preflight ran lint, type checks, and document consistency checks. Integration, E2E, migrations, deployment, and load checks were not run. [Existing scaffold verification](README.md#m0101-verification) · [M00.01 approval](docs/features/M00.01/APPROVAL.md) · [M00.01 implementation evidence](docs/features/M00.01/IMPLEMENTATION_EVIDENCE.md) · [Prior work tracker](doc/CommerceOS_v3_1_Engineering_Development_Package/commerceos-execution-v3.1/WORK_ITEMS.csv)

## ADR-024 reconciliation proposal

**Status** PROPOSED for incorporation into the v3.3 master. This is a proposal to carry forward the existing approval and to bound the remaining choices. [Existing ADR-024](doc/CommerceOS_v3_1_Engineering_Development_Package/commerceos-execution-v3.1/MASTER_BLUEPRINT.md#234-adr-024-businessos-engineering-toolchain) · [v3.3 technology decisions](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/TECHNOLOGY_DECISIONS.md)

| Area | Proposed treatment |
|---|---|
| Platform foundation | Preserve the selected Node.js/TypeScript, NestJS modular monolith, PostgreSQL/Prisma, Redis/BullMQ, outbox/inbox, typed REST/OpenAPI, Expo, and pnpm/Turborepo architecture. |
| Web and UI | Carry forward approved Next.js + TypeScript, shadcn/ui + Radix + Tailwind, TanStack Query, React Hook Form + Zod, and Zustand. Preserve the App Router scaffold. Add the approved libraries where the owning work item needs them. |
| Test tools | Carry forward approved Jest, Testcontainers/PostgreSQL, Playwright, Supertest with OpenAPI contract validation, and k6. Establish runtime fixtures, local services, and CI with their owning items. |
| API adapter | Retain the current Express shell during reconciliation. Treat Fastify adoption as a proposed change requiring an explicit decision and HTTP contract compatibility checks. |
| Auth and security | Design against existing verified-identity, authorization, MFA, and redaction requirements. Keep the provider, recovery flow, and applicable authentication and delivery policy open under G-01 and related gates. |
| Delivery, cloud, and telemetry | Carry forward approved GitHub Actions, Terraform, and OpenTelemetry. Use portable container and infrastructure boundaries. Hosting, deployment targets, production capacity, and telemetry collector/exporter choices remain open. PgBouncer stays conditional on measured pressure and transaction compatibility. |

Acceptance for reconciliation is a Product and Architecture decision linked to the v3.3 master and prior approval. Verify the dependency lock and affected local checks for adopted defaults. Verify provider, hosted deployment, or telemetry changes in the applicable work item after its gate is resolved.

## G-01 through G-18 decision blockers

The table maps each gate to the portion of a work item or release that needs the decision. Planning, synthetic fixtures, and documented adapters can proceed when their own prerequisites are met. Open gates do not grant permission to activate the affected capabilities. [Master decision register](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#233-open-decision-gates-owner-must-explicitly-approve-before-identified-milestone) · [Work items](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/WORK_ITEMS.csv)

| Gate | Decision still required | Work actually blocked |
|---|---|---|
| G-01 | Verified auth method/provider, recovery, and MFA | Live identity/provider wiring in M01.07 and real owner registration and recovery in M02.01. A provider-neutral design can be reviewed. |
| G-02 | Supported item/unit types and regulated, lot/serial, or services behavior | Capability-specific M03.01–M03.02 workflows. This does not prevent the documented stock-tracked baseline from being designed. |
| G-03 | Cost, opening valuation, and return valuation policy | Costing behavior in M03.05 and M04.04 and authoritative contribution/valuation reporting in M06.10. |
| G-04 | Holds, quotes, return periods, and exception approval policy | Live TTL and approval defaults in M03.06, M04.08, and M04.10, and policy-governed returns/exchanges in M05.09–M05.10. |
| G-05 | Payment and courier providers, COD/UPI evidence, and settlement authority | Live provider calls in M05.06 and provider-dependent verification, settlement, and refunds in M06.04–M06.07. Approved synthetic/manual paths can be designed. |
| G-06 | Legal entity, tax, invoice sequence, and statutory document treatment | Tax-specific setup in M02.05, real tax calculation in M03.04/M04.04, and live statutory documents in M06.09. |
| G-07 | Plans, seat/order limits, eligible usage, overages, and prices | Commercial rules in M09.01 and M09.03–M09.06, and paid approval in M09.09. |
| G-08 | Messaging providers, customer consent, budgets, and presets | External delivery in M07.06 and live provider-backed presets in M07.08. |
| G-09 | Partner transaction and credential policy, verified payment and checkout model | Live partner writes in M10.05 and transactional certification in M10.08, alongside RG7. |
| G-10 | Attendance, leave, statutory payroll eligibility, and incentive policy | Live policy-dependent parts of M11.02–M11.08. Payroll also requires RG6. |
| G-11 | Hosting, workload sizing, budget, recovery objectives, and capacity | Hosting/target choices in M01.02/M01.09–M01.10, capacity and recovery acceptance in M08.03/M08.05/M08.07, and production scaling decisions in M12.07. |
| G-12 | Privacy, retention, subject rights, processor agreements, and exports | Policy-dependent coverage in M02.11, M07.09, M08.04, and M12.06. |
| G-13 | Revenue recognition, refund periods, and contribution definitions | Production financial metrics in M06.10 and M07.01–M07.03 that depend on approved accounting treatment. |
| G-14 | Trial/grace/overage suspension and merchant data rights | Live subscription state and suspension rules in M09.02/M09.07 and paid-launch approval in M09.09. |
| G-15 | First-pilot capability boundaries and additional business models | Commitments to expanded item models in M03.01–M03.02 and capability claims in M09.01/M09.09. M00.01 can document labeled hypotheses once its scope is reconciled. |
| G-16 | External recruitment, consent, success criteria, and actual customer evidence | External beta and paid-market claims in the M08.08/M09.09 readiness reviews. M08 internal synthetic QA remains distinct. |
| G-17 | Jurisdiction, currencies, locales, and region-specific financial adapters | Live jurisdiction-specific settings/pricing in M02.05/M03.04, payment and invoice behavior in M06.04/M06.09, and statutory payroll when enabled under M11.05–M11.06. |
| G-18 | Carry-forward of ADR-024 and approval of remaining technology choices | Further v3.3 M01.01 work that needs unsettled technology or scope choices, live auth selection in M01.07, and unsettled deployment/telemetry decisions in M01.09–M01.10. The prior five-shell evidence remains scoped to its original approval. |

## Next prompt

`prompts/M00/M00.01.md` is the first v3.3 prompt, relative to the [execution pack](prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M00/M00.01.md).

After Product and Architecture reconcile the M00.01 scope, run that one prompt against the v3.3 master, scope policy, exact work-item row, and prior approved workspace evidence. If the commerce hypothesis scope is confirmed, use fictional Tenant A/B to map the stock-tracked workflow, actors, exceptions, screens, and future validation questions. Obtain internal design and evidence review and record external validation as pending. The preflight stops here.
