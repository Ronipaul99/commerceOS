# M01 pending work and signoff

**Status** `BLOCKED` as of 25 November 2026, Asia/Kolkata. Use this checklist to resume pending work and record acceptance. The latest closeout covers all ten work items. Its hosted evidence is for PR #1 at head `0dc322bbf8e179a86cac9dd450d93eb6c7f7da09`. Recheck the exact head before using any of those results. [M01 closeout](M01_CLOSEOUT.md) · [PR #1](https://github.com/Ronipaul99/commerceOS/pull/1) · [Work-item tracker](../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/WORK_ITEM_STATUS.csv)

## Pending work

- [x] **Confirm the M00 prerequisite.** Roni paul confirmed it for M01 on 25 November 2026, supported by the recorded RG0 approval for M00.01–M00.06. [Closeout confirmation](M01_CLOSEOUT.md#exit-criteria-and-acceptance) · [RG0 signoff](RG0_SIGNOFF.md)
- [ ] **Qualify Docker Compose for M01.02.** Platform and QA run `node infra/local/manage.mjs test` on an authorized Docker Compose v2 runner. Attach the exact revision, command output and results for image build, startup, API and dependency smoke, fixture migration, reset, reseed and teardown. Use the disposable project and its scoped volumes. [M01.02 verification](features/M01.02/VERIFICATION.md)
- [ ] **Repair the hosted PostgreSQL fixture and rerun M01.04–M01.06 and M01.08.** Database engineering normalizes the disposable Testcontainers URI from `postgres://` to the accepted `postgresql://` form while preserving IPv4 loopback, fixture database and dedicated credential checks. On the new candidate, run the hosted migration and restore, Tenant A/B and branch isolation, worker crash and replay, and private file-job suites. Verify that the file-job suite actually runs on the updated lockfile. Attach passing job links for each suite. [Fixture diagnosis and hosted job links](M01_CLOSEOUT.md#github-and-fixture-checks-run-in-step-5)
- [ ] **Review the build, API, and security baselines.** Reviewers accept the M01.01 fresh-workspace build and dependency boundaries, the M01.03 API and generated-client compatibility results, and the M01.07 auth, session, secret scan and key rotation evidence. Record the required independent security and engineering reviews for M01.04–M01.07 and human review for the other work items. Keep live provider qualifications under their existing gates. [Evidence by work item](M01_CLOSEOUT.md#work-item-evidence)
- [ ] **Finish M01.09 release qualification.** Recheck the published candidate's dependency gate for zero high or critical advisories and confirm the hosted quality, supply-chain and native integration checks passed. Obtain approval from a different authorized human on the exact PR head. Run the disposable staging rehearsal and retain the image and provenance, migration and compatibility results, smoke tests, rollback and roll-forward evidence. Confirm the aggregate `BusinessOS release gate` passes. With repository administrator authorization, enforce it as a strict required check on `main`, require independent review, dismiss stale approvals and verify the resulting protection. [M01.09 release procedure](features/M01.09/IMPLEMENTATION_EVIDENCE.md#repository-adoption-and-rollback) · [First hosted run](https://github.com/Ronipaul99/commerceOS/actions/runs/45630630574)
- [ ] **Qualify M01.10 in staging.** Select and approve a staging deployment that contains M01.10. Record G-11 environment and fault-test boundaries, G-18 collector/exporter and alert routing, and G-12 access and retention. Roni paul is the recorded Platform, Data Recovery and Security contact. Obtain approval for the test destination and notification. Verify delivery for a database failure, stalled queue and failed job using synthetic fixtures. Record the revision, timestamps, safe trace IDs, approved recipient, receipts, recovery and alert clearing where applicable. Base any numeric thresholds on observed staging data. [M01.10 runbook](features/M01.10/RUNBOOK.md#staging-alert-and-recovery-drill)
- [ ] **Reconcile the final evidence.** Attach the reviewed release SHA and test links to the closeout and tracker. Verify versioned API contracts and migrations, two-tenant results, deploy and restore instructions, rollback, alerting and remaining risks. For any approved exception, record its approver, date, scope, conditions and expiry if applicable. The last closeout recorded no approved M01 exceptions. [M01 exit criteria](../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/MILESTONE_GATES.md#m01-engineering-platform-secure-sdlc-and-event-backbone)

## M01 milestone signoff

Complete this form after the M01 exit criteria pass. The independent GitHub review on the final SHA is separate evidence from milestone acceptance.

| Evidence | Reference |
|---|---|
| Final release commit and PR | Pending |
| Independent reviewer, review link and reviewed SHA | Pending |
| Passing hosted gate, staging rehearsal and rollback | Pending |
| Docker Compose, two-tenant and operational alert evidence | Pending |
| Approved exceptions and conditions, if any | Pending |

| Required role | Approver | Decision | Date | Evidence and conditions |
|---|---|---|---|---|
| Product | Pending | Pending | Pending | Pending |
| QA | Pending | Pending | Pending | Pending |
| Internal operations | Pending | Pending | Pending | Pending |

Once the required evidence and all three acceptance decisions are recorded, update the milestone closeout and affected tracker entries. M02 starts through its own authorized execution request.
