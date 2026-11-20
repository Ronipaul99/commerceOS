-- Admin credentials already exist; add revocable opaque sessions and image metadata only.
CREATE TABLE "AdminSession" (
 "id" TEXT NOT NULL PRIMARY KEY, "tokenHash" CHAR(64) NOT NULL UNIQUE,
 "adminId" TEXT NOT NULL REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AdminSession_adminId_idx" ON "AdminSession"("adminId");
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
CREATE TABLE "ImageAsset" (
 "id" UUID NOT NULL PRIMARY KEY, "objectKey" TEXT NOT NULL UNIQUE,
 "width" INTEGER NOT NULL, "height" INTEGER NOT NULL, "bytes" INTEGER NOT NULL,
 "uploaderId" TEXT NOT NULL REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ImageAsset_dimensions_check" CHECK ("width" BETWEEN 200 AND 2400 AND "height" BETWEEN 200 AND 2400 AND "bytes" BETWEEN 1 AND 5242880),
 CONSTRAINT "ImageAsset_objectKey_check" CHECK ("objectKey" = 'products/' || "id"::text || '.webp')
);
ALTER TABLE "ProductImage" ADD COLUMN "assetId" UUID;
CREATE UNIQUE INDEX "ProductImage_assetId_key" ON "ProductImage"("assetId");
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ImageAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Historical product/variant references cannot be removed even outside admin code.
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
