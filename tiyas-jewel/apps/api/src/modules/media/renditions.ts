import sharp from "sharp";
import { createHash } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { ImageStorage } from "../../integrations/image-storage.js";
import { renditionWidths } from "@tiyas/shared";
export { renditionWidths };
export async function createRenditions(
  db: PrismaClient,
  storage: ImageStorage,
  id: string,
  master: Buffer,
) {
  const meta = await sharp(master).metadata(),
    created: string[] = [];
  const sourceHash = createHash("sha256").update(master).digest("hex");
  const source = await db.imageAsset.findUniqueOrThrow({
    where: { id },
    select: { sourceHash: true },
  });
  if (source.sourceHash && source.sourceHash !== sourceHash)
    throw Error("Master image does not match its recorded hash");
  const renditions: {
    width: number;
    height: number;
    bytes: number;
    objectKey: string;
    version: number;
    contentHash: string;
  }[] = [];
  try {
    for (const width of renditionWidths) {
      if (width >= (meta.width ?? 0)) continue;
      const objectKey = `products/${id}/${width}.webp`;
      const existing = await db.imageRendition.findUnique({
        where: { assetId_width_version: { assetId: id, width, version: 1 } },
      });
      if (existing) {
        if (!existing.contentHash) {
          const bytes = await storage.get(existing.objectKey);
          const info = await sharp(bytes).metadata();
          if (
            info.format !== "webp" ||
            bytes.length !== existing.bytes ||
            info.width !== existing.width ||
            info.height !== existing.height
          )
            throw Error(
              "Existing rendition differs from its recorded metadata",
            );
          await db.imageRendition.updateMany({
            where: {
              id: existing.id,
              contentHash: null,
              objectKey: existing.objectKey,
            },
            data: {
              contentHash: createHash("sha256").update(bytes).digest("hex"),
            },
          });
        }
        continue;
      }
      const { data, info } = await sharp(master)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer({ resolveWithObject: true });
      try {
        await storage.put(objectKey, data);
        created.push(objectKey);
      } catch (e) {
        // A local crash may have stored bytes before committing metadata. Reuse only identical bytes.
        const existing = await storage.get(objectKey).catch(() => null);
        if (!existing?.equals(data)) throw e;
      }
      renditions.push({
        width: info.width,
        height: info.height,
        bytes: data.length,
        objectKey,
        version: 1,
        contentHash: createHash("sha256").update(data).digest("hex"),
      });
    }
    await db.$transaction(async (tx) => {
      await tx.imageAsset.update({
        where: { id },
        data: { sourceHash },
      });
      await tx.imageRendition.createMany({
        data: renditions.map((r) => ({ ...r, assetId: id })),
        skipDuplicates: true,
      });
    });
  } catch (e) {
    await Promise.allSettled(created.map((k) => storage.remove(k)));
    throw e;
  }
}
