# M01.01 Repository structure and package boundaries

## 1. Scope and boundaries

Master §§16.1 and 22 authorize separate API, Worker, Business Web, Business Mobile, POS and Platform Admin builds. This item adds the missing POS shell using the current web conventions and shared UI. The shell is generic across businesses. Register, inventory, payments, tenant activation and datastore behavior belong to their owning work items. Keep Storefront for M-F. [RG0](../../RG0_SIGNOFF.md) · [ADR-024](../../adr/ADR-024.md)

## 2. User and operator journeys

An engineer installs using the frozen lockfile and can build or start each application independently. A tester opens the POS landing page and sees the point-of-sale workspace label and online-first description via the shared responsive layout. The POS web app manifest exposes standalone display metadata and app icons. There is no operational UI flow in this slice. Loading, role denial, retries, sales and settlement apply when their associated features ship.

## 3. Ownership and dependency graph

- API, Worker and the web/mobile shells own independent entry points. Apps share contracts through the public typed packages as those contracts become available.
- Business Web, Platform Admin and POS consume the public UI package. Shared UI and Business Mobile consume semantic design tokens. TypeScript settings come from the shared config package.
- Apps do not import each other's private code. Shared packages cannot depend on applications. Backend domains communicate through explicit public interfaces. The existing boundary rules reject cycles and other illegal dependencies.

## 4. Persistence

NOT_APPLICABLE. This scaffold adds no schema, storage, stock ledger, migrations, backfill or seed data. In later slices the server will enforce tenant and branch scope, quantities, monetary amounts and authoritative state.

## 5. Contracts

POS serves the static GET / application entry point and GET /manifest.webmanifest plus its public icons. The existing API identity endpoint and worker bootstrap stay in their apps. There are no POS write commands, new backend OpenAPI paths, generated DTOs, events, pages containing tenant data or role claims. Typed business contracts belong to their later work items.

## 6. Security and privacy

Shells require no product secrets or backing services for build. POS has no tenant fields, credential prompts, browser state or service-worker caching of transactions. The platform API remains authoritative for future identity, branch access, role and field rights. Browser tenant authorization and private evidence verification are NOT_APPLICABLE to the static shell. Build and dependency verification checks import boundaries and absence of a Storefront workspace or deployable path.

## 7. Scale and recovery

No transactional workload applies. Verify reproducible builds with locked inputs, and smoke-check each existing runtime where tooling is available. Remove the POS app and its lockfile importer to roll back the shell. No database, queue or recovery procedure is required.

## 8. Verification plan

Use an isolated source snapshot with frozen offline installation, ESLint and dependency-cruiser, uncached strict typechecks and builds, an HTTP smoke check for the POS entry point, manifest and icons, and negative dependency fixtures. Verify separate build tasks and a workspace without an executable Storefront. Record all actual results and limits in [verification](VERIFICATION.md).

## 9. Operations

Use the local POS loopback port 3003. Existing build, ownership and app boundaries apply. No CI workflows, production deployment, alerts or observability services change in this slice.

## 10. Decision log

| State | Decision |
|---|---|
| CONFIRMED | Roni paul approved RG0 in both roles, confirmed the ADR-024 carry-forward and included an independent POS shell in M01.01. |
| CONFIRMED | Use the shared static web UI shell and existing pinned workspace stack for POS. Keep the optional operational POS capability in its owning milestone. |
| BLOCKED | Unapproved providers, future capabilities and production release retain their own gates. |
