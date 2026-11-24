# CommerceOS v3.0 — Delivery Readiness Checklist (derived from Master Sections 21–24)

**Not evidence of completion.** Fill with links to actual work and approvals.

- [ ] RG0: generic workspace journeys, role matrix, synthetic acceptance cases, and deferred decisions reviewed by Product and Architecture
- [ ] RG1: auth, tenant/branch isolation, MFA, audit and privacy tests pass
- [ ] RG2: zero oversell in concurrency tests; collection/settlement and returns reconcile
- [ ] RG3: two-merchant controlled pilot UAT including onboarding, stock, orders, cash, returns
- [ ] RG4: plans, immutable order usage, overage/reversals and merchant billing reconciled before paid launch
- [ ] RG5: observability, backup/restore, incident on-call ownership, privacy/tax/security sign-off
- [ ] RG6: only if payroll enabled: wage policies legally reviewed, finalized runs immutable, privacy tests passed
- [ ] RG7: only if transactional partner API enabled: scopes, signing, rate, idempotency, settlement and key revocation tests
- [ ] All enabled features described accurately in pricing, onboarding and help docs
- [ ] Support and emergency escalation contacts assigned and tested
- [ ] Real migrations and smoke checks run in staging; rollback plan validated
- [ ] Known limitations disclosed; dates/SLAs measured and approved rather than invented
