# CommerceOS — start development in the correct order

**Read first:** MASTER_BLUEPRINT.md (the authority), then AGENTS.md, then ENGINEERING_EXECUTION_ROADMAP.md Sections 1–5, then WORK_ITEMS.csv. Do not hand a coding agent the full roadmap as one coding task.

## First 18 work items, sequentially

- [ ] M00.01: confirm the two pilot merchant workflows and exceptions.
- [ ] M00.02: approve bounded-context ownership and prohibition of direct cross-module table writes.
- [ ] M00.03: freeze business state-machine diagrams and impossible-state tests.
- [ ] M00.04: approve per-tenant/branch/field access matrix and threat model.
- [ ] M00.05: assign G-01…G-14 approvers; decide which capabilities must remain disabled.
- [ ] M00.06: sign UAT scenarios, test fixtures and workload/SLO assumptions. **RG0 check.**
- [ ] M01.01: initialize pnpm monorepo and independent app shells; no storefront runtime.
- [ ] M01.02: enable reproducible local PostgreSQL/Redis/object-storage test services.
- [ ] M01.03: install versioned API conventions, DTO validation, OpenAPI and typed clients.
- [ ] M01.04: create safe migrations/transaction/money/decimal toolkit and test database.
- [ ] M01.05: enforce trusted tenant/branch context in API and worker boundaries.
- [ ] M01.06: deliver outbox/inbox dedupe, BullMQ retries and DLQ replay tests.
- [ ] M01.07: add auth-provider abstraction, secure config and secret handling.
- [ ] M01.08: add permissioned file/media storage and scanning hooks.
- [ ] M01.09: run CI/security scan/staging release/rollback and feature flag checks.
- [ ] M01.10: implement redacted logs, request traces, metrics, alert owners and runbooks.
- [ ] M02.01: implement approved verified owner authentication/recovery/MFA.
- [ ] M02.02: implement verified tenant memberships, tenant switch and two-tenant isolation.

## First business-visible demo

After M02.01–M02.06 and M02.09: owner registers, creates Tenant A, chooses first branch/location, configures business, invites cashier and safely resumes setup. At this stage, **do not advertise order handling or payments until M03–M06 have domain integrity evidence**.

## First commercially meaningful demo

After M03.01–M05.12 and applicable M06 slices: Merchant can create a SKU, reserve the last unit, convert an enquiry to an order, pick/pack/dispatch and reconcile one verified collection with stock and customer balance; run the same with Tenant B and assert total isolation.

## Strict gates

- RG0 before implementing contentious domain rules; RG1 after M02 security verification.
- RG2 before money/stock/return pilot transactions, RG3 and required RG5 proof before merchant pilot.
- RG4 before paid subscription release; RG7 before transactional custom storefront API; RG6 before payroll enablement.
- Storefront builder and native storefront remain M-F, a future separately approved program.

## Agent execution

Select one row `MXX.YY` in WORK_ITEMS.csv. Paste it into the corresponding `prompts/MXX*.md` with master requirement IDs. Require migration+domain+API+UI+tests+security+observability+rollback evidence before moving to the next row. Record owner, actual result and gate status in the CSV; never mark unverified tests as passed.
