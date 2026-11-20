# Stage 04 - Guest checkout, payments and order capture

## Scope and trust boundary

Next.js renders guest checkout and private confirmation using shared Zod contracts and same-origin HTTP. Fastify alone accesses PostgreSQL, computes money, reserves stock, creates provider orders and verifies payments. No customer accounts, admin UI, courier API or advanced OMS is introduced. Orders have only NEW/COMPLETED operational states; pending attempts have a null operational state and accepted=false.

All catalog and order money is integer INR paise. Quotes reject empty/duplicate/unavailable selections rather than silently dropping them. The backend recomputes a quote under product/variant row locks before order placement. The caller's expected total and quote fingerprint are consent checks, never price inputs. A changed price, option, shipping/tax configuration or image snapshot requires reviewing a fresh quote. Coupons and client discounts are unsupported and rejected by strict schemas. Discount is constrained to zero in Stage 04.

## Configuration

Root .env is ignored; .env.example contains placeholders. API-only configuration:

| Variable | Default / meaning |
| --- | --- |
| PAYMENT_ADAPTER | Auto: Razorpay if test keys are present; otherwise development outside production, disabled in production |
| RAZORPAY_KEY_ID | rzp_test_ key only; live keys are deliberately rejected in this stage |
| RAZORPAY_KEY_SECRET | Private API secret, never returned to Next.js/browser |
| RAZORPAY_WEBHOOK_SECRET | Separate private signing secret, required with the Razorpay adapter |
| COD_ENABLED | false; optional COD only when explicitly enabled |
| SHIPPING_FEE_PAISE | 9900 |
| FREE_SHIPPING_THRESHOLD_PAISE | 199900; threshold applies to merchandise subtotal |
| SERVICEABLE_PIN_CODES | Empty accepts syntactically valid six-digit Indian PIN codes; otherwise exact comma-separated allowlist |
| TAX_MODE | inclusive or exclusive, default inclusive |
| TAX_BPS | 0 by default; set the approved merchant goods tax rate in basis points |
| RESERVATION_MINUTES | 15, allowed 5-60 |

Inclusive tax is a rounded extraction from the merchandise subtotal; it is not added again. Exclusive tax is rounded once on the entire merchandise subtotal and added to the total. Rounding uses BigInt half-up integer division. Shipping is a final configured charge with no additional tax calculation. The total is limited to 100000000 paise (INR 10,00,000). These are explicit configurable implementation defaults, not confirmation of a merchant's tax obligations. Shipping/tax/COD/legal policy must be approved before launch.

The development adapter uses unmistakable development provider IDs and verification metadata, has visible no-money-collected copy, and is refused when NODE_ENV=production. Its action endpoint is absent outside that adapter. Compose uses production-mode images and defaults to disabled online payment: configure Razorpay test keys or enable COD for container checkout. Do not turn on the development adapter in production containers.

## HTTP contracts

Successful responses use { data }; shared schemas validate both sides. Requests are strict JSON. Unknown confirmation tokens receive the same 404 regardless of whether an order number exists.

| POST /api/v1 route | Input / behavior |
| --- | --- |
| /checkout/quote | items with product/variant IDs and quantity, pinCode; current item snapshots, shipping, tax, final total, fingerprint and available methods |
| /checkout/place | items, pinCode, validated customer/address, method, expectedTotalPaise, quoteFingerprint, UUID idempotencyKey and 256-bit confirmationToken |
| /checkout/verify | private token plus Razorpay order/payment/signature response; server HMAC and provider API capture/amount/currency checks |
| /checkout/reconcile | private token; fetch authoritative provider status, recover missed callbacks and return current order |
| /webhooks/razorpay | exact raw JSON bytes plus x-razorpay-signature and x-razorpay-event-id; authenticates before parsing |
| /orders/confirmation | private token only; snapshot, payment and acceptance state, no credential/hash/internal identifiers |
| /checkout/development-payment | development-only private token and success/failure outcome; no real payment |

The browser generates the cryptographically random confirmation token before submitting checkout. PostgreSQL stores only its SHA-256 hash. The private confirmation URL uses a fragment, /order-confirmation#token, so it is absent from HTTP paths, proxy access logs and referrers. API calls carry it in JSON bodies which are not logged. Only token/retry key are held in sessionStorage; customer/address data are not persisted in browser storage. Confirmation is no-index/no-referrer and API responses use no-store. Sharing the bearer link grants access to that snapshot. There is no public order list or predictable-number lookup.

A matching idempotency key returns the same order; a changed normalized request or confirmation token conflicts. A PostgreSQL transaction advisory lock serializes identical keys, while unique constraints remain the final guard. After an ambiguous network result, retry the same key or open its private confirmation. Never create a new key simply because a callback was missed.

Creation is limited to 12 requests/IP/minute, checkout/confirmation reads to 90 and webhooks to 240. The limiter has bounded per-process storage, distrusts forwarded IP headers and accepts only configured browser origins when Origin is present. This stage uses one API process. Before public deployment qualify the trusted proxy/client-IP topology and edge throttling: otherwise proxied requests share their proxy IP bucket. Multiple API replicas would need a shared limiter; replicas are not introduced here.

