# BusinessOS feature approval checklist

**M00.05 review aid** Unchecked until evidence is attached. [Gate register](DECISIONS_LOG.md) · [ADR template](ADR_TEMPLATE.md)

## Decision review

- [ ] Identify requirement, work item, deadline, capability, gate IDs and applicable release gates.
- [ ] Confirm source hierarchy, prior approval scope, and any unresolved conflict or replacement.
- [ ] Record the decision owner, required approvers, scope and exclusions, exact revision, evidence and effective window.
- [ ] Document the blocked default. Multiple required gates apply together where the action depends on each one.
- [ ] Route tax/GST, payment, pricing, identity and payroll decisions to their accountable reviewers. Record jurisdiction review separately where applicable.
- [ ] Attach expected and actual verification with fictional or authorized test fixtures. Distinguish document/model checks from runtime evidence.
- [ ] Check denial for missing/expired/wrong-scope approval, client or agent-supplied defaults, and unauthorized automatic effects. Verify scope and idempotent retry.
- [ ] Review handling of restricted evidence, audit, compatibility, rollback, prior issued records and remaining operational risk.

## Acceptance and activation

- [ ] Obtain actual required human decisions with approver, date, decision revision, scope and evidence link.
- [ ] Obtain independent review before merge. Record conflicts and residual risks.
- [ ] Record the approved master/ADR amendment and effective decision. Retain BLOCKED where evidence is incomplete, and mark only the approved scope APPROVED.
- [ ] For RG0, obtain Founder/Product and Architecture design signoff with unresolved gates explicitly recorded.
- [ ] Before enabling a gated behavior, obtain its release evidence and authorization. Confirm tenant/role checks, entitlement and independent domain safeguards.
- [ ] Record review, change and verification links and the rollback owner. Treat external validation as PENDING until genuine evidence is recorded.

**Approval record** Pending. Checklist completion documents evidence and approval. It does not automatically merge, deploy or start another work item.
