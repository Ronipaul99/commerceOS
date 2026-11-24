# M01.08 implementation evidence

| Area | Delivery |
|---|---|
| Requirements | Master sections 17 and 20, including SEC-001/003/004. This standard-risk slice requires human review before merge. [Design](DESIGN.md) |
| Database | Added `file_objects` and `file_jobs`, branch-consistent foreign keys, one scan job per file, a scoped intent key, versioned state, and due/lease indexes. The migration is additive and starts with empty tables. [Migration](../../../packages/database/fixtures/migrations/20261124000600_private_file_jobs/migration.sql) |
| Application | The NestJS feature module registers six scoped endpoints for intent, upload, download grant, download, job status and cancellation. OpenAPI and the generated client describe the same routes. [Controller](../../../apps/api/src/files/files.module.ts) · [OpenAPI](../../../packages/api-contracts/openapi.json) |
| Private objects | The S3-compatible adapter takes a configured HTTPS endpoint, private bucket and injected workload signer. It signs conditional PUTs, requires encryption, rejects redirects, and caps streamed reads. The service separately checks the bytes against the pinned digest before processing and download. [Storage adapter](../../../packages/file-jobs/src/storage.ts) · [S3 conditional PUT](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html) |
| Worker | Durable scan state is the source of truth. BullMQ receives a signed M01.05 reference. Guards recheck authorization and lease generation before a terminal transition. A cancelled file stays unavailable even when an already running scanner reports clean. The variant hook is available to a later media registration. [Scan logic](../../../packages/file-jobs/src/scan.ts) · [BullMQ runtime](../../../apps/worker/src/files/runtime.ts) |
| Boundaries | `withPrivateFiles` and `startFileJobs` are explicit composition points. The existing shell keeps its own entry point. The host supplies the live identity, database, storage signer, scanner, dedicated download key and worker trust. No UI, public file bucket, merchant data or external event is part of this work item. |
| Review and launch | Native PostgreSQL/BullMQ qualification, live adapters and human review are pending. Production throughput, retention and provider selection follow G-11, G-12 and G-18. [Verification](VERIFICATION.md) |

## Operation and rollback

Use an approved private bucket and least-privilege service. The bucket policy enforces private access and encryption. Use TLS in transit and a dedicated download HMAC key resolved through protected configuration. Redact query strings for the download route at any ingress or observability layer. Text downloads require an active bearer and the actor, session and scope tied to the grant. The API returns an attachment. Job audit attribution uses the request's server-generated causal ID and a separate worker service identity.

The scanner must fail closed, respect cancellation and deadlines, and return a controlled verdict. A mail, media or export integration may use the interfaces after its own approval. A variant hook must be idempotent, keep generated data private, and respect the worker deadline. This initial registration processes UTF-8 plain text. Aggregate egress, lifecycle deletion and representative workload limits need gate evidence.

To roll back, disable new file intent/upload admission, stop claiming jobs, and shut down or fence in-flight workers. Keep the additive tables and retained objects. Confirm the state and digest can be understood by the compatible revision before restoring admission. Redis state can be rebuilt from durable claims. Removing data or reversing the migration requires an approved retention and recovery decision.

## Reproduce

```powershell
pnpm.cmd --filter @businessos/api build
pnpm.cmd --filter @businessos/worker build
pnpm.cmd --filter @businessos/file-jobs test:unit
node --test tests/files/embedded.test.mjs tests/contracts/http.test.mjs tests/security/http.test.mjs infra/local/host-smoke.test.mjs
node scripts/contracts/generate.mjs --check
```

For the native qualification, use the existing disposable PostgreSQL Docker path or the guarded `M0104_ADMIN_URL` loopback override. Set `M0108_REDIS_URL` to a dedicated loopback Redis instance with an explicit port, then run `node --test tests/files/integration.test.mjs`. The synthetic storage encrypts fixture bytes in memory, and the injected test scanner returns controlled verdicts. The native harness generates Prisma, deploys and checks migration parity, and runs the happy path through BullMQ before exercising fault cases. [M01.04 test cluster](../M01.04/IMPLEMENTATION_EVIDENCE.md)
