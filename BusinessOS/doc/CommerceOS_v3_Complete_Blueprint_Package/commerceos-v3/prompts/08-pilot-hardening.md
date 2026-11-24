# CommerceOS v3.0 | M08 | 08 Pilot Hardening

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 4, 20–22, 24.

## Required implementation
Complete two merchant UAT, real data migration strategy, security/test matrix, load, backup/restoration, runbooks, monitoring, permission exports, support access restrictions, accessible UX, mobile and POS low bandwidth. No claims of compliance absent signoffs.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
RG1–RG3 evidence, RG5 pilot readiness, actual load/restore results, open release blockers listed.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
