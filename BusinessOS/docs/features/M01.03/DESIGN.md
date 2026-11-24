# M01.03 HTTP contract, validation and API client

## 1. Scope and boundaries

Master §18 defines the internal versioned REST contract. This item introduces the HTTP transport, a provider-neutral verified-principal boundary, two scoped reads from the target identity catalog, and generated shared contracts and client. Tenant A/B tests use independent fictional principals. There is no business UI, live login, provider, tenant activation, partner API or storefront. [M01.03 prompt](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.03.md) · [Master API rules](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#181-global-api-contract)

## 2. Primary and alternate journeys

A client supplies a bearer token. The guard obtains a verified principal or returns 401. The typed client reads the principal ID and lists memberships with a scoped cursor. Empty results return an empty items array and a null cursor. Invalid query input or another principal's cursor returns a stable 400 error. The client surfaces the typed error or transports the caller's abort signal. No retry is automatic. UI and accessibility workflows are NOT_APPLICABLE.

## 3. Domain ownership

The caller compiling a verified principal owns identity and membership truth. The HTTP layer accepts only verifier output and returns an allowlisted projection. It does not derive scope from body, query or tenant headers. M01.05 and M01.07 own execution context and real verification. No business command, event or cross-module persistence write is registered by this slice.

## 4. Persistence

NOT_APPLICABLE. The API adds no schema or business data. Version and idempotency helpers validate preconditions and fingerprint already validated command fields. Later mutating operations must verify the current version in the same transaction as the effect and commit an idempotency key scoped to verified principal, tenant and operation. Preserve the original response for exact replay and reject changed inputs. The test fixture demonstrates ordering in memory only.

## 5. Contracts

| HTTP request | Success | Validation |
|---|---|---|
| GET /api/v1/me | `200 {"id":"fictional-a"}` | Verified bearer token. |
| GET /api/v1/me/memberships | `200 {"items":[{"id":"membership-a1","tenantId":"tenant-a1"}],"nextCursor":null}` | Only `limit` and `cursor`. Limit defaults to 25 with a range of 1–100. Sort by membership ID. Cursors are opaque and accepted only if they correspond to an item in the current principal's collection. |

The response carries `X-Request-Id` and `Cache-Control: no-store`. A valid supplied request ID is echoed, and a server-generated ID replaces a missing or invalid value. Versioned failures use `{code,message,details,requestId}`. Validation and stale or inconsistent requests use stable error codes. JSON is limited to 64 KiB and compressed JSON is rejected. Annotated JSON writes require a valid `Idempotency-Key`. Helpers emit quoted positive integer ETags and reject malformed or stale `If-Match`. The write contract is exercised only through a test route. [OpenAPI](../../../packages/api-contracts/openapi.json)

## 6. Security and privacy

The normal bootstrap denies all protected routes until a trusted authentication verifier is wired. Synthetic verification and command state exist in the contract test module. The guard acts on the routed pathname, including matching case variants. Denial responses redact internal errors and raw inputs, and unknown DTO fields are rejected. Existing `/`, `/health`, and `/ready` behavior remains available. Cookie authentication, CSRF policy and live credential rotation are NOT_APPLICABLE.

## 7. Scale and recovery

Bound HTTP headers and body receive time, verifier time, and controller response time. A transport timeout does not prove that a future write rolled back. Future command stores must persist their effects and replay state transactionally. Deployment SLOs, queue recovery and workload targets are NOT_APPLICABLE.

## 8. Verification plan

Build the API, check strict types and dependency rules, run the HTTP contract tests, and run the M01.02 host regression test. The tests exercise the generated client, scoped pagination and errors, header and DTO validation, fixture-only replay and drift checks. Compare published operations and shared components against the PR base. [Verification](VERIFICATION.md)

## 9. Operations

The request ID correlates errors without disclosing tenant data. Publish the first OpenAPI baseline through review. Existing published definitions are frozen under the conservative compatibility policy until the owning change is reviewed and versioned. CI compares every existing operation, component and the security policy, and also checks generated source equals the current spec. Rollback reverts this slice. No database recovery is needed.

## 10. Decision log

| State | Decision |
|---|---|
| CONFIRMED | Master §18, ADR-024, and the existing NestJS/Express scaffold govern the transport. |
| IMPLEMENTED | Provider-neutral guard, versioned transport, generated read client and CI check. |
| BLOCKED | Real principal verification remains G-01/M01.07. Durable command effects, transaction retries and tenant context are handled in later owning slices. M01.02 Docker acceptance is tracked separately. |
