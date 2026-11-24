# M01.05 implementation evidence

| Area | Delivery |
|---|---|
| Trace and risk | Master sections 16.2 and 20, ADR-004 and M01 platform baseline. High risk. Design approved on 24 November 2026 by Roni paul. [Approval](APPROVAL.md) · [Work item](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.05.md) |
| HTTP | `RequireScope` declares resource, action and ownership. The existing API guard verifies the actor, rejects client scope selectors, and resolves current authority through a server-side adapter. The response keeps the existing contract envelope. [HTTP guard](../../../apps/api/src/http/scoped.ts) |
| Scoped data | `scopeFor` requires an issued context for the specific operation and supplies tenant, branch and owner predicates. `authorizeWrite` checks current authority under the same transaction before releasing the predicate to a write. The owning repository supplies the authority lock and adds its own resource and version predicates. [Context toolkit](../../../packages/execution-context/src/context.ts) |
| Worker | `createJobConsumer` verifies a versioned HMAC reference, trusted service identity and route, then checks the authoritative stored job and current grants. Each attempt receives an independent context. The owner supplies the durable transaction and idempotency key. [Worker consumer](../../../packages/execution-context/src/job.ts) |
| Context lifetime and audit | Context expires when the HTTP response closes or the worker handler settles. Causal correlation uses an opaque server UUID. Worker metadata preserves the original actor and executing service identity. Audit receives an allowlisted projection and reason codes. [Integration suite](../../../tests/execution-context/isolation.test.mjs) |
| DB, API, UI and events | Disposable PostgreSQL reuses the M01.04 migration chain. Synthetic authority setup and HTTP routes live inside the harness. Production migration, public OpenAPI and generated client changes, UI, external events and live queue dispatch are `NOT_APPLICABLE` to this foundation. |
| Toolchain and CI | Jest 30.5.2, Supertest 7.3.2 and the M01.04 PostgreSQL/Testcontainers harness. The local API image recipe includes the new workspace package. [ADR-024](../../adr/ADR-024.md) · [CI workflow](../../../../.github/workflows/businessos-m0105-context.yml) |
| Release controls | Independent tenant-security review and hosted CI are pending. Live identity/session verification and signing key custody remain with G-01 and M01.07. Queue deployment remains with M01.06. Production capacity remains with G-11. [Verification](VERIFICATION.md) |

## Internal contract

- For HTTP, inject `ScopeOptions.resolve` alongside the existing principal verifier. The verifier supplies an opaque authenticated session ID. The resolver chooses tenant and branch from current server-side session state, and returns the membership, applicable grants and authorization revision. A branch route always resolves an active branch. SELF uses the authoritative linked owner ID with any required branch. An action may use one applicable grant at a time.
- A repository declares its access requirement in code and constructs its filters with `AND`. Reads, counts and mutations use the same tenant and relevant branch/owner predicates. A branch or owner predicate the repository cannot represent must cause denial. Write adapters lock the relevant authority in the enclosing Prisma transaction and compare its current revision and scope before any restricted mutation. Applicable writes use a resource version and check the result count. Revocation and grant updates must contend on that same authority.
- Worker bindings declare the issuer, audience, queue, operation, executing service and permission. A stored job may name a human actor only when the operation explicitly allows delegation, or the executing service when its own policy authorizes the action. The reference signs a fixed field sequence with HMAC-SHA256 and selects the configured key by ID. The reference lifetime is capped at 300 seconds and verification keys require at least 32 bytes. Current and retiring keys can be resolved during an overlap. The job owner supplies keys and the authoritative record and may reissue a proof for retries.
- For scoped HTTP paths, malformed client scope selectors produce 400, missing or invalid authentication produces 401, denied authority produces 403, scoped misses use the same 404 envelope as absent records, and unavailable resolver or verifier yields 503. The existing HTTP `X-Request-Id` remains the transport identifier. The server-generated causal identifier connects internal audit and worker attempts.

## Reproduction and rollback

```powershell
pnpm.cmd --filter businessos --filter @businessos/api... --filter @businessos/database... install --frozen-lockfile
pnpm.cmd --filter @businessos/api build
pnpm.cmd --filter @businessos/execution-context test:unit
node --test tests/execution-context/isolation.test.mjs
node --test tests/contracts/http.test.mjs infra/local/host-smoke.test.mjs
```

The integration command provisions PostgreSQL via Testcontainers by default, or uses `M0104_ADMIN_URL` pointing to the dedicated loopback fixture cluster as described in M01.04. Revert the M01.05 package, API bindings, local image inputs, verification files and workflow to roll back. The integration harness removes its disposable databases and roles. [M01.04 operator path](../M01.04/IMPLEMENTATION_EVIDENCE.md)
