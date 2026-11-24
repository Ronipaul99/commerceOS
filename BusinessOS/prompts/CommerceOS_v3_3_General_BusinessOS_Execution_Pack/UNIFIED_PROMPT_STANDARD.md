# Unified prompt operating standard

One work item = one saved prompt containing Phase A (design), Phase B (implementation or evidence creation) and Phase C (test/verify). That is **not** permission to skip risk-based approval.

- **M00:** documents/reviews only. No code. M00.01 is hypothesis mapping; no interviews.
- **Standard items:** proceed across phases in a single Codex run if prerequisite decisions and code exist. Stop after evidence for human review and merge.
- **High-risk items:** first run stops after design approval blocker; founder/qualified reviewer must approve before resuming the same prompt; independent review before merge. Do not fake independence by having same context write its own signoff.
- **M08:** measurable internal synthetic QA/performance/recovery; external merchants are not available. Signed external UAT is not a completion requirement for internal QA but remains a separate launch blocker.
- **M-F:** deferred, no native storefront/builder/checkout implementation.
- **Block:** when the master conflicts with code, a provider/financial rule is undecided, mandatory tests can't run, or a real external approval is needed. Never silently lower standards or claim completion.

Each prompt asks for exact design specs, domain invariants, migration, OpenAPI, UI states, access control, retry/failure handling, tests and actual run results, scaled to feature applicability.
