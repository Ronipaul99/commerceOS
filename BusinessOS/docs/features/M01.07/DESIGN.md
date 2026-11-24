# M01.07 Authentication, secrets and protected configuration base

## 1. Scope and boundaries

**State** PROPOSED. **Implementation** Pending explicit M01.07 design approval. This item defines the provider-independent authentication adapter, secret references, validated startup configuration, HTTP protections, and log redaction. Engineers need the same safe bootstrap across environments. QA needs a synthetic identity and secret lifecycle to prove failure and rotation. Use fictional Tenant A and Tenant B for scope checks. Login, enrollment, SMS/OTP delivery, account recovery, production identity and secret-store selection, and tenant administration remain with their approved owners. The current API shell has an injectable verifier and denies protected requests by default. [M01.07 prompt](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.07.md) · [Master security requirements](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#20-security-privacy-compliance-and-governance) · [Current HTTP evidence](../M01.03/VERIFICATION.md)

## 2. Startup, request and failure journeys

1. In the existing shell startup, protected requests remain denied. When protected authentication is explicitly configured, validate environment, transport, expected issuer and audience, and purpose-scoped secret references before enabling the verifier. Resolve required material through the injected server-side secret provider. Missing, malformed, or unavailable required material fails protected startup, with a redacted reason.
2. A protected request carries exactly one credential in the route's configured transport. The authentication adapter verifies integrity, intended use and lifetime, then resolves the provider subject and current session. Check revocation and required assurance before producing a principal. Load memberships through their trusted owner. Forward the trusted principal to the existing HTTP guard and the scoped authorization boundary.
3. A valid fixture request to the existing `GET /api/v1/me` returns only the caller's application subject. Tenant and branch rights come from verified membership and grants. A revoked, missing, invalid, expired or conflicting credential fails closed. A verifier or revocation dependency that cannot supply a trustworthy decision returns the existing unavailable response.
4. Stage rotated material, verify old and new compatibility during an approved overlap, then retire the previous version. Revoking a session or disabling a compromised key takes precedence over overlap. Do not silently fall back to expired material.

No new login screen, recovery interaction, or user interface is proposed. UI states and accessibility tests are **NOT_APPLICABLE** for this slice. [M01.03 transport](../M01.03/DESIGN.md) · [M01.05 scoped context](../M01.05/DESIGN.md)

## 3. Ownership and internal interfaces

| Interface | Owner and contract |
|---|---|
| Auth provider adapter | Auth verifies an opaque credential using the configured issuer and intended transport, with deadline/cancellation. Return a verified provider subject, session reference, verified attributes needed by policy, assurance and expiry, or a typed rejection. Normalize provider errors to denied or unavailable. |
| Session authority | Identity owns subject binding, session status, rotation/revocation, and privileged assurance. Resolve by trusted issuer plus provider subject and session reference. A syntactically valid credential alone cannot establish an active session or privileges. |
| Execution context | Access Control owns current tenant membership, branch scope and composed permission. Build the M01.03 verifier result from trusted identity/membership values. Reject caller-supplied roles, tenants and branches as authorities. |
| Secret provider | Internal `resolve(reference, purpose, signal)` returns bounded, versioned material for an allowlisted service purpose or typed unavailable/missing status. Configuration maps known logical names to references. Requests and job payloads do not select a secret. |
| Protected config loader | Runtime bootstrap owns schema validation and produces an immutable typed configuration snapshot. Store secret references separately from resolved values. Cross-module callers use narrow interfaces and do not inherit permission to read arbitrary secrets. |

Separate credential kinds and audiences for tenant, platform and worker identities. Queue signature validation and replay remain with their owning work items. [Domain boundaries](../M00.02/DESIGN.md) · [Outbox and worker design](../M01.06/DESIGN.md)

## 4. Persistence

Database schema changes, tenant foreign keys, backfill, business arithmetic and database rollback are **NOT_APPLICABLE** in this item. The session and membership interfaces consume an authoritative lookup. The synthetic harness uses independent test identities, sessions, membership maps and ephemeral key references. M02.01 owns durable registration and session state. M01.05 and M02.02 own scoped membership resolution. Production secret material belongs to the approved store, protected in transit and at rest. Runtime config and logs contain no raw long-lived secrets. [Migration prerequisite context](../M01.04/DESIGN.md)

## 5. Transport and configuration contracts

No new REST routes, OpenAPI operations, generated client changes, public secret endpoint, or external event is proposed. Keep M01.03's `GET /api/v1/me` success response `{"id":"fictional-a"}` and its error envelope `{code,message,details,requestId}`. Return 401 for missing/invalid/expired/revoked credentials, 403 for disallowed authenticated scope or failed CSRF checks, and 503 when configured authority is unavailable. Do not echo claims, credential values or provider failure messages. Preserve existing `/`, `/health` and `/ready` response contracts.

Proposed protected configuration accepts only declared settings for application mode, approved issuer and audience, transport, browser origin allowlist where used, required reference names and bounded verification settings. The protected mode does not start with a partial or invalid configuration. Separate missing configuration from temporary provider failure in redacted operational records. Fixture configuration enters through a test composition root, with absent test registration in production. Deployment credentials for the secret provider remain a separately approved workload identity decision.

## 6. Security and privacy

| Actor | Required authority | Example denial |
|---|---|---|
| Tenant member | An active, verified session and current tenant/branch grants for the requested operation | Claimed tenant from a browser body, header or token attribute outside the trusted application membership mapping |
| Privileged operator | Separate credential audience, current elevated grant and required assurance through owning policy | Tenant token reused on platform routes or revoked elevated session |
| Worker/service | Separate credential purpose and a narrow secret-store grant for its own task | Browser credential used for worker trust or another service's secret reference |
| Config/operator process | Permission for one environment and purpose with audited metadata | Tenant actors reading config, rotating keys, or reading secret values |

- **Bearer transport.** Continue header-based verification for existing API routes. Accept the approved bearer form for the designated audience. Reject ambiguous or multiple credential sources. If the selected provider uses JWT, allowlist accepted token types and algorithms, verify under trusted issuer keys, and check issuer, audience, subject binding and lifetime. Reject wrong-purpose tokens. Opaque credentials require authoritative verification to the same interface. Transport approval remains under G-01. [JWT best current practices](https://www.rfc-editor.org/rfc/rfc8725.html)
- **Browser cookie transport.** If approved for a browser route, use a host-only session cookie with Secure, HttpOnly, Path=/ and an appropriate SameSite policy. The proposed same-origin default is Lax, subject to the reviewed login flow. Enforce a session-bound CSRF token and exact configured Origin on unsafe browser requests before effects. Reject invalid or missing proof. SameSite supplements the CSRF check. Existing bearer routes do not accept session cookies as fallback. Use explicit origins for any credentialed CORS and no credentialed wildcard. [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) · [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- **HTTP and logs.** Register the approved NestJS/Express security header policy before route processing. Apply nosniff and framing restrictions where appropriate, keep protected responses uncached, and enable HSTS only for the approved HTTPS deployment scope. Trust forwarded transport metadata only from configured proxies. Log allowlisted server-generated correlations, outcome codes and timings. Omit Authorization, cookies, secret values, raw references, URLs carrying credentials, request bodies, and raw provider errors from logs, traces and debug output. Keep untrusted client-supplied request IDs out of privileged logs. [NestJS security headers](https://docs.nestjs.com/security/helmet)

No payment webhook, file download grant, statutory handling or provider integration is introduced. Rate limits and verification/recovery policies require approval before their endpoints are enabled. Authorization remains service-side and resource-specific.

## 7. Rotation, availability and recovery

Read the minimum material required at startup or approved refresh. Validate a whole candidate snapshot before atomically selecting it. Keep separate purposes and key rings for session, API key, and worker signing. Accept prior material only in a bounded approved overlap and within credential validity. Revoke compromised versions without grace. Avoid trying arbitrary keys or fetching URLs supplied by a credential. A failed refresh can use only an already trusted snapshot still within its configured validity and revocation requirements. If verification or revocation is indeterminate, fail closed. Keep provider lookup time within the existing HTTP verifier deadline, and avoid uncontrolled inline retries. Apply bounded refresh and backpressure in the owning environment. Actual capacity, availability and latency remain unmeasured. G-11 governs operational targets.

## 8. Verification plan

| ID | Planned test | Required result |
|---|---|---|
| AUTH-01 | Inject a fictional secret provider, active session and two independent identities into the protected API composition | Load required config and resolve both principals through the adapter. Each request sees only its own identity. |
| AUTH-02 | Omit a required reference, return missing/invalid material, or make the store unavailable | Protected startup or admission fails without a live-mode test fallback. Redacted records distinguish configuration and availability failure. |
| AUTH-03 | Use malformed, expired, wrong-audience or revoked credentials. Combine a valid tenant credential with forged scope or platform escalation. | Deny at the appropriate boundary. Token integrity alone cannot bypass session revocation or scoped authorization. No foreign subject or permission is returned. |
| AUTH-04 | Rotate ephemeral fixture material, simulate refresh failure, then retire or revoke the old version | Valid overlap follows the fixture policy. New current material works after cutover. Retired or compromised material and revoked sessions remain denied. |
| AUTH-05 | Exercise response headers and both allowed and failing transport cases in loopback tests | Existing bearer route behavior persists, conflicting sources fail, and the designated cookie fixture denies unsafe requests with invalid/missing Origin or CSRF proof. |
| AUTH-06 | Capture structured, nested error and debug paths with ephemeral canaries and exercise the CI secret scanner | No raw secrets or credential material in outputs. The scanner detects a generated positive-control fixture without printing its contents. Reviewed cleanup removes disposable artifacts. |

After approval, run typed/build checks, loopback HTTP and provider-independent adapter tests, then CI secret scanning and rotation verification. Pin and review the scan tooling in the owning change. CI must fail on new secret findings and redact findings in logs. Live-provider, session datastore and tenant authorization acceptance depend on their owning work items. No test or scan is claimed in this design phase. [Prior runtime evidence](../M01.03/VERIFICATION.md) · [M01.06 design status](../M01.06/DESIGN.md)

## 9. Operations and rollback

Record only the service, server correlation, guarded operation and redacted result. Monitor rates for startup failure, verifier unavailability, revocation failure and rotation health without using tenant or actor identifiers as metric labels. Require scoped operators and an auditable record for key lifecycle actions. For a bad rollout, continue fail-closed behavior, revert compatible code, and use the last still-authorized configuration if valid. Revocation blocks reactivation of compromised material after rollback. No production configuration, deployment, database rollback or cost estimate is proposed.

## 10. Decision log and approval

| State | Decision |
|---|---|
| CONFIRMED | RG0, the locked platform baseline, and master SEC-002/SEC-003 require verified identity, scoped membership, revocable sessions, safe configuration and rotation. |
| PROPOSED | Provider-independent adapter and config boundaries, fail-closed protected enablement, transport policy, and AUTH-01–AUTH-06 synthetic checks. |
| BLOCKED | Explicit M01.07 approval before code, independent review before merge, and M01.06 predecessor acceptance. Live auth and recovery choices remain G-01 with Product and Security. Remaining provider/operational tool decisions follow the applicable approvals. |

[RG0 signoff](../../RG0_SIGNOFF.md) · [ADR-024](../../adr/ADR-024.md) · [G-01 and other open gates](../M00.05/DECISIONS_LOG.md#gate-register)
