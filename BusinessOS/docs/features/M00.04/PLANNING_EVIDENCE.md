# M00.04 planning evidence

**Evidence class** HYPOTHESIS. Tenant A and Tenant B, their actors and all values below are fictional. External validation is PENDING. These cases evaluate proposed controls in the [design](DESIGN.md) and [permission workbook](PERMISSION_WORKBOOK.md).

## Trust-boundary attack tree

Root harm: a principal reads protected data or causes an unauthorized authoritative effect. The branches describe failure modes and the controls that must stop them.

- **Access outside the permitted tenant or branch**
  - Object, list, export or relational reference crosses scope. Resolve tenant from verified identity, apply branch-scoped query and field policy, and enforce tenant-consistent foreign keys.
  - A delegated or privileged grant expands scope. Verify canonical maker/checker, grant ceilings, current entitlement and target eligibility. Bind support approvals to diagnostics and invalidate on revocation.
- **Use a credential or delivery channel outside its purpose**
  - Worker context, integration key or provider event appears in the wrong trust lane. Authenticate identities separately, verify audience/account, and bind to an authoritative job or verified event.
  - Private-file reference reaches an unexpected recipient. Require identity-bound redemption, current source rights, exact purpose and short expiration.
- **Cause an unauthorized or repeated state change**
  - Extra input bypasses a restricted action. Enforce a narrow command DTO and domain owner guards, with authoritative stock/money state independent of request fields.
  - A repeated or out-of-order message repeats a money or stock effect. Separate verified-event dedupe, domain idempotency and reconciliation.
- **Retain or expose data through a secondary surface**
  - Search totals, support diagnostics, exports, raw logs or backups reveal restricted fields. Scope the query before aggregation, minimize fields, use narrow auditable roles and apply the approved retention schedule.

## Threat register

Ratings are qualitative design priorities. Residual risk and accountability require reviewer acceptance and runtime evidence.

| ID | Risk | Priority | Required control | Review owner and evidence |
|---|---|---|---|---|
| T01 | Object/branch authorization or IDOR/BOLA | Critical | Verified membership and scoped object lookup, branch-specific grants, non-disclosing denial | Security and Data, C02/C03 plus PostgreSQL and HTTP |
| T02 | Mass assignment and action bypass | High | Strict input profile and independent command rights, current entitlements and output profile | API and Security, C04 plus DTO and endpoint checks |
| T03 | Role escalation or stale permission | Critical | Bounded delegation, deny self/privileged grant, revocation and policy version checks | Identity and Security, C03/C05 plus role lifecycle tests |
| T04 | Worker impersonation or wrong-scope job | Critical | Service identity, immutable stored operation context, queue and current object scope | Platform and Security, C06/C09 plus queue integration |
| T05 | Private file-link leakage or untrusted upload | High | Identity-bound broker, current object policy/version, quarantine and scan before download, cache/log controls | Storage and Security, C07 plus real signed-reference and scan tests |
| T06 | Forged/replayed provider event or incorrect financial state | Critical | Signature/account verification, event dedupe, domain effect key and separate settlement authority | Payments and Security, C09 plus provider fixture integration |
| T07 | Cross-tenant FK or related resource mismatch | Critical | Composite tenant references and owner-domain branch validation | Data and QA, C03 plus migration/DB constraints |
| T08 | Compromised or over-permissioned support | Critical | MFA, timeboxed separate approval, target scope, redaction, revocation and audited use | Platform and Security, C02/C08 plus production-like control-plane checks |
| T09 | Restricted fields leak through export/search/report | High | Filter before aggregates, allowlisted projections, row and field checks at export generation/retrieval | Privacy and QA, C04/C08 plus search and export tests |
| T10 | Stock race, refund abuse or subscription misuse | Critical | Transactional domain invariants, distinct checker when required, stable effect key and separate billing authority | Inventory, Finance and Billing, C05/C09 plus concurrency and ledger tests |
| T11 | Key disclosure, weak recovery or unsafe outbound webhook | High | Separate scoped credentials and rotation, privileged MFA and recovery limits, validated outbound destinations after resolution/redirect | Identity, Integrations and Security, C06 plus future recovery, credential and egress tests |

## Classification and retention

