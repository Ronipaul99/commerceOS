# BusinessOS

The M01.01 workspace provides independent application shells for the BusinessOS SaaS foundation. Follow the [engineering execution roadmap](doc/CommerceOS_v3_1_Engineering_Development_Package/commerceos-execution-v3.1/START_HERE.md) for work-item scope and sequencing.

## Run locally

Use Node.js 22.13 or later in the 22.x series and pnpm 9.4.0. Install from this directory.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
```

| Shell | Local command | Entry point |
|---|---|---|
| Business Web | `pnpm --filter @businessos/business-web dev` | `http://127.0.0.1:3000` |
| Platform Admin | `pnpm --filter @businessos/platform-admin dev` | `http://127.0.0.1:3002` |
| API | `pnpm --filter @businessos/api dev` | `http://127.0.0.1:3001` |
| Business Mobile | `pnpm --filter @businessos/business-mobile dev` | Expo Router for Android and iOS |
| Worker | `pnpm --filter @businessos/worker build` then `pnpm --filter @businessos/worker start` | Starts the Nest application context and exits after bootstrap |

Each shell has its own build. The mobile build exports Android and iOS bundles. Use an Expo-compatible device or simulator for native runtime verification.

## Package boundaries

- `packages/config` provides the shared strict TypeScript presets.
- `packages/design-tokens` provides platform-independent visual tokens. `packages/ui-web` consumes them in web components and exports its stylesheet.
- `packages/api-contracts` and `packages/api-client` reserve typed public package entry points for M01.03.
- `pnpm lint:boundaries` checks the dependency graph. Apps consume shared package entry points. Domain modules expose their public interface through their `index.ts`. The check rejects direct imports of private implementation files, imports between apps, and circular dependencies.

The foundation shells require no credentials or backing services. M00 design review remains pending. Later work items add runtime data, API contracts, and operational infrastructure.

## M01.01 verification

Verified locally with Node.js 22.22.2 and pnpm 9.4.0.

- `pnpm.cmd install --reporter append-only` generated the lockfile from a clean workspace. `pnpm.cmd install --offline --frozen-lockfile --reporter append-only` passed against the populated pnpm store.
- `pnpm.cmd run lint` passed. Synthetic dependency checks accepted public imports and rejected private package imports, private domain imports, cross-app imports, and cycles.
- `pnpm.cmd run typecheck --concurrency=2` passed all nine TypeScript tasks.
- `pnpm.cmd run build --concurrency=2` passed all five app builds and exported Android and iOS bundles.
- Local HTTP smoke checks returned the expected responses for the API, Business Web, and Platform Admin. The worker bootstrapped and exited successfully. Native mobile verification covered bundle export.

The repository [CODEOWNERS](../.github/CODEOWNERS) rule covers the `BusinessOS/` subtree. A rollback reverts the scaffold, lockfile, tracked M01.01 evidence, and the scoped ownership rule. This slice creates no persisted business data.
