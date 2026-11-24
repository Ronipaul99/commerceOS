# M00.05 Decisions log

**RG0 gate register** 24 November 2026. **Decision states** APPROVED or BLOCKED. Every row is BLOCKED at this v3.3 review because a current, effective v3.3 approval covering the listed decision is absent. G-18 preserves the prior ADR-024 approval in its original scope. The proposed carry-forward remains under review. G-16 external validation remains PENDING. RG0 signoff is a separate Founder/Product and Architecture decision. [Master §23.3](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#233-open-decision-gates-owner-must-explicitly-approve-before-identified-milestone)

## Gate register

The coordinating role gathers evidence and prepares the proposal. Required approvers and due wording follow the master. For multi-stage deadlines, each dependent capability must clear its relevant decision before the identified stage or first live use. The safe default is the posture while approval is pending.

| Gate | Status | Coordinating role | Required approvers | Due before | Safe default while blocked | Capability blocked |
|---|---|---|---|---|---|---|
| G-01 | BLOCKED | Identity lead | Product + Security | M02 | Require verified owner identity. Keep provider-neutral design and synthetic auth fixtures. | Live authentication provider, OTP factors, recovery method and delivery budget; apply before provider-dependent work. |
| G-02 | BLOCKED | Product | Product + Domain/Legal reviewer where applicable | M03 | Configurable stock-tracked items and units under baseline validation. | Services, regulated items, lots/serials and unapproved item or unit semantics. |
| G-03 | BLOCKED | Finance | Finance + Product | M03/M06 | Record raw cost snapshots and label incomplete coverage. | Approved valuation, opening costs, return costing and authoritative contribution reporting. |
| G-04 | BLOCKED | Product owner | Product owner + external customer validator (when available) | M04/M05 | Require configurable policy and setup before live use. | Live quote/hold defaults, expiry and return/refund periods, and policy-dependent exception thresholds. |
| G-05 | BLOCKED | Payments lead | Product + Finance + Security | M06 | Use mocks or explicitly authorized manual workflows within scope. Keep capture and settlement separate. | Live payment/courier provider operations, COD/UPI verification and approved capture/settlement evidence rules. |
| G-06 | BLOCKED | Tax reviewer | Tax accountant/legal + Merchant | M06/live tax invoice | Disable tax-specific behavior without an approved applicable policy. | Live tax calculation and statutory invoices, invoice series, e-invoicing treatment and return documents. |
| G-07 | BLOCKED | Founder | Founder + Finance | M09 | Treat tiers as experiments. Leave prices, allowances and charge policy unset. | Live plan prices, taxes on plans, quotas/eligibility, refund adjustments and overage charging. |
| G-08 | BLOCKED | Product | Product + Legal + Security | M07 | In-app tasks/notifications only under applicable authority. | External delivery, consent rules, external cost caps and live enabled presets. |
| G-09 | BLOCKED | Integrations lead | Architecture + Security + Product owner | M10 | Plan a governed read-only surface under its own release review. Keep partner writes disabled. | Live transactional partner checkout, verified payment and certification. RG7 also applies. |
| G-10 | BLOCKED | HR | HR + Payroll/Legal + Merchant | M11 | Keep statutory automation and payroll payout disabled. | Live attendance/leave policy, statutory payroll formulas, proration, incentives and payout. RG6 also applies. |
| G-11 | BLOCKED | Platform lead | Platform lead + Product | M01/M08 | Keep container delivery portable and readiness claims evidence-based. | Hosting/capacity target commitments, production topology, recovery targets, budgets and workload qualification. |
| G-12 | BLOCKED | Privacy/Legal | Privacy/Legal + Security | M08 | Minimize data and restrict access. Leave retention schedule pending counsel. | Live policy-specific retention/deletion, processor agreements, sensitive exports and compliance assertions. |
| G-13 | BLOCKED | Accountant | Accountant + Product | M06/M07 | Label operational estimates and coverage. Avoid accounting profit claims. | Recognition basis, refund periods and approved contribution definitions for reports. |
| G-14 | BLOCKED | Founder | Founder + Legal | M09 | Preserve historical read/export access. Apply only authorized limits to new high-risk actions after notice. | Live trial/grace, suspension, overage collection and data rights policies. |
| G-15 | BLOCKED | Product | Product + Architecture | M00/M03 | Plan stock-tracked trade/POS baseline within applicable entitlements. Keep unsupported capabilities invisible/disabled. | Expanded first-pilot scope and live unsupported non-stock, service, wholesale, manufacturing, serial/lot or merchant subscription features. |
| G-16 | BLOCKED | Product/Research | Product/Research + QA | Before external beta/paid market claims | Use labeled fictional Tenant A/B for internal synthetic QA. | External beta/paid-market claims, evidence of merchant fit and real customer validation. |
| G-17 | BLOCKED | Product | Product + Finance/Legal + Architecture | M00/M06 | Permit schema-safe settings and generic fixtures. Disable jurisdiction-specific live documents/payments without approval. | Live region/currency/locale policy and jurisdiction-specific payment, invoice and applicable payroll adapters. |
| G-18 | BLOCKED | Architecture | Architecture + Product | Before M01.01 / auth-dependent implementation | Keep the v3.3 locked baseline and respect earlier approval in its recorded scope. | v3.3 ADR-024 adoption, unsettled stack choices and provider-dependent implementation. |

## Recording a decision

For each reviewed revision capture gate ID, decision text, accountable role, actual approvers and authority, status, approval date, effective scope and date/window, requirement delta, evidence and test references, applicable releases, and supersession or rollback. Enter APPROVED only when the required authorities have approved that exact scope and the approved change is recorded in the governing master/ADR. An unresolved clause stays BLOCKED even when another clause has sufficient evidence. See the [ADR template](ADR_TEMPLATE.md) and [approval checklist](FEATURE_APPROVAL_CHECKLIST.md).

**Review record** Pending. No live policy, vendor, rate, price, payroll formula or effective v3.3 toolchain amendment is authorized by this log.
