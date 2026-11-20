# Historical Stage 04 verification

Current stage: **04 - Checkout, payments and order creation**. Stage 04 is implemented and its available checks pass. Work is limited to Stage 04. Admin remains Stage 05.

## Delivered

- Preserved the Stage 02 homepage, shared luxury tokens, existing shopping layouts and Next.js/Fastify/PostgreSQL boundaries.
- Guest checkout with shared/server Zod validation for contact details, Indian mobile, complete delivery address, state/union territory and PIN code. No customer account is required.
- Authoritative quote, unit/line prices, shipping, goods tax, zero discount and totals in integer INR paise. The caller's total/fingerprint are consent checks; backend pricing is recomputed under locks.
- Configurable shipping fee/free threshold, exact PIN allowlist, optional COD, tax mode/rate and reservation lifetime.
- Order/OrderItem/Payment snapshots and transactional PaymentWebhook deduplication in an additive migration. No order or admin seed data.
- Idempotent placement with UUID keys, request digest, unique constraints and transaction serialization. Same request returns the same order; changed requests conflict.
- Safe stock holds, conditional decrements, exact-once finalization/release, automatic expiry and late-capture stock recheck. Failed/pending attempts have no actionable operational state. Only accepted PAID/COD_PENDING orders are NEW.
- Razorpay TEST order creation, server HMAC and provider API amount/currency/capture checks, exact raw-body webhook signatures, transactional duplicate handling and periodic/on-demand reconciliation. Ambiguous creates recover by receipt without automatic duplicate creation.
- Clear development-only payment simulator when test credentials are absent, refused in production. No real payment success is claimed.
- Private token-gated confirmation with hashed 256-bit access tokens, URL fragments, no public order-number lookup, no-store responses and no customer address/contact persistence in browser storage.
- Premium checkout/order summary/payment/confirmation screens, COD and pending/failed/review states; cart clears purchased selections once after accepted confirmation.
- Bounded per-process rate limiting, untrusted forwarded-header protection and configured-origin enforcement for checkout endpoints.

## Database/environment

The ignored configured .env remains private; .env.example contains placeholders and Stage 04 settings. Inspection confirmed the original two migrations and 14 catalog records before the additive third migration. The configured Neon database now has all three completed migrations and the new commerce tables. The existing catalog was preserved. No checkout tests, fake orders, seed reset or admin creation were performed against Neon. Health and a read-only checkout quote returned 200; order/payment counts remained zero.

All test writes use dedicated local PostgreSQL 17.12 databases, tiyas_stage04 and tiyas_stage04_e2e. The full migration applied successfully from scratch to the latter. An initial local-only constraint typo was corrected and its final constraints completed before recording the local test migration; the fresh-database and configured-database applications then succeeded using the complete checked-in SQL. No shared database reset was used.

Razorpay test credentials are absent. The real integration is implemented and its verification/state paths tested using an injected provider fixture. Browser flows use the visibly labelled development simulator or COD. Real Razorpay-account test payments and remote webhook delivery remain unverified pending test credentials/public HTTPS staging.

## Verification - 20 November 2026

| Check | Result |
| --- | --- |
| Shared/API/web/tools TypeScript | PASS |
| Lint | PASS |
| Unit/schema/API injection tests | PASS: 34 tests in eight files |
| Real PostgreSQL integration | PASS: 29 tests in three files |
| API/frontend production build | PASS in browser runner; normal-origin rebuild is restored after the final suite |
| Fresh complete migration | PASS: all three migrations on a new isolated database |
| Configured database migration | PASS: all three completed; 14 existing catalog records preserved |
| Stock/concurrency/idempotency | PASS: distinct-buyer oversell prevented; concurrent identical key returns one order; variant stock protected |
| Payment/security | PASS using provider fixture: invalid signatures/mismatched amounts rejected; authorized-only remains pending; duplicate/out-of-order webhooks safe; missed callbacks reconcile |
| Expiry/failure/late capture | PASS: holds release once; late capture reacquires safely or records PAID/review without an actionable order |
| Database constraints | PASS: pending acceptance, altered total and invalid completion timestamp rejected |
| Production browser suite | PASS: 46 passed (1.8m); two duplicate tablet/mobile viewport sweeps intentionally skipped |
| Desktop/mobile visual review | PASS: 1440px desktop and 390px mobile checkout/confirmation inspected after fixes; tablet captures also available |
| Real Razorpay test-account payment | NOT RUN: credentials absent; no production-payment claim |
| Docker/Nginx/OCI/ARM64 runtime | NOT RUN: Docker unavailable; live deployment remains Stage 06 |

## Screenshots and remaining work

Final Stage 04 captures are under ignored output/playwright/stage04-checkout-{desktop,tablet,mobile}.png and stage04-confirmation-{desktop,tablet,mobile}.png. Existing Stage 03/02 captures and checks are retained; see STAGE03_VERIFICATION.md.

See CHECKOUT.md for route contracts, token privacy, payment/stock transitions, worker bounds, rate-limit topology, tax/shipping defaults and test setup. Before launch qualify real Razorpay test callbacks/webhooks on HTTPS, approve shipping/tax/legal policy and production catalog photographs, and qualify trusted proxy/edge throttling. Late paid-but-unavailable attempts require merchant refund/resolution; they never enter the fulfilment queue. Live Razorpay keys are deliberately rejected in this stage.

The final suite uses PostgreSQL and the Fastify API for checkout and browsing. Initial browser assertions were narrowed to exclude Next.js route announcements. Visual review corrected page gutters, stale field errors and mobile summary placement before payment; the complete final suite then passed. The normal build origin is restored after testing. Nonblocking pg 8 query-queue and future SSL-mode notices remain; no TLS verification bypass was introduced.

No admin screens, customer accounts, courier integrations, complex OMS, multitenancy or enterprise modules were introduced. Stop after Stage 04.
