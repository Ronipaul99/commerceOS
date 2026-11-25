# M01.09 CI/CD, supply chain and feature flags

## 1. Scope

Master sections 20 and 21 and the M01 platform baseline apply. Introduce a BusinessOS GitHub Actions verification matrix, explicitly gated build and disposable staging rehearsal, and internal flags for gradual tenant rollout. No production deployment or hosting selection enters this slice. M01.08 implementation exists and its native qualification is pending. This work item's checks can run independently, while platform acceptance remains pending. [Work item](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.09.md) · [ADR-024](../../adr/ADR-024.md)

## 2. Journey

A pull request runs verification on the merge candidate. Lint, typecheck, backend unit suites, contract drift, migrations on PostgreSQL, integration with Redis, secret scanning, dependency audits and targeted static checks feed the release gate. The reviewer check uses independent, current-head human reviews from GitHub. A missing review or unavailable scanner fails. A reviewed green candidate produces an API image and bound build metadata. In a dedicated synthetic network, the prior API image is smoked on the baseline migration chain. The candidate migration is applied while old code is still running, then candidate and prior images are each smoked against the current schema. A candidate smoke failure restores the previous image and leaves the check failed. The pipeline uses throwaway services and publishes test artifacts only. No user-facing UI is needed.

## 3. Ownership

GitHub owns review facts, check status and the branch rules that enforce them. BusinessOS owns release scripts, image metadata, generated contract checks and rollout policy. A flag evaluator accepts an issued M01.05 context for an already authorized tenant operation. Tenant/branch access and entitlements remain with the owning services. A flag can narrow eligibility. No flag extends authorization.

## 4. Persistence

Flag changes are append-only snapshots in the tracked release policy, with sequential revisions and a bounded reason code. Git records the change and the PR gate checks the independent human review. No new database table or data backfill is required. Migration preflight compares all known migrations to the reviewed base and accepts simple new tables, nullable columns without defaults and non-unique indexes before the fixture rehearsal. Broader changes require an explicit reviewed migration strategy. Preserve applied schema during application rollback.

## 5. Internal flag contract

A policy document with schema version 1 contains ordered revision records. Each record holds rollout decisions keyed by a release flag identifier, a boolean enable state and integer basis points in [0,10000]. Unknown keys default off. The library evaluates the registered key against a stable SHA-256 bucket derived from the verified tenant UUID and key, independent of branch or actor. No public routes, OpenAPI/client updates or external events are needed. Evaluation is constant time in the current flag count and uses the highest validated revision.

## 6. Security

PR runner credentials grant contents and pull-request read access only. No deployment secrets, registry writes, production environments, permission mutations or untrusted values interpolated into a shell. Use immutable action SHAs. Verify the existing Gitleaks asset pin. Treat unparseable, failed or high/critical dependency audit results as blocking. Suppress raw secret and review contents. The rehearsal requires a local runner Docker engine and synthetic PostgreSQL credentials. Actual required checks, CODEOWNERS review, admin enforcement and bypass rules are host settings.

## 7. Failure and recovery

Record build source SHA, config digest, artifact checksum and minimal BuildKit provenance. Rehearse only with validated local image IDs. Verify the prior API smoke before migration, the prior API again after migration, the candidate smoke, rollback, and a second candidate smoke for roll-forward. A failed migration cannot start the candidate. A failed candidate must restore the prior image and remain a failed check. Synthetic failures and recovery produce controlled phases. Native runtime verification remains separate from performance and backup qualifications under G-11.

## 8. Verification plan

| Case | Expected proof |
|---|---|
| REL-01 | Every failed or missing guard blocks image and staging activation. A current independent approved review passes. |
| REL-02 | New additive SQL passes preflight. History rewrite, unsafe SQL or changed flag audit history fails. |
| REL-03 | Tenant A/B rollout is deterministic across sessions and branches. Unknown, invalid and unauthorized evaluation is disabled. |
| REL-04 | Disposable image run, baseline migration, smoke, candidate migration, rollback and roll-forward preserve fixture rows. |
| REL-05 | Existing lint, typecheck, HTTP, security and migration suites still pass where executable. |

## 9. Operations

Require a repository administrator to configure the uniquely named aggregate check and stale-review dismissal on the protected branch. Keep administrators subject to the rules. Define the previous known-good image by immutable ID. Record stage phases, source revision and image digests without secrets. On failure preserve diagnostic evidence, stop rollout, retain compatible schema and restore the previous image. The rehearsal creates no production environment or state.

## 10. Decisions

| State | Decision |
|---|---|
| CONFIRMED | ADR-024 locks GitHub Actions and the test stack. Master requires compatible migrations, approved review and distributed release safety. |
| PROPOSED | Read-only PR workflow, targeted local SAST, Git-audited flags, build artifact and runner-local staging rehearsal. |
| BLOCKED for live qualification | Hosted execution, enforced repository rules, M01.08 release qualification and any shared staging/production topology under G-11 remain open. |

[GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) · [BuildKit provenance](https://docs.docker.com/build/metadata/attestations/slsa-provenance/)
