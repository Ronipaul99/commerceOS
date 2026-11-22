-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCode" VARCHAR(32),
ADD COLUMN     "couponSnapshot" JSONB;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "discountPaise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ImageAsset" ADD COLUMN     "sourceHash" CHAR(64);

-- CreateTable
CREATE TABLE "CustomerReview" (
    "id" TEXT NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "productId" TEXT,
    "emailKey" CHAR(64) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "title" VARCHAR(120) NOT NULL DEFAULT '',
    "text" VARCHAR(3000) NOT NULL,
    "rating" INTEGER,
    "status" VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    "orderItemId" TEXT,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMPTZ(3) NOT NULL,
    "consentVersion" VARCHAR(30) NOT NULL,
    "moderatedBy" TEXT,
    "moderationReason" VARCHAR(500) NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewChallenge" (
    "id" UUID NOT NULL,
    "emailKey" CHAR(64) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "codeHash" CHAR(64) NOT NULL,
    "grantHash" CHAR(64),
    "submissionHash" CHAR(64),
    "submittedReviewId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerStory" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "caption" VARCHAR(2000) NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "reviewId" TEXT,
    "imageAssetId" UUID,
    "alt" VARCHAR(300) NOT NULL DEFAULT '',
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consentEvidence" VARCHAR(2000) NOT NULL,
    "consentAt" TIMESTAMPTZ(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "description" VARCHAR(300) NOT NULL DEFAULT '',
    "type" VARCHAR(10) NOT NULL,
    "value" INTEGER NOT NULL,
    "minimumPaise" INTEGER NOT NULL DEFAULT 0,
    "maximumDiscountPaise" INTEGER,
    "usageLimit" INTEGER,
    "perCustomerLimit" INTEGER,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "collectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paymentMethods" TEXT[] DEFAULT ARRAY['ONLINE', 'COD']::TEXT[],
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "emailKey" CHAR(64) NOT NULL,
    "state" VARCHAR(10) NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reel" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "caption" VARCHAR(2000) NOT NULL DEFAULT '',
    "transcript" VARCHAR(5000) NOT NULL DEFAULT '',
    "posterId" UUID NOT NULL,
    "instagramUrl" VARCHAR(100) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "rightsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Reel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReelProduct" (
    "reelId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReelProduct_pkey" PRIMARY KEY ("reelId","productId")
);

-- CreateTable

-- CreateTable
CREATE TABLE "ImageRendition" (
    "id" TEXT NOT NULL,
    "assetId" UUID NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ImageRendition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerReview_kind_status_createdAt_id_idx" ON "CustomerReview"("kind", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "CustomerReview_productId_status_createdAt_id_idx" ON "CustomerReview"("productId", "status", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerReview_emailKey_subjectKey_key" ON "CustomerReview"("emailKey", "subjectKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewChallenge_grantHash_key" ON "ReviewChallenge"("grantHash");

-- CreateIndex
CREATE INDEX "ReviewChallenge_expiresAt_idx" ON "ReviewChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewChallenge_emailKey_subjectKey_key" ON "ReviewChallenge"("emailKey", "subjectKey");

-- CreateIndex
CREATE INDEX "CustomerStory_published_position_id_idx" ON "CustomerStory"("published", "position", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_state_expiresAt_idx" ON "CouponRedemption"("couponId", "state", "expiresAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_emailKey_state_idx" ON "CouponRedemption"("couponId", "emailKey", "state");

-- CreateIndex
CREATE INDEX "Reel_published_position_id_idx" ON "Reel"("published", "position", "id");

-- CreateIndex

-- CreateIndex
CREATE UNIQUE INDEX "ImageRendition_objectKey_key" ON "ImageRendition"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "ImageRendition_assetId_width_version_key" ON "ImageRendition"("assetId", "width", "version");

-- AddForeignKey
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerStory" ADD CONSTRAINT "CustomerStory_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "CustomerReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerStory" ADD CONSTRAINT "CustomerStory_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ImageAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "ImageAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "ReelProduct" ADD CONSTRAINT "ReelProduct_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelProduct" ADD CONSTRAINT "ReelProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageRendition" ADD CONSTRAINT "ImageRendition_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ImageAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business invariants are enforced even when a caller bypasses application validation.
ALTER TABLE "Order" DROP CONSTRAINT "Order_money_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_money_check" CHECK (
 "discountPaise" BETWEEN 0 AND "subtotalPaise" AND "currency"='INR' AND "subtotalPaise">0 AND "shippingPaise">=0 AND "taxPaise">=0
 AND "totalPaise" BETWEEN 1 AND 100000000 AND "taxBps" BETWEEN 0 AND 10000 AND "taxMode" IN ('inclusive','exclusive')
 AND "totalPaise"::bigint="subtotalPaise"::bigint-"discountPaise"::bigint+"shippingPaise"::bigint+CASE WHEN "taxMode"='exclusive' THEN "taxPaise" ELSE 0 END
);
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_rating_check" CHECK ((rating IS NULL OR rating BETWEEN 1 AND 5) AND (kind <> 'PRODUCT' OR rating IS NOT NULL));
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_kind_check" CHECK ((kind='PRODUCT' AND "productId" IS NOT NULL AND "subjectKey"='PRODUCT:' || "productId") OR (kind='STORE' AND "productId" IS NULL AND "subjectKey"='STORE'));
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_status_check" CHECK (status IN ('PENDING','PUBLISHED','REJECTED'));
ALTER TABLE "ReviewChallenge" ADD CONSTRAINT "ReviewChallenge_attempts_check" CHECK (attempts BETWEEN 0 AND 5);
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_values_check" CHECK (code=upper(code) AND code ~ '^[A-Z0-9_-]{3,32}$' AND type IN ('FIXED','PERCENT') AND value>0 AND value<=100000000 AND (type<>'PERCENT' OR value<=10000) AND "minimumPaise">=0 AND ("maximumDiscountPaise" IS NULL OR "maximumDiscountPaise">0) AND ("usageLimit" IS NULL OR "usageLimit">0) AND ("perCustomerLimit" IS NULL OR "perCustomerLimit">0) AND "endsAt">"startsAt" AND version>0);
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_state_check" CHECK (state IN ('RESERVED','REDEEMED','RELEASED') AND "amountPaise">0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_discount_check" CHECK ("discountPaise">=0 AND "discountPaise"<="lineTotalPaise");
ALTER TABLE "ImageRendition" ADD CONSTRAINT "ImageRendition_bounds_check" CHECK (width>0 AND height>0 AND bytes>0 AND version>0);
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_instagram_url_check" CHECK ("instagramUrl" ~ '^https://www[.]instagram[.]com/reel/[A-Za-z0-9_-]{1,64}/$');
