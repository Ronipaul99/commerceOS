CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ADMIN', 'CONTENT_MANAGER');
ALTER TABLE "AdminUser" ADD COLUMN "name" VARCHAR(100) NOT NULL DEFAULT '', ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'OWNER', ADD COLUMN "invited" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "AdminOtp" (
 "id" UUID PRIMARY KEY, "adminId" TEXT NOT NULL REFERENCES "AdminUser"("id") ON DELETE CASCADE,
 "purpose" VARCHAR(10) NOT NULL CHECK ("purpose" IN ('RESET','INVITE')), "codeHash" CHAR(64) NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 5), "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("adminId", "purpose")
);
CREATE TABLE "ContentDocument" (
 "key" VARCHAR(130) PRIMARY KEY, "draft" JSONB NOT NULL, "published" JSONB,
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0), "publishedAt" TIMESTAMPTZ(3), "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE TABLE "ContentAssetUse" (
 "documentKey" VARCHAR(130) NOT NULL REFERENCES "ContentDocument"("key") ON DELETE CASCADE,
 "assetId" UUID NOT NULL REFERENCES "ImageAsset"("id") ON DELETE RESTRICT,
 "published" BOOLEAN NOT NULL,
 PRIMARY KEY ("documentKey", "assetId", "published")
);
CREATE INDEX "ContentAssetUse_assetId_published_idx" ON "ContentAssetUse"("assetId", "published");
