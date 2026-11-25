# M01.09 implementation evidence

| Area | Delivery |
|---|---|
| Trace and scope | Master sections 20 and 21. Standard-risk BusinessOS release controls. Human review is required. [Design](DESIGN.md) · [Work item](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.09.md) |
| Pipeline | The read-only GitHub Actions workflow tests lint, types, units, OpenAPI, native PostgreSQL/Redis, secrets, dependency advisories and targeted static analysis. Git determines whether a pull request affects BusinessOS. The uniquely named aggregate check expects every relevant job to succeed. [Workflow](../../../../.github/workflows/businessos-m0109-release.yml) |
| Human review | A current-head approval from a different authorized human is required. Stale, dismissed, self, bot or missing approvals fail, as do unresolved change requests. The workflow reads review facts through the GitHub API. [Review guard](../../../scripts/release/policy.mjs) · [Review API](https://docs.github.com/en/rest/pulls/reviews) |
| Migration job | Preflight checks the lock file and installed history against the reviewed base SHA. New SQL must use the additive grammar. The disposable staging job applies base migrations, seeds and captures synthetic tenant/branch identities, applies candidate migrations and confirms schema parity and fixture preservation. [Migration preflight](../../../scripts/release/preflight.mjs) · [Disposable staging](../../../scripts/release/staging.mjs) |
| Artifact and rollback | Docker builds the reviewed base and candidate, verifies that the candidate runs as the existing nonroot user, saves the image and binds its checksum to the immutable image ID, source SHA and BuildKit metadata. The rehearsal smokes prior, candidate, rollback and roll-forward against the same fixture. An unhealthy candidate restores the prior image and fails the check. [Build script](../../../infra/release/build-rehearsal.sh) · [Provenance](https://docs.docker.com/build/metadata/attestations/slsa-provenance/) |
| Flag control | The source-controlled rollout history appends numbered snapshots and bounded reason codes. The API evaluator narrows an already authorized and entitled operation using a stable tenant cohort and a registered flag. Default revision 1 enables no features. [Flag policy](../../../infra/release/rollout.json) · [Evaluator](../../../apps/api/src/release/flags.ts) |
| API, DB, UI and events | NOT_APPLICABLE. No public route, generated client, schema migration, UI or external event is added. Existing fixture schema is used during rehearsal. |
| Release blockers | Current high dependency findings, hosted image rehearsal and enforced repository protection are open. G-11 owns live staging topology and production capacity. [Verification](VERIFICATION.md) |

## Repository adoption and rollback

A repository administrator enables the uniquely named **BusinessOS release gate** as a required strict check on the protected integration branch. Preserve unrelated existing branch settings. Require an independent human and applicable CODEOWNERS, dismiss stale approvals, and apply protection to administrators and bypass roles. Branch protection enforces the status check at merge time. The workflow's scope check succeeds without running the BusinessOS matrix on unrelated changes. [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

The pipeline has only PR events, read permissions and disposable rehearsal. It uploads evidence and an image archive, with no registry push or production credentials. The BuildKit record and local checksum provide provenance for the runner's build. Independent signing and container base-image CVE qualification require the selected release tooling and evidence.

For rollback, stop staged progression, restore the exact known-good image and keep additive migrations applied. Recheck health, readiness, protected admission and fixture identity before resuming. Stop if the previous revision also fails smoke. Disabling an enabled feature appends a new reviewed flag revision with reason `DISABLE` or `ROLLBACK`. Git records the actual actor and change review. No retrospective edits to the rollout history are needed.

## Repeat local checks

```powershell
pnpm.cmd --filter @businessos/api build
$env:M0109_BASE_SHA = (git rev-parse HEAD)
node scripts/release/preflight.mjs
node scripts/contracts/generate.mjs --check --base-ref $env:M0109_BASE_SHA
node scripts/release/sast.mjs
node --test tests/release/controls.test.mjs
```

Use the actual reviewed base SHA for a feature branch. The hosted workflow runs the image and migration rehearsal after all prerequisite checks succeed.
