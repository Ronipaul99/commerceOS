BEGIN;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "compareAtPaise" INTEGER,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sku" TEXT;

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "concept" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "imageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_active_featured_idx" ON "Product"("active", "featured");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_id_productId_key" ON "ProductImage"("id", "productId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_imageId_productId_fkey" FOREIGN KEY ("imageId", "productId") REFERENCES "ProductImage"("id", "productId") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_compareAtPaise_valid" CHECK ("compareAtPaise" IS NULL OR "compareAtPaise" > "pricePaise");

COMMIT;
