# M00.05 Policy and legal decision gates

## 1. Scope and boundaries

**State** PROPOSED. **Evidence** HYPOTHESIS. External validation is PENDING. This item drafts the RG0 gate register and review process for BusinessOS. Product and Architecture need a release boundary they can verify. Finance, Legal, Security and domain reviewers need a record of what they approved, applicable scope, effective date and validation evidence. Delivery teams need to know which live behaviors remain blocked. [Work item](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M00/M00.05.md) · [Master decision gates](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#233-open-decision-gates-owner-must-explicitly-approve-before-identified-milestone)

The initial commerce model covers configurable stock-tracked goods and applicable manual/social/POS workflows. The workspace foundation remains independently useful. Non-stock, services, regulated flows, multi-currency accounting, external transactional channels and native storefront work remain governed by their existing scope and release gates. A gate decision alone does not grant tenant entitlement, role authority or deployment authorization.

## 2. Review and change journeys

1. The gate owner records a candidate decision, affected work items, scoped behavior, compatibility and rollback. The [ADR template](ADR_TEMPLATE.md) captures this information.
2. Reviewers inspect the underlying policy evidence, synthetic acceptance cases and deny behavior using the [feature approval checklist](FEATURE_APPROVAL_CHECKLIST.md).
3. Unresolved, rejected, expired or out-of-scope decisions remain **BLOCKED** for the affected capability. Safe defaults in the register apply. A partial decision may unblock only the scope explicitly approved, with the remaining scope recorded as blocked.
4. Accountable reviewers approve a specific revision, effective date and evidence set. The decision is recorded in the governing master/ADR with an auditable amendment. An independent reviewer confirms scope and tests before merge; the applicable release owner separately authorizes activation.
5. Corrections and withdrawals supersede the policy revision. Re-review dependent capability and data paths, preserve decisions already used to issue immutable records, and disable the affected action where authority is no longer current.

Reviewers need clear explanations when inputs, approvals or evidence are missing. Future workflow surfaces should carry explicit blocked, effective, expired and superseded labels; show authorized evidence only; and be readable and actionable on keyboard, assistive technology and mobile. This is a repository-document workflow. UI/API journeys for distributing or activating policy are outside this item.

## 3. Ownership

The master §23.3 names approval authorities. The [decisions log](DECISIONS_LOG.md) assigns a coordinating role for every gate, carries those authorities and ties each one to a stage and blocked capability. Founders/Product and Architecture own RG0. Policy approvers own the decision, QA verifies evidence, and the release authority owns live enablement. Gates never replace domain ownership. Payments still verifies collection and settlement, Orders still applies order policy and Inventory still owns stock changes. Payroll stays behind the workforce boundary and RG6. [M00.03 invariants](../M00.03/DESIGN.md) · [M00.04 security review](../M00.04/VERIFICATION.md)

## 4. Persistence and integrity

**NOT_APPLICABLE** to application schema, indexes and migrations. Gated domain implementations should reference immutable policy versions and tenant/jurisdiction scope on issued documents or accounting effects. Use the domain's decimal quantity and integer minor-unit contract. Treat missing policy as a blocked action, never a guessed rate, price, provider or formula. Future policy-backed writes must recheck the active decision and scoped role under the domain's transaction/version guard. Approval evidence and prior policy versions remain auditable when a revision is superseded.

## 5. Candidate approval contract

**NOT_APPLICABLE** to REST/OpenAPI, generated clients, pagination and external event schemas. A review record identifies gate, decision revision, status, authority, scope, effective window, date, source evidence, affected requirements, tests and rollback. An effective decision must cover the requested action, tenant or platform scope, applicable jurisdiction, and exact policy revision. Historical approvals, staging fixtures, screenshots and unsigned notes do not confer live authority. A future caller should receive a scoped blocked outcome for missing prerequisites. A business effect needs its own domain idempotency key and evidence; re-reading the same approval never authorizes duplicate writes.

## 6. Security and privacy

Use named scoped approvers and independent review for this high-risk design. Deployment, bootstrap and agent identities may consume approved configuration through authorized actions. They cannot approve or infer policies. Restrict access to tax and payroll workpapers and payment-provider evidence. Record opaque references and decisions, keep credentials out of the repository, and preserve branch/tenant scope on protected evidence. A role, plan entitlement or master reference does not bypass human preparation/checking or merchant verification where required.

## 7. Reliability and recovery

This item introduces no query, lock, queue or provider workload. Future services must block a gated business action if decision validity is unavailable. They should make gaps visible to scoped operators, preserve unaffected owned-data access, and retain policy versions for replay and audit without reissuing effects. Drive retries through the domain's idempotency and reconciliation controls. Transition metrics, availability, backup, capacity and recovery targets require G-11 and runtime evidence.

## 8. Verification plan

Run the [planning verifier](VERIFICATION.md#reproduce-the-checks) against the master, decisions log, earlier ADR record, and [synthetic fixtures](PLANNING_EVIDENCE.md#approval-model-fixtures). Check all 18 gates, authority/deadline consistency, the historical toolchain carry-forward and both blocked and simulated authorized policy paths. Negative cases cover unsigned, self-approved, stale, mismatched-scope and replayed decisions. Runtime HTTP, PostgreSQL, UI, provider, financial, payroll and load checks belong to the implementing slices.

## 9. Operations

Maintain a review trail with version, role, scope, evidence references and disposition. Surface missing approvals and policy withdrawal to the owning reviewer without exposing sensitive source material. On withdrawal, assess dependent releases, turn off the affected live path and reconcile any already-issued documents under authorized correction rules. No deployment, live feature flags, recovery drill or cost measurement occurs in M00.05.

## 10. Decision status

| State | Decision and owner |
|---|---|
| CONFIRMED | The applicable master, approval authorities, milestone deadlines and safe defaults come from §23.3. The prior scope's ADR-024 records the existing approved technical choices. |
| PROPOSED | Product and Architecture review carrying that exact ADR-024 scope into v3.3. The [carry-forward proposal](PLANNING_EVIDENCE.md#adr-024-carry-forward-proposal) lists outstanding selections separately. |
| BLOCKED | The v3.3 gate register records 18 unresolved gates. M00.04 acceptance, M00.05 human approval, independent review and RG0 evidence are pending. No effective ADR amendment is included. |
