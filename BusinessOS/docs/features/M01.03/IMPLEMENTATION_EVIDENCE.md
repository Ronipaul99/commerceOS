# M01.03 Implementation evidence

| Deliverable | Evidence |
|---|---|
| Versioned runtime | [Bootstrap](../../../apps/api/src/create-api.ts), [transport](../../../apps/api/src/http/transport.ts), [validation and command helpers](../../../apps/api/src/http/contract.ts), [identity reads](../../../apps/api/src/http/identity.controller.ts). |
| Shared schemas and generated client | [OpenAPI](../../../packages/api-contracts/openapi.json), [generated contracts](../../../packages/api-contracts/src/index.ts), [generated client](../../../packages/api-client/src/index.ts), and [generator](../../../scripts/contracts/generate.mjs). |
| Tests | [Loopback contract suite](../../../tests/contracts/http.test.mjs). Runtime boot has no test modules or bearer tokens. |
| CI | The repository-root `.github/workflows/businessos-http-contract.yml` runs the drift and compatibility checks for contract PR changes. |
| Runtime scope | Two authenticated reads, shared transport validation, main wiring and tests. The only new dependency is an internal workspace link from the client to contracts. No database, UI, provider, event or business write changes. |

Use `node scripts/contracts/generate.mjs` to regenerate source and `node scripts/contracts/generate.mjs --check` to verify it. CI adds `--base-ref <commit SHA>` for the existing published baseline. The first publication verifies generation and establishes the next PR's baseline. Operations can be added under new definitions and paths. Existing behavior changes require a reviewed contract version. [Design](DESIGN.md) · [Verification](VERIFICATION.md)
