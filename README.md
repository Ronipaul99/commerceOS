# TIYAS JEWEL

Stage 01 foundation for a premium Indian jewellery storefront. A single Next.js App Router application, with a refined public shell and a separate, simple admin preview. **All commerce and administration routes are placeholders.**

## Local setup

Use Node.js 22.18+ (22 LTS) or 24.11+ (24 LTS) and npm. Dependencies are pinned in `package-lock.json`.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:3000. The static shell also runs without `.env`; configuration defaults are safe for local preview. Prisma Client is generated during install. No PostgreSQL connection, Razorpay account, or admin credentials are needed to browse Stage 01.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm start` serves the production build on port 3000. Playwright starts its own production server on port 3100 and checks desktop/mobile routes; run the build first. Screenshots are under ignored `test-results/`. Tailwind 4 uses `postcss.config.mjs` and CSS tokens in `src/app/globals.css`. Fonts are self-hosted from Fontsource; builds do not fetch Google Fonts.

## Configuration and database

`.env.example` documents every supported variable. Zod validates supplied variables when the root server layout is loaded (including the build); malformed values fail with variable names, without echoing secrets. Only the explicit string `true` enables COD. Tax/shipping remain unset. Production canonical URLs require HTTPS except loopback local previews.

Database and integration credentials are optional for Stage 01. `getDb()` fails clearly when database services are used without `DATABASE_URL`. Later database work needs a PostgreSQL database and a real connection string. Use a pooled runtime URL and `DIRECT_DATABASE_URL` for CLI migrations where appropriate. Prisma 7 uses the PostgreSQL adapter. `npm run db:generate` and `npm run db:validate` do not connect to a database.

The initial schema contains only a configuration model, with INR, COD defaulting off, and nullable tax/shipping rule objects. No migration, seed, store settings persistence, or business table is implemented. Do not run `npm run db:migrate` until the next authorized database stage and target have been reviewed. JSON rule inputs are syntax-validated only; their domain schemas and precedence over persisted settings are deferred.

## Project guide

- `src/app/(storefront)/`: public layout and all customer route placeholders.
- `src/app/admin/`: admin layout and route placeholders; no authentication or privileged actions yet.
- `src/components/`: shared presentation and storefront chrome.
- `src/modules/`: domain ownership boundaries for later stages.
- `src/config/`: Zod environment validation; `env.ts` is server-only.
- `src/lib/db/`: server-only lazy Prisma access.
- `prisma/`: PostgreSQL schema; `prisma.config.ts` selects the migration URL.
- `tests/e2e/`: route, navigation, responsive, and preview-boundary checks.
- `docs/`: architecture, design guidance, and stage status.

The supplied path `design/reference/tiyas-homepage.png` was absent during Stage 01. The visual foundation is provisional and follows the written brief. Add the reference there before a later visual implementation stage. No reference image, product photography, or fake jewellery illustration has been substituted.

Read [architecture](docs/ARCHITECTURE.md), [design system](docs/DESIGN_SYSTEM.md), and [implementation status](docs/IMPLEMENTATION_STATUS.md). Stop at Stage 01; no live commerce, customer accounts, fulfillment engine, or added infrastructure.
