# M01.01 v3.3 verification

**Status** PASS_REVIEW_REQUIRED

**Checked** 24 November 2026, Asia/Kolkata

| Requirement | Evidence |
|---|---|
| Master §§16.1 and 22 | [Design](DESIGN.md) describes the six independent app shells, strict TypeScript and public package dependency graph. |
| Scaffold and approvals | [Implementation evidence](IMPLEMENTATION_EVIDENCE.md) records workspace changes, approved POS scope and adoption of ADR-024 for v3.3. |
| Dependencies and scope | Frozen lockfile installation, preserved package graph rules and a workspace inventory without executable Storefront code. |

## Executed checks

Node.js 22.22.2 and pnpm 9.4.0 on Windows. The successful run used a fresh source snapshot in the ignored workspace cache directory. It copied the root build config, lockfile and tracked app/package source plus the new POS app. It started without `node_modules`, generated artifacts or environment files. Telemetry was disabled for build tools, and the frozen install was offline.

| ID | Command or harness | Actual result |
|---|---|---|
| M01.01-C01 | `pnpm.cmd install --offline --frozen-lockfile --store-dir D:/.pnpm-store --package-import-method copy --reporter append-only` | PASS. All 12 workspace projects resolved, 686 packages installed from the populated store and no packages downloaded. |
| M01.01-C02 | `pnpm.cmd run lint` | PASS. ESLint and dependency-cruiser. The graph reported 24 modules and ten dependencies. |
| M01.01-C03 | `pnpm.cmd run typecheck --concurrency=2 --force` | PASS. Ten strict TypeScript tasks with zero cache hits. |
| M01.01-C04 | `pnpm.cmd run build --concurrency=2 --force` | PASS. Six app builds with zero cache hits. Includes the independent POS static routes and Android and iOS mobile exports. |
| M01.01-C05 | Read-only Python smoke harness on stdin. Spawned `node dist/main.js` for API and Worker. Started each built Next app with `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port <available>` and checked its HTTP response. | PASS. API identity response, Worker bootstrap, Business Web, Platform Admin and POS responses. Verified the POS document heading, manifest scope and display, both PNG asset sizes, and Android/iOS bundle files. |
| M01.01-C06 | Read-only Python harness on stdin. Ran `depcruise.cmd --config <snapshot-config> apps [packages]` in isolated fixture directories. | PASS. Public domain import accepted. Private domain import, private package import, cross-app import and a circular graph failed with the expected rules. Workspace check found no Storefront app, importer or root script. |
| M01.01-C07 | Compared file hashes, lockfile importer and Git scope. Re-ran the previously approved M00.05 document/model checker after amending the v3.3 master. | PASS. Existing app/package source, RG0 review files and staged entries were preserved. Lockfile change is one importer. M00.05's seven checks passed. |

The first offline run used the workspace-local cache, which lacked a locked tarball. The populated store identified from the current installation supplied all packages. The next run built POS successfully but Windows denied execution of the Hermes compiler from the system temporary directory. The successful six-shell run used a fresh snapshot inside the workspace. No source changes to Business Mobile were needed.

## Scope and handoff

| Item | Result |
|---|---|
| Files | POS app, the POS lockfile importer, run instructions, M01.01 design/evidence/status, ADR-024 and its matching v3.3 amendments. |
| Schema, API, UI and events | No schema, database, OpenAPI, worker event or tenant-state changes. POS adds static HTML, manifest and icons. |
| Test applicability | Database, networked providers, business-role/tenant E2E, handheld runtime, browser installation, visual accessibility and load tests were not run. This verification exercised scaffold runtime and build boundaries. No production performance or release claim is made. |
| Approval and review | RG0 and M01.01 scope/toolchain decisions recorded. Human review and later feature/release gates remain pending. No PR or commit created. |
| Rollback | Remove the POS app and importer and revert scoped instructions and evidence. Change approval records through the master change process if withdrawing an approved decision. |
