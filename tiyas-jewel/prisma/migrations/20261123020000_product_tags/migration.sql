BEGIN;

ALTER TABLE "Product" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "Product_tags_idx" ON "Product" USING GIN ("tags");

COMMIT;
