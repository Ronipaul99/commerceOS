# TIYAS JEWEL - Stage 03

A single jewellery storefront for India: Next.js App Router, a Fastify API and PostgreSQL. Stages 01-03 are implemented: the approved homepage, shop/collections, product details, API search, persistent anonymous cart and wishlist. Checkout, payments and admin remain later stages.

## Development and checks

Run `npm.cmd run dev` for web/API after configuring and migrating a dedicated database as described below. The homepage alone can be previewed with `npm.cmd run dev:web`; actual shopping requires the API. Run `npm.cmd run lint`, `npm.cmd run typecheck` and `npm.cmd test` for static/unit checks.

Real-database tests require explicit isolated targets. Set TEST_DATABASE_URL for `npm.cmd run test:integration` and E2E_DATABASE_URL for `npm.cmd run test:e2e`. Apply migrations/seed to that dedicated test database first. Never use a shared/live target: integration checks create and remove temporary records. The E2E runner owns API/web servers on loopback 4100/3200 and captures desktop/mobile screens under `output/playwright/`. Rebuild normally with `npm.cmd run build` before production start after E2E, because its test rewrite origin is compiled at build time.

See [shopping contracts](docs/SHOPPING.md), [design system](docs/DESIGN_SYSTEM.md), [assets](docs/ASSETS.md) and [implementation results](docs/IMPLEMENTATION_STATUS.md). Product photography remains illustrative concept art pending approved catalog images. Cart quotes do not reserve stock or accept payment. Newsletter signup remains a UI-only preview.

## Requirements

Node.js 22.12+ (22 LTS) or Node.js 24 LTS and npm 10+. Docker Engine/Desktop with Compose v2 is needed only for the container environment, not the standalone homepage preview. Containers use Node 24 and PostgreSQL 17. Use `npm.cmd` / `npx.cmd` on Windows if PowerShell blocks the `.ps1` wrappers.

## Host development

Run all commands from `tiyas-jewel/`:

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Edit .env: choose a URL-safe random POSTGRES_PASSWORD and match it in DATABASE_URL.
npm.cmd run db:start
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Open http://localhost:3000; direct host API: http://127.0.0.1:4000/api/health. Browser API calls use `/api/*` through Next.js rewrites. The host database override binds PostgreSQL to **127.0.0.1:5432 only**. To use an existing dedicated PostgreSQL instance, omit `db:start` and supply its URL. No database is needed to view the homepage preview; `npm.cmd run dev:web` starts it alone. API startup requires a real database connection.

`npm ci` generates Prisma Client and builds shared contracts without connecting to PostgreSQL. Use `npm install` only when intentionally updating the lockfile. Fastify and the Prisma CLI read the project-root `.env` from their documented commands. Next.js loads the same file for its server-only upstream configuration; it never reads database credentials in application code.

## Full local containers

```powershell
npm.cmd run compose:up
# Explicitly seed the local development database (never automatic on startup):
docker compose --profile tools run --rm seed
# Optional local single-domain Nginx entry point at http://localhost:8080:
docker compose --profile edge up -d --wait nginx
npm.cmd run compose:down
```

Web: http://localhost:3000. The default Compose configuration publishes no API or PostgreSQL port. Database data lives in the named `postgres_data` volume; `compose:down` preserves it. The migration job completes before API startup, and API readiness checks run before web startup. Seeding does not create an admin user and is blocked when `NODE_ENV=production`. The explicit Compose seed job overrides that value for local development only.

Docker enables `NEXT_OUTPUT_STANDALONE=true` and launches the generated standalone server; host builds use `next start`. Container rewrites compile the internal `http://api:4000` upstream at build time. Host builds compile `API_INTERNAL_URL` from `.env` (default `http://127.0.0.1:4000`). Rebuild when changing that origin. Nginx routes `/api/` straight to Fastify and all other requests to Next.js. The foundation HTTP configuration is for local use; see the deployment plan before exposing anything publicly.

## Commands

| Command | Purpose |
| --- | --- |
| `npm.cmd ci` | Reproducible install, Prisma generation, shared build |
| `npm.cmd run dev` | Shared contracts watcher + API + web |
| `npm.cmd run dev:api` / `dev:web` | Start one application |
| `npm.cmd run db:start` | Start persistent PostgreSQL with loopback-only host access |
| `npm.cmd run db:validate` / `db:generate` | Validate schema / generate client |
| `npm.cmd run db:migrate` | Apply checked-in migrations without a reset |
| `npm.cmd run db:migrate:dev -- --name NAME` | Author a migration on an isolated development database |
| `npm.cmd run db:seed` | Insert missing development fixtures without overwriting existing products |
| `npm.cmd run typecheck` | Strict checks across apps, shared code, seed and tests |
| `npm.cmd test` | Vitest unit, API injection and HTTP-client checks |
| `npm.cmd run test:integration` | Real PostgreSQL catalog and database-constraint checks |
| `npm.cmd run build:web` / `build:api` | Build each app (including shared contracts) |
| `npm.cmd run build` | Build both apps |
| `npx.cmd playwright install chromium` | Install the browser used by end-to-end checks |
| `npm.cmd run test:e2e` | Build/start isolated API/web and check real shopping flows; requires E2E_DATABASE_URL |
| `npm.cmd run compose:up` / `compose:down` | Start / stop the container environment |

For integration tests, explicitly set `$env:TEST_DATABASE_URL` to a dedicated migrated, seeded database, then run `test:integration`. Tests never fall back to `DATABASE_URL`. They briefly test invalid writes inside rolled-back transactions; they must not target a shared or live database. Playwright screenshots go to ignored `output/playwright/`. See SHOPPING.md for the Stage 03 test-server and database requirements.

## Read-only API

- `GET /api/health` - database-backed readiness (200 or 503).
- `GET /api/v1/products?page=1&limit=12` - active products, bounded pagination.
- `GET /api/v1/products/:slug` - active product details; 404 for hidden/missing products.
- `GET /api/v1/categories` / `collections` - active taxonomies.

Responses use `{ data }`, with `{ pagination }` for products. All money is integer INR paise. Invalid input returns 400; unexpected failures return sanitized 500 responses with request IDs. No public mutations exist. See [architecture](docs/ARCHITECTURE.md), [database](docs/DATABASE.md), [deployment plan](docs/DEPLOYMENT_PLAN.md) and [verified implementation status](docs/IMPLEMENTATION_STATUS.md).
