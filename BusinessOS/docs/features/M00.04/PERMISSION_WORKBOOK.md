# M00.04 Permission workbook

**State** PROPOSED for Security and Architecture review. All entries are candidate allow rules. Missing rules deny. Human roles apply only through active tenant membership and a grant for the same role and resource scope. Distinct machine and platform principals have their own rules. A permission never confers feature entitlement or domain authority. [Design](DESIGN.md)

## Scope and guard keys

| Scope | Required match |
|---|---|
| SELF | Selected tenant and the subject's linked employee identifier. An HR record and global user are distinct. |
| BRANCH | Selected tenant, resource branch, and a branch assigned to this role within the active membership. Apply location, register or shift limitations where relevant. |
| TENANT | Selected tenant and an active tenant-wide permission for this action. Restricted classes still require their own roles. |
| TICKET | Separate platform principal, current MFA, independently approved ticket, authorized purpose/consent basis, tenant and exact diagnostic target, action, expiry and revocation checks. |
| CHANNEL | Active credential in the correct audience with matching tenant/channel, approved capability/scope and access to the published projection. |
| JOB | Authenticated service and permitted queue/operation, with an authoritative job/event bound to tenant, branch, object, action, version and source. |

All applicable guards are cumulative. Human roles cannot be activated using an API key, provider message or job payload. Scope mismatch is denied even when the requested object's identifier also exists in an authorized tenant. Role grants are evaluated individually. Optional capabilities require entitlements and governing release approval. Existing authoritative invariants remain in force for otherwise authorized commands.

## Object and action rules

| Rule | Role | Object | Action | Scope | Field profile | Required guard |
|---|---|---|---|---|---|---|
| W01 | CASHIER | ORDER | READ | BRANCH | ORDER_SUMMARY | ACTIVE_REGISTER |
| W02 | CASHIER | REGISTER | READ | BRANCH | REGISTER_SUMMARY | ASSIGNED_SHIFT |
| W03 | CASHIER | REGISTER | RECORD_TENDER | BRANCH | TENDER_INPUT | ASSIGNED_SHIFT |
| W04 | BRANCH_MANAGER | ORDER | READ | BRANCH | ORDER_SUMMARY | NONE |
| W05 | BRANCH_MANAGER | REGISTER | READ | BRANCH | REGISTER_SUMMARY | NONE |
| W06 | BRANCH_MANAGER | ORDER | REQUEST_CANCELLATION | BRANCH | CANCELLATION_INPUT | DOMAIN_POLICY |
| W07 | BRANCH_MANAGER | REPORT | READ | BRANCH | BRANCH_TOTALS | NONE |
| W08 | OWNER | ORDER | READ | TENANT | ORDER_SUMMARY | NONE |
| W09 | OWNER | MEMBERSHIP | READ | TENANT | MEMBER_SUMMARY | NONE |
| W10 | OWNER | MEMBERSHIP | GRANT_ROLE | TENANT | GRANT_INPUT | BOUNDED_GRANT |
| W11 | OWNER | REPORT | READ | TENANT | BRANCH_TOTALS | NONE |
| W12 | BUSINESS_ADMIN | MEMBERSHIP | READ | TENANT | MEMBER_SUMMARY | NONE |
| W13 | SALES_AGENT | ORDER | READ | BRANCH | ORDER_SUMMARY | NONE |
| W14 | SALES_AGENT | CUSTOMER | READ | BRANCH | CUSTOMER_MINIMUM | ACTIVE_PURPOSE |
| W15 | PICKER_PACKER | SHIPMENT | READ | BRANCH | PICK_SUMMARY | ASSIGNED_TASK |
| W16 | PICKER_PACKER | SHIPMENT | RECORD_PACK | BRANCH | PACK_INPUT | ASSIGNED_TASK |
| W17 | INVENTORY_CONTROLLER | STOCK_POSITION | READ | BRANCH | STOCK_SUMMARY | NONE |
| W18 | INVENTORY_CONTROLLER | STOCK_POSITION | PROPOSE_ADJUSTMENT | BRANCH | ADJUSTMENT_INPUT | DOMAIN_POLICY |
| W19 | PURCHASE_MANAGER | PURCHASE_ORDER | READ | BRANCH | PURCHASE_SUMMARY | NONE |
| W20 | PURCHASE_MANAGER | PURCHASE_ORDER | APPROVE | BRANCH | APPROVAL_INPUT | DISTINCT_CHECKER |
| W21 | FINANCE | COLLECTION | READ | TENANT | MONEY_SUMMARY | NONE |
| W22 | FINANCE | COLLECTION | APPROVE_REFUND | TENANT | APPROVAL_INPUT | DISTINCT_CHECKER |
| W23 | HR_ADMIN | EMPLOYEE | READ | TENANT | HR_SUMMARY | HR_ACCESS |
| W24 | EMPLOYEE | EMPLOYEE | READ | SELF | SELF_SUMMARY | NONE |
| W25 | EMPLOYEE | FILE | DOWNLOAD | SELF | FILE_METADATA | FILE_POLICY |
| W26 | SUPPORT | DIAGNOSTIC | READ | TICKET | REDACTED_DIAGNOSTIC | SUPPORT_GRANT |
| W27 | API_KEY | CHANNEL_PRODUCT | READ | CHANNEL | PUBLIC_CATALOG | CHANNEL_READ |
| W28 | WORKER | RESERVATION | EXPIRE | JOB | EXPIRY_INPUT | AUTHORITATIVE_JOB |
| W29 | FINANCE | FILE | DOWNLOAD | TENANT | FILE_METADATA | FILE_POLICY |
| W30 | OWNER | EXPORT | READ | TENANT | EXPORT_METADATA | SCOPED_EXPORT |

