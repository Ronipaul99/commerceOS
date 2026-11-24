# M00.04 Threat model and permission matrix

## 1. Scope and boundaries

**Status** PROPOSED. **Evidence** HYPOTHESIS. External validation is PENDING. This design covers access to stock-tracked business workflows in Tenant A (manual/POS) and Tenant B (multi-branch and manual/social). An access grant is usable only with the corresponding feature entitlement and policy. Provider ingress and external API credentials are modeled trust boundaries. Partner writes, native storefront, non-stock and regulated workflows, and unapproved payroll or accounting policy are outside this item. [Master blueprint](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md) · [Work item](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M00/M00.04.md)

A cashier needs orders and register operations in an assigned branch. A manager needs branch oversight without tenant-wide administration. An owner manages the tenant and delegates bounded rights. An employee sees authorized self-service records. Support sees narrow diagnostics with an independently approved case. API credentials and workers have separate machine authority. The [permission workbook](PERMISSION_WORKBOOK.md) records candidate object, action, scope and field decisions.

## 2. Primary and alternate journeys

The server resolves the verified identity and current membership, validates the proposed tenant/branch selection, and looks up the resource within that scope. It authorizes object, action and field profile before returning data or invoking a domain owner. Cashiers and branch managers see permitted branches. Owners can access their tenant's operational data, with separate permissions required for restricted HR, finance and credentials. Multi-tenant users select an authorized membership and invalidate stale client context on switch.

Platform diagnostics require privileged MFA and an approved, time-limited grant scoped to a tenant, ticket, action and diagnostic resource, with consent or other authority under reviewed policy. No tenant impersonation in the baseline. Expiry, closure or revocation ends access. The operator cannot approve or extend their own grant. Failed attempts produce redacted audit signals and a generic denial. A hidden object and a missing object share the same outward presentation where existence is protected.

Future web/mobile/POS surfaces distinguish stale permissions, pending approvals, unavailable evidence and genuine errors. Use text and keyboard-accessible controls and render authorized fields only. Preserve scoped drafts where policy permits, and reauthorize on submission. Feature-specific UI and HTTP delivery are outside M00.04.

## 3. Domain and trust boundaries

| Boundary | Authority and constraints |
|---|---|
| Web, Mobile, POS → Business API | Inputs are untrusted. Resolve session, membership, role assignments, branch scope and entitlement server-side. POS also checks the open register and authorized shift. |
| Platform Admin → support policy | Separate authenticated control-plane principal and audited ticket grant. Emit only allowlisted, redacted diagnostics. |
| Integration client → partner policy | Use scoped server credentials with tenant, channel, audience, operation, branch where relevant and status resolved at use. Never translate an API key into a human or worker principal. |
| Outbox/queue → domain worker | Authenticate the service identity, restrict queue consumption, correlate with an authoritative stored job/event and bind tenant, location, target, operation and source reference. Queue message fields alone confer no authority. |
| External provider → ingress adapter | Validate signature, account binding, accepted event type and evidence before dispatching a scoped owner command. Provider facts cannot bypass state or money guards. |
| API/worker → PostgreSQL, object storage and exports | Scope queries and writes before data is fetched. Access objects through domain policy and a scoped file broker. Apply the same row/field restrictions to lists, search, counts and exports. |

Access Control owns membership, grants and revocation. Support authorization belongs to the platform policy. Commerce, Inventory, Payments, HR and Subscription Billing own their data and transitions. Storage brokers delivery after authorization by the owning domain. Projections do not confer permission. Sensitive actions recheck policy inside the transaction or compare the current policy version at commit. [M00.02 ownership](../M00.02/DESIGN.md) · [M00.03 invariants](../M00.03/DESIGN.md)

## 4. Persistence and integrity

Physical tables, indexes and migration/backfill are **NOT_APPLICABLE** for this planning item. Later slices use tenant-consistent composite references for orders, branches, stock locations, files and memberships. Branch relations must also match their tenant and, where constrained, the owning branch or location. Enforce same-scope references in the service and database. Track scoped grant changes and approval/revocation history. Apply current authorization before idempotency lookup to prevent cached results crossing roles or tenants.

For stock and money effects, bind owner commands to stable business keys, enforce decimal quantities and integer minor-unit amounts in the domain, and commit audit/outbox with the authoritative write. Grant changes and maker-checker actions need transactional version guards. Preserve immutable stock, allocation, invoice and payroll history. Corrections append authorized effects. Future migration evidence must verify scoped backfills, invariants and rollback compatibility.

## 5. Candidate contracts

