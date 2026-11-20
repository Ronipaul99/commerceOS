# STAGE 04 — CHECKOUT, PAYMENTS & ORDER CREATION

Continue TIYAS JEWEL.

Preserve the existing storefront and backend architecture.

Implement secure guest checkout and basic order capture.

This application does not require an advanced Order Management System.

## 1. Checkout screen

Route:
/checkout

Implement guest checkout.

Customer information:
- Full name
- Email
- Indian mobile number

Delivery information:
- Address line 1
- Address line 2
- Landmark
- City
- State
- PIN code

Country defaults to India.

Validate all fields with shared Zod schemas and server-side validation.

Do not require customers to create accounts.

## 2. Order summary

Show:
- Product image and name
- Selected variant
- Quantity
- Unit price
- Subtotal
- Shipping fee
- Applicable tax
- Final total

Calculate all authoritative totals in the Fastify backend.

Use precise INR monetary calculations.

Never accept frontend-submitted prices as authoritative.

## 3. Shipping configuration

Implement configurable rules for:
- Shipping fee
- Free-shipping threshold
- Serviceable PIN codes, if configured
- COD availability

Do not implement courier APIs.

Shipping will be arranged manually by the store owner.

## 4. Payment methods

Implement:

A. Razorpay Online Payment
B. Cash on Delivery, if enabled

Use Razorpay test mode initially.

## 5. Fastify payment integration

Implement:
- Secure Razorpay order creation
- Server-side payment amount calculation
- Payment signature verification
- Webhook signature verification
- Idempotent webhook processing
- Payment failure handling
- Payment status reconciliation

Do not mark an order paid based only on a frontend success callback.

Never expose private Razorpay credentials to the browser.

## 6. Order database

Create:

Order:
- ID
- Order number
- Customer name
- Customer email
- Phone number
- Delivery address snapshot
- Subtotal
- Shipping fee
- Tax
- Discount
- Total
- Payment method
- Payment status
- Operational status
- Created timestamp
- Completed timestamp

OrderItem:
- Order ID
- Product ID
- Product name snapshot
- Variant/SKU snapshot
- Quantity
- Unit price snapshot
- Total price

Payment:
- Order ID
- Provider order ID
- Provider payment ID
- Payment status
- Amount
- Verification metadata
- Timestamps

Use database constraints and suitable indexes.

## 7. Order status

Keep the operational workflow extremely simple:

NEW → COMPLETED

Payment states are separate:
- PENDING
- PAID
- FAILED
- COD_PENDING

Only accepted orders with verified online payment or valid COD placement should appear as actionable new orders.

Do not treat failed online payments as new orders to fulfill.

## 8. Stock protection

Implement minimal but safe stock handling:
- Validate availability before checkout
- Prevent concurrent overselling
- Reserve stock for pending payments when necessary
- Release expired or failed reservations
- Deduct or finalize stock exactly once
- Handle duplicate payment notifications

Use database transactions, not only frontend checks.

Do not implement warehouse or advanced inventory systems.

## 9. Backend endpoints

Implement suitable secured or public endpoints for:
- Checkout quote
- Payment initiation
- Payment verification
- Razorpay webhook
- COD order placement
- Order confirmation

Use versioned REST routes.

Apply validation, idempotency and appropriate rate limiting.

## 10. Order confirmation

Create a premium confirmation screen displaying:
- Order number
- Products
- Amount
- Payment method
- Payment status
- Delivery address

Use an unguessable confirmation token or equivalent secure access mechanism.

Do not expose customer order records using predictable public identifiers.

## 11. Edge cases

Handle:
- Empty cart
- Invalid address
- Product unavailable
- Incorrect price
- Failed payment
- Duplicate checkout request
- Duplicate webhook
- Payment timeout
- Insufficient stock
- Invalid coupon if discounts are enabled

## 12. Testing

Test:
- Guest checkout
- Validation errors
- Successful test payment
- Failed test payment
- Invalid payment signature
- COD order
- Duplicate webhook
- Concurrent stock updates
- Order persistence
- Order confirmation privacy
- Accurate totals

If Razorpay credentials are missing, implement a clearly labeled development-only payment adapter.

Do not simulate or claim successful production payment integration.

## Acceptance criteria

- Customers can complete guest checkout.
- Razorpay test payments work.
- COD works when enabled.
- Orders are saved in PostgreSQL.
- Payment status is recorded correctly.
- Product stock is protected.
- Order confirmation works securely.
- All checkout screens work on mobile.

Do not implement admin screens yet.

Update the implementation status.

Stop after Stage 04.
