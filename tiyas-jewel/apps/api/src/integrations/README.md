# External integrations

Stage 04 adds payments.ts: server-only Razorpay test Orders/Payments HTTP calls, bounded timeouts, strict response parsing and timing-safe HMAC verification. No private payment credentials are exported to the storefront. The checkout module owns transactional order/stock decisions. An injected gateway fixture is used only by automated tests; the labelled development payment adapter is refused in production. See docs/CHECKOUT.md. Image storage remains Stage 05.