Routable REST/OpenAPI, generated clients and pagination changes are **NOT_APPLICABLE**. A policy decision concept takes a verified principal type, active grants, canonical resource metadata, requested action and allowlisted field profile. A grant can narrow authority, while explicit prohibitions and absent prerequisite gates deny. Combining roles must never borrow a branch grant from one role to extend another. A browser-supplied scope, role, identity, settlement state or job authority is rejected as a write input.

Use explicit command DTOs and response projections. Reject disallowed mutation fields before persistence and apply allowlisted projection before serialization. Scopes that hide existence return a generic object-unavailable result. Clients can distinguish a stale command conflict and an attributable evidence-pending result only when independently authorized to see the object. On retries, verify current authority and payload hash before returning cached results.

## 6. Security and privacy

The [threat model and register](PLANNING_EVIDENCE.md#threat-register) pair the trust boundaries with required controls and future acceptance tests. Apply the workbook's deny-by-default rules to every read, write and export. Use MFA and step-up for privileged actions, secure session rotation/revocation, least-privilege machine credentials, rate limiting and anti-CSRF checks for cookie-based mutations. Credential secrets and private objects use encrypted storage and transport. Credential issuance, revocation and secret reveal require narrowly scoped actions. Signed payment evidence and independent maker-checker decisions remain domain requirements.

Private downloads use a proposed application-signed reference redeemed through an authenticated broker. Bind it to a principal/session or explicitly authorized service, tenant, resource, purpose, audience and expiration. At redemption, recheck current grants, object version and scan/revocation state. The broker streams the authorized object without forwarding a storage bearer URL. Disable shared caching and redact download material from logs and referrers. Support diagnostics exclude merchant attachments. See [classification and retention](PLANNING_EVIDENCE.md#classification-and-retention).

## 7. Scale and recovery

Hypothetical hotspots are permissioned search/export, register traffic, provider bursts and queue retries. Query by scoped keys and authorize before pagination or aggregation. Use bounded policy caching keyed by principal, scope and policy version, with invalidation on revocation and fail-closed privileged actions. Recheck the current grant after long-running export generation before releasing the artifact. Bound rate and queue concurrency per tenant/principal and cap response and export size. Runtime load, queue latency, identity timeout and revocation propagation targets remain G-11 measurements.

Duplicate verified events are deduplicated per tenant/provider account, with separate business-operation uniqueness for financial or stock effects. Scope or evidence mismatch does not mutate authority. Failed worker attempts surface in restricted diagnostics with bounded retries and a dead-letter path. Re-drive requires an authorized case and original source identifiers. Time, credential, entitlement or signature gaps require reconciliation before a new financial or stock effect.

## 8. Verification plan

Run the [model checks](VERIFICATION.md#reproduce-the-checks) against the workbook and synthetic fixtures. Verify cashier, manager, owner and support outcomes, then assert denials for object/branch ID mismatch, excess fields, unauthorized grants, untrusted worker context, file forwarding, forged payment evidence and inconsistent references. Test scoped finance approval, job/provider replay and unchanged stock/money after denial. Runtime HTTP, PostgreSQL, storage, queue, provider, accessibility, security and performance tests belong to the implementing slices and RG1/RG2.

## 9. Operations

Log a redacted decision code, opaque principal/resource reference, scoped correlation, policy version, authorization result and case/grant identifiers where relevant. Restrict audit queries and preserve the source record with an authorized export rather than copying sensitive payloads. Alert on denied privilege change, repeated cross-scope attempts, questionable webhook evidence, unusual support use and unexpected export volume. A suspected compromise triggers scoped access revocation, artifact invalidation, event containment and preservation of restricted evidence. Recovery and restore drills must verify revoked grants and restricted files stay inaccessible. No rollout, operational run or cost measurement is part of M00.04.

## 10. Decision log and approval

| State | Decision and owner |
|---|---|
| CONFIRMED | Master §§3, 16.2 and 20 and ADR-004/005/016/021 establish role and scope boundaries, verified money authority, scoped external contracts and segregated audited support. |
| PROPOSED | Security and Architecture review the matrix defaults, protected field profiles, delegated grant rules, support ticket criteria and identity-bound private file broker. This model favors revocation at data access over a transferable download. |
| BLOCKED | Security must approve the matrix and explicit deny cases, with independent review before merge. M00.03 acceptance and RG0 signoff remain pending. G-01 identity/recovery decisions require Product and Security. G-12 retention/privacy decisions require Privacy/Legal and Security. RG1 runtime evidence belongs to implementation. |
