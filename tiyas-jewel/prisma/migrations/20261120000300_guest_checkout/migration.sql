-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'COD');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('PENDING', 'PAID', 'FAILED', 'COD_PENDING');

-- CreateEnum
CREATE TYPE "OperationalState" AS ENUM ('NEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReservationState" AS ENUM ('HELD', 'FINALIZED', 'RELEASED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "customerName" VARCHAR(100) NOT NULL,
    "customerEmail" VARCHAR(254) NOT NULL,
    "customerMobile" VARCHAR(10) NOT NULL,
    "address" JSONB NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "subtotalPaise" INTEGER NOT NULL,
    "shippingPaise" INTEGER NOT NULL,
    "taxPaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMPTZ(3),
    "totalPaise" INTEGER NOT NULL,
    "taxMode" TEXT NOT NULL,
    "taxBps" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentState" NOT NULL,
    "operationalStatus" "OperationalState",
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reservationState" "ReservationState" NOT NULL,
    "reservationExpiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT,
    "sku" TEXT,
    "image" TEXT,
    "concept" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "lineTotalPaise" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "status" "PaymentState" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "initiationStartedAt" TIMESTAMPTZ(3),
    "verificationMetadata" JSONB,
    "verifiedAt" TIMESTAMPTZ(3),
    "lastReconciledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhook" (
    "eventId" TEXT NOT NULL,
    "bodyHash" CHAR(64) NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhook_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tokenHash_key" ON "Order"("tokenHash");

-- CreateIndex
CREATE INDEX "Order_accepted_operationalStatus_createdAt_idx" ON "Order"("accepted", "operationalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_reservationState_reservationExpiresAt_idx" ON "Order"("reservationState", "reservationExpiresAt");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_position_key" ON "OrderItem"("orderId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayOrderId_key" ON "Payment"("gatewayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayPaymentId_key" ON "Payment"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_status_lastReconciledAt_idx" ON "Payment"("status", "lastReconciledAt");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Price snapshots and acceptance rules are enforced independently of application code.
ALTER TABLE "Order" ADD CONSTRAINT "Order_money_check" CHECK (
 "discountPaise" = 0 AND "currency" = 'INR' AND "subtotalPaise" > 0 AND "shippingPaise" >= 0 AND "taxPaise" >= 0
 AND "totalPaise" BETWEEN 1 AND 100000000 AND "taxBps" BETWEEN 0 AND 10000
 AND "taxMode" IN ('inclusive','exclusive')
 AND "totalPaise"::bigint = "subtotalPaise"::bigint + "shippingPaise"::bigint + CASE WHEN "taxMode" = 'exclusive' THEN "taxPaise" ELSE 0 END
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_acceptance_check" CHECK (
 ("accepted" AND "operationalStatus" IS NOT NULL AND "reservationState" = 'FINALIZED' AND NOT "needsReview" AND (("paymentMethod" = 'ONLINE' AND "paymentStatus" = 'PAID') OR ("paymentMethod" = 'COD' AND "paymentStatus" = 'COD_PENDING')))
 OR (NOT "accepted" AND "operationalStatus" IS NULL AND "reservationState" <> 'FINALIZED')
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_reservation_check" CHECK (("reservationState" = 'HELD') = ("reservationExpiresAt" IS NOT NULL));
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_money_check" CHECK ("quantity" BETWEEN 1 AND 99 AND "unitPricePaise" >= 0 AND "lineTotalPaise"::bigint = "unitPricePaise"::bigint * "quantity" AND "position" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_money_check" CHECK ("amountPaise" BETWEEN 1 AND 100000000 AND "currency" = 'INR' AND "adapter" IN ('disabled','development','razorpay'));

ALTER TABLE "Order" ADD CONSTRAINT "Order_completed_check" CHECK (("operationalStatus" = 'COMPLETED') IS NOT DISTINCT FROM ("completedAt" IS NOT NULL) OR ("operationalStatus" IS NULL AND "completedAt" IS NULL));