## Field profiles

Field sets are intentionally small examples. READ/DOWNLOAD expose only fields listed for the matching profile. Write inputs use the named fields only and reject unknown fields. Object IDs, versions and keys supplied for routing or concurrency never confer scope or permission. Domain-specific response fields must be reviewed before expanding these sets.

| Profile | Allowed fields | Notes |
|---|---|---|
| ORDER_SUMMARY | orderRef, branchRef, lineCount, operationalStatus, amountDueMinor, currency | Customer contact, unit cost and raw payment evidence are restricted. |
| REGISTER_SUMMARY | registerRef, branchRef, shiftRef, shiftStatus | No customer or bank details. |
| TENDER_INPUT | orderRef, tenderType, amountMinor, operationRef | Domain verifies assigned register, amount and evidence. A tender command cannot directly set a paid or settled flag. |
| CANCELLATION_INPUT | lineRef, quantity, reasonCode, expectedVersion, operationRef | Request is distinct from owner-authorized commit. |
| BRANCH_TOTALS | branchRef, periodRef, orderCount, salesTotalMinor, currency | Compute over authorized rows only. |
| MEMBER_SUMMARY | membershipRef, displayName, roleLabels, branchRefs, status | Credentials and workforce data excluded. |
| GRANT_INPUT | membershipRef, roleRef, branchRefs, expectedVersion, reasonCode | Tenant and acting owner resolved server-side. |
| CUSTOMER_MINIMUM | customerRef, displayName, contactMasked | Purpose-limited branch access. |
| PICK_SUMMARY | shipmentRef, packageRef, skuRef, quantity, locationRef | No customer contact, payroll or payment data. |
| PACK_INPUT | packageRef, quantity, operationRef, expectedVersion | Domain verifies quantity and assignment. |
| STOCK_SUMMARY | variantRef, locationRef, sellableQty, reservedQty, availableQty | No supplier cost or private attachments. |
| ADJUSTMENT_INPUT | variantRef, locationRef, quantityDelta, reasonCode, expectedVersion | Proposal only. Ledger posting requires separate authority. |
| PURCHASE_SUMMARY | purchaseRef, status, branchRef, outstandingQty | Supplier financial details excluded. |
| APPROVAL_INPUT | requestRef, reasonCode, expectedVersion, operationRef | Resolve maker, amount, eligibility and version independently. |
| MONEY_SUMMARY | collectionRef, currency, capturedMinor, refundableMinor, reconciliationStatus | Bank identifiers and raw provider credentials excluded. |
| HR_SUMMARY | employeeRef, displayName, assignedBranchRefs, employmentStatus | Payroll and salary access require separate gated profile. |
| SELF_SUMMARY | employeeRef, displayName, ownLeaveBalance, attendanceState | Linked employee record only, where enabled. |
| FILE_METADATA | fileRef, purpose, mediaType | The broker delivers file bytes through a separate redemption guard. |
| REDACTED_DIAGNOSTIC | ticketRef, incidentCode, healthStatus, lastTransitionAt | No attachments, merchant objects or free-form raw payload. |
| PUBLIC_CATALOG | skuRef, publicLabel, publishedAvailability | Channel-specific public projection. No tenant-wide inventory, cost or customer fields. |
| EXPIRY_INPUT | reservationRef, expectedVersion, operationRef | Bind to authoritative recorded job. Eligible active hold and time checked by Inventory. |
| EXPORT_METADATA | exportRef, dataset, status, expiresAt | Metadata alone confers no artifact access. Source permissions checked at generation and release. |

## Explicit denials and approval boundaries

- Tenant owner may delegate an approved subordinate role within their tenant and active grantable branches. Reject self-change, adding owner/platform/HR or independently restricted finance powers through the baseline grant action, unapproved branch values and cross-tenant subjects. Transfers or privileged grants require separately designed authorization and review.
- Make and approve identities must differ where maker-checker is required. Compare canonical server-side identities, purpose, entitlement, amount/policy and request version before acting. The workbook grants no direct refund, settlement, write-off, payroll finalization or immutable-document rewrite.
- Tax identifiers, payroll, tokens, signing keys, bank references and raw provider/broker evidence are outside general-purpose order/report/support projections. Owner status by itself does not unlock any of them.
- FILE_POLICY allows only the role, classification, owner domain, and purpose stated by the file policy. Employee download covers an authorized self-service document. Finance download covers approved finance evidence. Broker redemption rechecks identity/session, source object scope, purpose/version and current grant, even if the same signed reference was accepted earlier.
- Workers may call only the named owner operation. Browser users, API keys and queue data alone do not authenticate a service. Provider ingress is independently verified and has no general workbook grant.
- An outward generic unavailable response must not differentiate absent from unauthorized objects in existence-protected surfaces. Deny stale/revoked grants, disabled entitlements, unapproved partner writes and support access outside its target or ticket. Apply the same policy to export, search, list and derived diagnostics.

**Approval record** Security reviewer, independent reviewer, decision, date and evidence links are pending.
