BEGIN;
-- Object UUIDs identify immutable stored bytes; upload UUIDs identify permission records.
ALTER TABLE "ImageAsset" DROP CONSTRAINT "ImageAsset_objectKey_check";
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_objectKey_check" CHECK (
 "objectKey" ~ '^products/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$'
);
CREATE FUNCTION tiyas_image_alias_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('tiyas-blob:' || NEW."objectKey",0));
 IF EXISTS (SELECT 1 FROM "ImageAsset" a WHERE a."objectKey"=NEW."objectKey" AND a.id<>NEW.id AND
    (a."uploaderId"<>NEW."uploaderId" OR a."sourceHash" IS DISTINCT FROM NEW."sourceHash" OR a.width<>NEW.width OR a.height<>NEW.height OR a.bytes<>NEW.bytes)) THEN
   RAISE EXCEPTION 'Shared image metadata must have identical bytes and ownership' USING ERRCODE='23514';
 END IF;
 IF NEW."objectKey" <> 'products/' || NEW.id::text || '.webp' AND NOT EXISTS (
   SELECT 1 FROM "ImageAsset" a WHERE a."objectKey"=NEW."objectKey" AND a."uploaderId"=NEW."uploaderId" AND a."sourceHash"=NEW."sourceHash"
 ) THEN
   RAISE EXCEPTION 'An image alias needs an existing owned source' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER "ImageAsset_alias_guard" BEFORE INSERT OR UPDATE OF "objectKey","uploaderId","sourceHash",width,height,bytes ON "ImageAsset" FOR EACH ROW EXECUTE FUNCTION tiyas_image_alias_guard();
COMMIT;
