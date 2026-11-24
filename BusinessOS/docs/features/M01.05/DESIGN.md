# M01.05 Tenant and branch execution context plumbing

## 1. Scope and boundaries

**State** PROPOSED. **Implementation** Pending explicit M01.05 design approval and the M01.04 database toolkit. This item defines how an authenticated HTTP request or an authenticated worker job obtains a scoped execution context, authorizes an operation, filters records, and carries audit metadata. It applies to the generic workspace foundation and enabled tenant capabilities. Tenant A and Tenant B are fictional. Identity providers, login, role management, live queue dispatch, platform support, UI and business transaction delivery belong to their owning items. [M01.05 prompt](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.05.md) · [Tenant and authorization rules](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#162-tenancy-authorization-and-data-boundaries)

## 2. Request and worker journeys

1. An HTTP guard uses the verified actor supplied through the existing M01.03 verifier boundary. A server-side resolver loads the active membership, current grants and selected tenant/branch from trusted session state. Tenant or branch fields supplied by the client do not establish scope. M02.02 will own context switching.
2. The guard combines server metadata for the required resource and action with an applicable grant at one scope. A branch-owned resource always needs a branch scope. A scoped repository receives the resulting context and applies its constraints atomically in the query or mutation.
3. A worker begins with a trusted service identity for its queue and operation. It validates a signed reference to an authoritative job and reloads that job from the owner's store. It compares the reference and stored scope, validates authorization to run or act on behalf of the recorded actor, and creates a new context for this attempt.
4. The operation returns or records only its scoped result. Correlation and origin survive the HTTP/job boundary. Missing scope, mismatched ownership, revocation, expired or invalid proof, unknown operation, or unavailable authority fail closed. A retry repeats verification and authorization.

The proposed tests execute this journey in loopback HTTP and a synthetic job consumer against disposable PostgreSQL after its prerequisite exists. There is no user-facing screen. Existing unscoped identity discovery remains limited to the authenticated subject's own data. [M01.03 transport](../M01.03/DESIGN.md)

## 3. Authorities and context types

| Type | Proposed fields and authority |
|---|---|
| Verified principal | Actor ID and principal kind from a verified identity or trusted service binding. Session or service identity reference and verification status are server-owned. |
| AuthContext | Verified actor, tenant ID, membership reference where applicable, authorization revision, authorized action/scope, and discriminated tenant or branch scope. Branch scope includes a branch ID. Tenant scope requires explicit tenant-wide authority for the specific action. |
| RequestContext | Authorized context, server correlation/request IDs, source HTTP or worker, and a trusted job ID and original actor reference where relevant. |
| PlatformContext | Separate principal and authorizer. A target tenant or support grant remains explicit and time-limited. Tenant repositories reject this type. |

Expose read-only context to authorized handlers. Create it through a single verifier/authorizer boundary. Type-level discriminants prevent accidental mixing and runtime validation rejects absent or malformed contexts before any data access. Carry it as an explicit argument to repositories and worker handlers. Each HTTP request or job attempt creates its own context. Avoid mutable global state, inherited asynchronous worker context and context serialization into queued business payloads.

Identity and Access Control own membership and grant state. Queue/job owners supply the authoritative stored operation. Domain owners supply resource predicates and authorized mutations. The context module owns composition, scope and redacted audit metadata. Platform authorization has a separate entry point. [M00.02 ownership](../M00.02/DESIGN.md) · [M00.04 permission workbook](../M00.04/PERMISSION_WORKBOOK.md)

## 4. Persistence and scoped queries

This item relies on the M01.04 Prisma/transaction and composite key baseline. It introduces no production domain tables, money fields, backfill, or schema rollback. Disposable fixtures need A/A1 and B/B1–B2 and a branch-scoped record or transaction probe from that baseline. Use the tenant/branch composite relationship so a mismatched reference fails in the database as an independent defense.

Every operation composes an immutable tenant predicate, an explicit branch predicate for branch resources, and its own resource conditions. Add owner identity for SELF. Combine predicates with conjunction rather than spreading caller-supplied filters over scope fields. A read, list, count or mutation with missing context fails before issuing SQL. No ID-only lookup, unrestricted `findUnique` fallback, or raw filter passthrough is exposed. Index by tenant and branch for branch-owned queries. Inserts derive tenant/branch from context. Protected updates/deletes include scope and the expected version where applicable, then check affected rows. Enforce active grant and state at the authoritative write boundary with the applicable transaction or revision check to cover revocation races. [M01.04 design](../M01.04/DESIGN.md)

## 5. HTTP and job contracts

No new REST path, generated client, external event schema or DTO field is proposed. Existing M01.03 `/api/v1` response envelopes and request correlation apply. Future scoped routes declare access requirements in server metadata. On those routes, reject client-controlled scope overrides, including tenant or branch headers and DTO fields such as `tenant_id`, `tenantId`, `branch_id` and `branchId`. Resource IDs in paths identify a target and still require a scoped lookup. Use 401 for missing or invalid authentication, 403 for unauthorized scope/action, 404 for an unavailable or differently scoped object, and 400 for malformed or disallowed data. A scoped list or cursor can never reintroduce a tenant or branch selector.

The internal signed job reference carries a format version, signing key ID, issuer, audience, queue and operation, durable job ID, origin correlation ID, issue time and expiry. Verify integrity and purpose against configured trust, check expiry and queue/operation match, then compare the verified reference with stored job metadata. Load tenant, branch, actor and command input from the authorized record. Reject any extra tenant, branch or principal claims in the delivery envelope. Scope, verification keys and service permissions never come from queue payload fields. Real signing key custody and verified identity integration remain with their owning items. The local harness can inject test keys, synthetic grants and a disposable job store.

## 6. Security and privacy

| Principal/action | Required conditions | Denial examples |
|---|---|---|
| Tenant member, SELF | Active membership and one grant matching the requested resource/action and row owner. | Another employee's ID or guessed record key. |
| Employee or manager, BRANCH | Active membership and matching permission and branch assignment under the same grant. | Permission from A1 combined with an unrelated B2 assignment. |
| Tenant administrator, TENANT | Active membership and explicit tenant-wide grant for the action. Branch-owned operations still declare how branch scope is resolved. | Unscoped listing of branch data or another tenant's data under a local admin role. |
| Worker service | Verified purpose and allowed operation with a signed job reference, authoritative scope, current grant or explicit service policy, and separate execution identity. | Forged, expired, altered, wrong-queue or unauthorized job, accidental context reuse. |
| Platform operator | Separate verified platform identity and explicit authorized, time-limited target workflow in the owning item. | Passing platform metadata into a tenant repository, or converting an admin grant into support impersonation. |

No permission union across unrelated grants can expand scope. Review object-level access, unauthorized fields, stale grant handling, side effects and error redaction. Denial may log controlled reason codes and opaque identifiers. Tokens, signing material, raw payloads, real PII and unauthorized object details stay out of logs and metrics. Browser CSRF settings, webhook ingress and file download authorization are covered by their owning work items.

## 7. Consistency, retries and recovery

Resolve grants against current authoritative state. Cache policy revisions only after invalidation and revocation behavior is demonstrated. Scoped queries use deterministic pagination and bounded limits. Keep authorization and protection against stale mutations in the same authoritative command flow. For multi-row work, follow M01.04 transaction rules. On job retry, re-verify with a fresh context. Reject mismatches before side effects. Use a durable idempotency key scoped to the tenant, branch or explicit tenant-wide scope, operation and stored job/business reference in the owning transaction. Duplicate delivery is tested against a disposable effect. Queue scheduling, outbox/inbox, replay and DLQ runtime remain M01.06. Production capacity, latency limits and monitored alert thresholds require later measurement under G-11. No production workload numbers are assumed.

## 8. Verification plan

| ID | Planned check | Expected outcome |
|---|---|---|
| CTX-01 | Fictional actor A with A1 grant through HTTP. Authenticated job for the same scope through a synthetic consumer. | Each creates a valid context, resolves the permitted object and records redacted attribution with the same causal correlation. |
| CTX-02 | Inject tenant/branch headers and unknown DTO scope fields. Request B's ID as A, and B2 as a B1-only actor. | No foreign rows, totals, or effects. Invalid overrides fail. Scoped misses reveal no foreign object existence. Both tenant snapshots remain intact. |
| CTX-03 | Modify signed job data or add payload scope fields. Try expired proof, wrong audience/operation, revoked actor, inactive branch and missing job. | Reject before repository access or any effect. Invalid and valid attempts can run concurrently without context leakage. |
| CTX-04 | Call scoped repository without a context, pass a platform context, compose unrelated grants, override a scope predicate and repeat a durable source key. | Denial for invalid contexts and grants, scope unchanged, one committed effect per authorized source and no replay benefit after revocation. |
| CTX-05 | Use real PostgreSQL with A/B, identical local aliases and B1/B2 grants. Exercise read, write and composite FK negative paths, with before/after checksums. | Scope enforced in actual SQL and transaction. Both unauthorized writes and mismatched FK fail. No peer tenant or branch mutation. |
| CTX-06 | Re-run the existing M01.03 contract tests and check dependency boundaries, redaction and platform identity separation. | Existing authentication/health behaviors preserved. Private state and a worker's context never enter a client response or shared log. |

Run provider-independent unit and loopback tests after design approval. Real persistence proof depends on M01.04 and access to disposable PostgreSQL. The predecessor is at design stage and this host currently lacks Docker/PostgreSQL tooling. Neither the planned checks nor existing synthetic HTTP tests demonstrate M01.05 implementation. No performance or external validation result is claimed.

## 9. Operations and rollback

Propagate opaque request, correlation, job, actor, membership and scope references to authorized audit sinks. Record operation, principal kind, policy revision, decision and failure class. Keep authorization separate from observability. Preserve original human attribution and executing service identity. Monitor aggregate denial and invalid-job rates without including tenant/branch IDs as unbounded metric labels. Fail closed on unavailable trust or grant sources and reconcile affected jobs under current authorization. Roll back through the approved scoped changes and preserve existing owner data and audit records. No deployment, live operator workflow, or storage change is proposed.

## 10. Decision log

| State | Decision |
|---|---|
| CONFIRMED | RG0, ADR-004 and master §§16.2 and 20 authorize tenant/branch isolation, permission composition, and a separate platform trust boundary. |
| PROPOSED | Shared internal context types, HTTP and worker adapters, explicit repository scope, signed stored-job reference and CTX-01–CTX-06. |
| BLOCKED | M01.05 design approval and independent review before merge. Database runtime checks depend on the M01.04 migration and transaction toolkit. G-01 and M01.07 govern live authentication and secret configuration. M01.06 owns live queue/outbox integration. M02 owns identity/membership administration, branch setup and role grants. |

[RG0 signoff](../../RG0_SIGNOFF.md) · [ADR-024](../../adr/ADR-024.md) · [Open gates](../M00.05/DECISIONS_LOG.md#gate-register)
