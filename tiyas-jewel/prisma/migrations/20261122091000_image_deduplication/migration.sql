-- Each upload retains its own ownership/publication record while identical bytes
-- may share storage within the same uploader's authorization context.
ALTER TABLE "ImageAsset" DROP CONSTRAINT "ImageAsset_objectKey_key";
DROP INDEX "ImageRendition_objectKey_key";
CREATE INDEX "ImageAsset_objectKey_idx" ON "ImageAsset"("objectKey");
CREATE INDEX "ImageAsset_uploaderId_sourceHash_idx" ON "ImageAsset"("uploaderId", "sourceHash");
CREATE INDEX "ImageRendition_objectKey_idx" ON "ImageRendition"("objectKey");
