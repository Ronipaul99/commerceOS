# M01.08 Private files and background jobs

## 1. Scope

Provide a branch-private upload intent, quarantine storage, asynchronous scanning, an authenticated short-lived download grant, and status and cancellation for the associated job. The initial engineering slice accepts UTF-8 plain text up to 16 KiB and validates it before writing storage. A worker scan and optional variant-processing hook are explicit interfaces. Text has no resize step. Images, catalog attachments, tenant retention policy, third-party storage and scanner deployment, and production sizing are owned by later approvals. Tenant A/B and both branches of Tenant B are synthetic. Master sections 17 and 20, ADR-003/004 and the M01 platform baseline apply. [Work item](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.08.md)

## 2. Journey

An active member with the applicable branch or SELF grant creates an intent with a name, media type and exact size. The server assigns an opaque ID and a 15-minute upload window. Upload a JSON base64 envelope to the intent. The server validates the full decoded body, fixes its SHA-256 digest in a guarded write and places it in immutable private storage. Finalization creates the scan job in the same SQL transaction that moves the file from INTENT to QUARANTINED. STATUS is available as soon as upload finalizes. Scanner verdicts change the file to AVAILABLE or REJECTED. Errors retry with bounded attempts and mark FAILED on exhaustion. Cancelling queued or running work changes both records in one transaction. Once terminal, a matching cancel replay returns the current cancelled job. No transition from cancelled to available exists. Browser UI and accessibility testing are NOT_APPLICABLE for this backend slice.

## 3. Ownership

The File module owns file metadata, scanning jobs, and the private object interface. The M01.05 auth context supplies tenant, branch, and SELF authorization and the owning authority participates in guarded HTTP writes. A worker binding admits the registered scanner service and processes only job IDs loaded from PostgreSQL. The durable job doubles as the dispatch record. BullMQ receives only an authenticated reference to a job and attempt generation. Broker timing can lag durable state. There is no published domain event or cross-module table write.

## 4. Persistence

Use an additive Prisma fixture migration over the M01.04/M01.06 chain. The file row stores tenant/branch composite FK, UUID, owner, request key, filename, media type, exact size, digest, UTC timestamps, upload expiry, state and optimistic version. Owner-scoped request uniqueness makes creation idempotent. Jobs reference tenant/branch/file through a composite FK and have a unique file, state, attempt generation, next eligible time, lease expiry, safe result code, version, correlation and timestamps. Checks enforce legal state, failure and lease combinations. Progress is derived from state. Scheduler indexes support due and expired claims. One transaction claims a job. Immutable content is addressed under a server-generated tenant/branch/file namespace. Backend dependencies are outside SQL transactions. No money, quantity, backfill or destructive rollback is applicable.

## 5. Contracts

All six routes use bearer authentication and a branch access declaration. JSON DTOs reject surplus keys. File and job IDs are UUIDs. Success shapes never expose a storage key, digest, or foreign scope. Existing versioned error envelopes apply.

| Method and path | Input | Success |
|---|---|---|
| POST /api/v1/file-intents | Idempotency-Key and JSON {filename,mediaType,sizeBytes} | 201 {fileId,state,expiresAt} |
| PUT /api/v1/files/{fileId}/content | JSON {contentBase64} | 200 {jobId,state,progress,version,failure} |
| POST /api/v1/files/{fileId}/download-link | No body | 201 {url,expiresAt} |
| GET /api/v1/files/{fileId}/download | One grant query value | 200 binary attachment |
| GET /api/v1/file-jobs/{jobId} | No body or query | 200 {jobId,state,progress,version,failure} |
| POST /api/v1/file-jobs/{jobId}/cancel | If-Match strong version | 200 job status |

For example a new intent accepts {"filename":"notes.txt","mediaType":"text/plain","sizeBytes":5}. A changed body under the same intent key returns 409. Invalid metadata, traversal names, malformed content or mismatched size produce 400, over-limit inputs produce 413, and incompatible type produces 415. Missing or foreign IDs use 404. Expired uploads or unavailable file states use 409. Invalid, expired or unrelated signed download proofs share the unavailable 404. Use 503 for indeterminate storage or authority. No list/cursor or new external integration is published.

## 6. Security

File write, download, job read and cancellation are separate grants. Each operation applies tenant, branch, ID and the linked owner for SELF. The browser cannot choose these scopes. A signed relative URL binds purpose, file, version, tenant, branch, actor, session and expiry. A live bearer and scoped authorization are required at redemption. TTL is 60 seconds. Use a dedicated resolved signing key and constant-time validation. Downloads are encrypted in production via the owning storage binding, attachment-only, bounded, and uncached. No public storage URL. A scanner unavailable verdict keeps bytes private. Reject shortened, malformed, overlimit and control-character text. Operational output uses fixed codes and omits payload, URLs, filename and proof. Cookie transport, webhook signing and privileged support access are NOT_APPLICABLE.

## 7. Recovery and scale

Workers claim bounded batches with PostgreSQL SKIP LOCKED, authenticate a signed ref, re-read the current generation and fence completion against cancellation and lease expiry. Redis failures leave a durable claim to expire and become eligible again. Scanner attempts are bounded, with retry delay and a terminal FAILED state. A conditional write prevents replacing bytes after upload pinning. If storage succeeds but SQL finalization fails, an identical resubmission uses the existing immutable content. Storage lifecycle reconciliation and eventual deletion need the owning retention rules. No per-tenant throughput or SLO is asserted. Production abuse and egress budgets remain subject to G-11.

## 8. Verification

| Case | Scenario |
|---|---|
| FILE-01 | HTTP intent, immutable upload, queued scan, progress, signed download and byte match |
| FILE-02 | Traversal, unsupported MIME, encoded age/length errors, malformed UTF-8 and size limits |
| FILE-03 | Tenant/branch/actor boundaries, cancelled grants, tampered/expired URL and leaked scope fields |
| FILE-04 | Replay and simultaneous submission, changed bytes, failed scanner budget, lease fencing and cancellation |
| FILE-05 | Real PostgreSQL migration and BullMQ recovery, API drift, redacted review and rollback |

## 9. Operations

Use redacted correlation from the request context and bounded job status. Job state is durable and Redis can be rebuilt. Stop admission and dispatch during rollback, preserve metadata and stored objects, and deny download when validation is unavailable. Secrets, scanner and storage adapters must be supplied by the deployment composition, with encryption, privacy, retries, storage and monitoring policies reviewed before release.

## 10. Decisions

| State | Record |
|---|---|
| CONFIRMED | M01.04/PostgreSQL, M01.05 scoped context, M01.06 BullMQ patterns, M01.07 provider-neutral auth and signed material boundaries. |
| PROPOSED | Bounded text-only fixture, 60-second signed grant and provider-neutral storage/scan hooks. |
| BLOCKED for live use | Production S3-compatible provider and scanner, key custody, retention and abuse budgets under Architecture/Security and G-01/G-11/G-12/G-18. Human review before merge. |

[Master blueprint](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MASTER_BLUEPRINT.md#17-data-model-and-schema-migration-guidance) · [ADR-024](../../adr/ADR-024.md)
