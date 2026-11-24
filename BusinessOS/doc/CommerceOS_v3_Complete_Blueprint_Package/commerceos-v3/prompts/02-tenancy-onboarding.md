# CommerceOS v3.0 | M02 | 02 Tenancy Onboarding

**Authority:** `../MASTER_BLUEPRINT.md` is binding. **Relevant sections:** Sections 3, 5, 16–20.

## Required implementation
Implement verified tenant membership, workspace roles, secure invitations and sessions, resumable workspace setup, and configuration history. Build the Business Web wizard and role-aware mobile entry. Follow ADR-025 for optional branch, import, tax, and payment setup.

## Execution steps
1. Read whole master and AGENTS; inspect current repository; identify missing open decisions and dependencies.
2. Propose files/DB migrations/API/events/permissions/UI/tests with requirement IDs. If blocked by named gates, say what remains blocked and implement only safe independent work.
3. Implement a complete vertical slice with idempotency, tenant and branch isolation, audit, metrics and recovery as appropriate.
4. Run actual lint, typecheck, unit/integration/e2e and relevant security tests. Provide exact executed commands, failures, screenshots when UI exists, migration/rollback and open issues.
5. Update master through change protocol only if owner approves requirement change; never introduce undocumented behavior.

## Acceptance and gate
Verify WS-01 through WS-03 with optional modules off. Exercise branch scope where branch features are enabled.

**Never claim deployment, live integration, legal compliance or successful tests without evidence.** Do not build native storefront or visual builder in this milestone unless this is an explicitly approved M-F project.
