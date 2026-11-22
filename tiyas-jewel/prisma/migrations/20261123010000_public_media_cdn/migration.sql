BEGIN;

ALTER TABLE "ImageRendition" ADD COLUMN "contentHash" CHAR(64);
ALTER TABLE "ImageRendition" ADD CONSTRAINT "ImageRendition_contentHash_check"
  CHECK ("contentHash" IS NULL OR "contentHash" ~ '^[a-f0-9]{64}$');

CREATE TABLE "MediaPurgeEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "paths" TEXT[] NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL,
  "leaseUntil" TIMESTAMPTZ(3),
  "leaseToken" UUID,
  "lastError" VARCHAR(40),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MediaPurgeEvent_nextAttemptAt_id_idx" ON "MediaPurgeEvent"("nextAttemptAt", "id");

-- Dirty snapshots always fall back to the live origin eligibility check.
-- Enqueue from the mutation transaction, while the old media keys still exist.
CREATE FUNCTION tiyas_enqueue_media_purge(asset UUID) RETURNS VOID LANGUAGE sql AS $$
  INSERT INTO "MediaPurgeEvent" ("paths", "nextAttemptAt")
  SELECT array_agg(DISTINCT path), clock_timestamp() + interval '30 seconds'
  FROM (
    SELECT '/media/public/' || "id" || '/' || "sourceHash" || '/master.webp' AS path
    FROM "ImageAsset" WHERE "id" = asset AND "sourceHash" ~ '^[a-f0-9]{64}$'
    UNION ALL
    SELECT '/media/public/' || "assetId" || '/' || "contentHash" || '/' || "width" || '.webp'
    FROM "ImageRendition" WHERE "assetId" = asset AND "contentHash" IS NOT NULL
      AND "width" IN (160, 320, 480, 640, 960, 1440, 1920)
  ) candidates
  HAVING count(*) > 0;
$$;

CREATE FUNCTION tiyas_media_reference_changed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE asset UUID;
BEGIN
  IF TG_TABLE_NAME = 'ProductImage' THEN
    IF TG_OP = 'DELETE' OR OLD."assetId" IS DISTINCT FROM NEW."assetId"
        OR OLD."productId" IS DISTINCT FROM NEW."productId" THEN
      PERFORM tiyas_enqueue_media_purge(OLD."assetId");
    END IF;
  ELSIF TG_TABLE_NAME = 'Product' THEN
    IF OLD."active" AND (NOT NEW."active" OR OLD."categoryId" IS DISTINCT FROM NEW."categoryId") THEN
      FOR asset IN SELECT "assetId" FROM "ProductImage" WHERE "productId" = OLD."id"
      LOOP PERFORM tiyas_enqueue_media_purge(asset); END LOOP;
    END IF;
  ELSIF TG_TABLE_NAME = 'Category' THEN
    IF OLD."active" AND NOT NEW."active" THEN
      FOR asset IN SELECT i."assetId" FROM "ProductImage" i JOIN "Product" p ON p."id" = i."productId"
        WHERE p."categoryId" = OLD."id" AND p."active"
      LOOP PERFORM tiyas_enqueue_media_purge(asset); END LOOP;
    END IF;
  ELSIF TG_TABLE_NAME = 'ContentAssetUse' THEN
    IF OLD.published THEN PERFORM tiyas_enqueue_media_purge(OLD."assetId"); END IF;
  ELSIF TG_TABLE_NAME = 'CustomerStory' THEN
    IF TG_OP = 'INSERT' OR OLD."imageAssetId" IS DISTINCT FROM NEW."imageAssetId" THEN
      PERFORM tiyas_enqueue_media_purge(NEW."imageAssetId");
    END IF;
  ELSIF TG_TABLE_NAME = 'ImageAsset' THEN
    IF TG_OP = 'DELETE' OR OLD."sourceHash" IS DISTINCT FROM NEW."sourceHash"
        OR OLD."objectKey" IS DISTINCT FROM NEW."objectKey" THEN
      PERFORM tiyas_enqueue_media_purge(OLD."id");
    END IF;
  ELSIF TG_TABLE_NAME = 'ImageRendition' THEN
    IF OLD."contentHash" IS NOT NULL AND (TG_OP = 'DELETE'
      OR OLD."contentHash" IS DISTINCT FROM NEW."contentHash"
      OR OLD."objectKey" IS DISTINCT FROM NEW."objectKey"
      OR OLD."width" IS DISTINCT FROM NEW."width"
      OR OLD."assetId" IS DISTINCT FROM NEW."assetId") THEN
      PERFORM tiyas_enqueue_media_purge(OLD."assetId");
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "cdn_product_image" BEFORE UPDATE OR DELETE ON "ProductImage"
  FOR EACH ROW EXECUTE FUNCTION tiyas_media_reference_changed();
CREATE TRIGGER "cdn_product" BEFORE UPDATE OF "active", "categoryId" ON "Product"
  FOR EACH ROW EXECUTE FUNCTION tiyas_media_reference_changed();
CREATE TRIGGER "cdn_category" BEFORE UPDATE OF "active" ON "Category"
  FOR EACH ROW EXECUTE FUNCTION tiyas_media_reference_changed();
CREATE TRIGGER "cdn_cms_image" BEFORE UPDATE OR DELETE ON "ContentAssetUse"
  FOR EACH ROW EXECUTE FUNCTION tiyas_media_reference_changed();
CREATE TRIGGER "cdn_story_image" AFTER INSERT OR UPDATE OF "imageAssetId" ON "CustomerStory"
  FOR EACH ROW EXECUTE FUNCTION tiyas_media_reference_changed();
CREATE TRIGGER "cdn_source" BEFORE UPDATE OF "sourceHash", "objectKey" OR DELETE ON "ImageAsset"
  FOR EACH ROW EXECUTE FUNCTION tiyas_media_reference_changed();
CREATE TRIGGER "cdn_rendition" BEFORE UPDATE OF "contentHash", "objectKey", "width", "assetId" OR DELETE ON "ImageRendition"
  FOR EACH ROW EXECUTE FUNCTION tiyas_media_reference_changed();

COMMIT;