| Class | Data and purpose | Access and disposition proposal |
|---|---|---|
| PUBLIC | Approved channel catalog projection | Publish allowlisted fields only. Unpublish when source permission or publication expires. |
| INTERNAL | Operational summaries, redacted diagnostics, scoped audit metadata | Read within active role or ticket purpose. Minimize payloads and restrict exports. Archive or dispose under approved schedules. |
| CONFIDENTIAL | Customer/staff PII, private files, merchant operational and finance records | Apply row and field controls, purpose and consent/notice, restricted export, encrypted storage and auditable use. Segregate access/correction/deletion requests with identity verification. |
| RESTRICTED | Credentials/signing material, payroll/salary, bank identifiers, sensitive payment evidence and backups containing those classes | Use dedicated authorities, encryption and redaction. Rotate/revoke credentials. Protect financial history and legally retained evidence with narrow preservation and access. |

G-12 owns the schedule and approved processing purposes, retention triggers and approved periods, responsible roles, deletion/anonymization exceptions, legal holds, backup expiry, processor agreements, and breach response. A verified, scoped exporter applies the workbook to each dataset. A reviewed deletion workflow must cover objects, exports and projections, preserve any required records, and reconcile stale backup copies after restore. G-06/G-17 govern jurisdiction-specific evidence retention. No retention duration, legal conclusion or third-party processor is assumed.

## Synthetic case inputs

Tenant A has object aliases also used in Tenant B. Tenant B has two branches. Profiles are resolved from verified model inputs. Positive and negative decisions apply before state access or mutation.

~~~json
{
  "provenance": "HYPOTHESIS",
  "external_validation": "PENDING",
  "objects": {
    "a_order": ["ORDER", "A", "A1", "ORDER-01"],
    "b_order": ["ORDER", "B", "B1", "ORDER-01"],
    "b_other": ["ORDER", "B", "B2", "ORDER-02"],
    "a_membership": ["MEMBERSHIP", "A", null, "MEMBER-02"],
    "b_membership": ["MEMBERSHIP", "B", null, "MEMBER-02"],
    "a_register": ["REGISTER", "A", "A1", "REG-01"],
    "a_diag": ["DIAGNOSTIC", "A", null, "DIAG-01"],
    "a_other_diag": ["DIAGNOSTIC", "A", null, "DIAG-02"],
    "b_diag": ["DIAGNOSTIC", "B", null, "DIAG-01"],
    "a_private": ["FILE", "A", null, "FILE-01"],
    "a_collection": ["COLLECTION", "A", null, "COLL-01"],
    "a_hold": ["RESERVATION", "A", "A1", "HOLD-01"],
    "b_hold": ["RESERVATION", "B", "B1", "HOLD-01"],
    "a_catalog": ["CHANNEL_PRODUCT", "A", null, "CHANNEL-01"]
  },
  "principals": {
    "cashier": ["cashier", "HUMAN", "A", "CASHIER", ["A1"]],
    "manager": ["manager", "HUMAN", "B", "BRANCH_MANAGER", ["B1"]],
    "owner": ["owner", "HUMAN", "A", "OWNER", ["A1"]],
    "support": ["support", "SUPPORT", null, "SUPPORT", []],
    "employee": ["employee", "HUMAN", "A", "EMPLOYEE", []],
    "finance": ["finance", "HUMAN", "A", "FINANCE", []],
    "key": ["key", "API_KEY", "A", "API_KEY", []],
    "worker": ["worker", "WORKER", "A", "WORKER", ["A1"]]
  },
  "money": {"due": 6000, "verified_collection": 6000, "refund_request": 1000},
  "stock": {"sellable": "1", "held": "1"},
  "file": {"resource": "a_private", "purpose": "self_service", "audience": "file_broker", "version": 3}
}
~~~

## Review handoff

Security reviews each allow profile, explicit deny and threat mapping. Architecture reviews authority and object scope across API, queue and storage. Privacy/Legal reviews G-12 before any real retention schedule or disclosure claim. Pending review fields are reviewer, decision, date, conditions, accepted residual risks and evidence links. [M00.03 review status](../M00.03/VERIFICATION.md) · [Model results](VERIFICATION.md)