## Stock and payment state

Placement locks catalog rows in stable order, validates exact quantities and conditionally decrements the selected product or variant stock inside the same order transaction. Decremented stock represents a HELD reservation, unavailable to later buyers. COD immediately transitions to FINALIZED/COD_PENDING/accepted/NEW. Online stays HELD/PENDING/unaccepted with an expiry timestamp. No failed or pending attempt is actionable.

Captured payment must match the stored provider order, INR and exact amount. Callback HMAC alone is insufficient: the provider API must report captured status. A successful transition finalizes already-held stock without deducting twice, marks PAID and accepts NEW. Order-row locks serialize callbacks, worker, expiration and webhooks. Event IDs/body hashes are persisted atomically with state updates; duplicate and out-of-order failures cannot reverse PAID.

Failures and expiry release each HELD reservation once in a transaction. Expired orders become FAILED/unaccepted with null operational status. A late captured payment after release tries to reacquire all required stock under locks. If unavailable, payment is still truthfully recorded PAID, needsReview=true, accepted=false and no operational state: it must never be fulfilled automatically. The merchant must investigate and arrange a refund/resolution via Razorpay. Automatic refund orchestration is outside the requested minimal order workflow.

The API process runs a non-overlapping 30-second maintenance loop. It expires up to 50 holds per pass and reconciles up to 25 recent pending/failed Razorpay attempts, oldest checked first, covering seven days. HTTP quote/place/confirmation also expire due holds; a restart catches expired holds on startup. Provider outages do not manufacture successful payment. A late verified webhook or private reconciliation can still resolve older attempts. The loop stops before database shutdown; no separate queue/microservice is added.

Provider order creation is durably claimed before a network call. A timeout/crash is ambiguous: retries/maintenance search for the exact receipt and attach it; they never automatically send a second create. If the call never reached Razorpay, the original hold expires and the customer can start a new checkout. Provider receipt/order amount/currency are checked before attachment. This prefers a safely recoverable pending attempt over duplicate payment sessions.

## Database and future admin boundary

Migration 20261120000300_guest_checkout adds Order, OrderItem, Payment and PaymentWebhook with unique retry/token/provider/event keys, money/quantity/acceptance checks and operational/expiry/reconciliation indexes. Contact/address and line product/SKU/price/image snapshots are immutable after capture. Historical product/variant identifiers are retained as snapshots, allowing archived/deleted catalog items to remain intelligible. Stage 05 must archive instead of deleting a product/variant with a HELD reservation. Order child relations restrict deletion; no public delete/update endpoints exist. Completed timestamps are constrained to COMPLETED.

Future admin order lists must use accepted=true and operationalStatus=NEW (or COMPLETED), not payment attempts by creation date. Both operational states are independent of payment state. No admin implementation is included here.

## Razorpay test setup and qualification

1. Configure all three test secrets server-side; set PAYMENT_ADAPTER=razorpay. Never put secrets in NEXT_PUBLIC_ variables.
2. Configure automatic payment capture in the Razorpay dashboard. Authorized-only payments remain pending and are not accepted for fulfilment.
3. Configure a public HTTPS webhook endpoint /api/v1/webhooks/razorpay for payment.captured, payment.failed and order.paid with the same webhook signing secret. Localhost cannot receive remote webhook delivery directly.
4. Exercise real Razorpay test success/failure/callback/webhook/reconciliation on staging before launch. Stage 04 rejects live keys; enabling live payments requires a separately reviewed deployment change.

This environment has no Razorpay credentials. Automated tests use an explicitly injected provider fixture to test the real HMAC/API-verification/state logic and a visibly labelled development adapter for browser flows. This does not establish real Razorpay-account test payment or production integration success.

The local Nginx API read timeout is 60 seconds to cover bounded provider verification calls. This manifest change has not been container-runtime qualified on this machine.

Primary provider references used for implementation:

- [Standard checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Create an order](https://razorpay.com/docs/api/orders/create/)
- [Receipt lookup for ambiguous creation](https://razorpay.com/docs/api/orders/fetch-all/)
- [Raw webhook signatures, duplicate IDs and event ordering](https://razorpay.com/docs/webhooks/validate-test/)

## Reproducible checks

Use TEST_DATABASE_URL for integration tests and a separate E2E_DATABASE_URL for browser tests. Both must point to dedicated disposable local databases with all migrations and the opt-in catalog seed. Checkout integration tests create isolated catalog/order fixtures and delete them in cleanup. Browser tests place development/COD orders under a unique per-test email in their dedicated database. Their cleanup transaction deletes only those fixture orders and returns held/finalized stock, keeping repeat runs usable. Never point tests at a shared catalog.

Run npm.cmd run typecheck, npm.cmd run lint, npm.cmd test, npm.cmd run test:integration and npm.cmd run test:e2e. Browser tests force the development adapter and clear provider credentials in the child server environment. They own local API/web ports 4100/3200. A subsequent normal npm.cmd run build restores the normal API rewrite origin after the suite. Screenshots are under output/playwright/stage04-checkout-{desktop,tablet,mobile}.png and stage04-confirmation-{desktop,tablet,mobile}.png.
