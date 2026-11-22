import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  publicMediaPath,
  publicMediaRoute,
  renditionWidths,
  type PublicMediaManifest,
} from "@tiyas/shared";
import type { ApiConfig } from "../../config/env.js";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import {
  imageStorage,
  type ImageStorage,
} from "../../integrations/image-storage.js";
import { AdminError } from "../admin/errors.js";

const eligibility = {
  stories: { none: {} },
  OR: [
    {
      image: { is: { product: { active: true, category: { active: true } } } },
    },
    { contentUses: { some: { published: true } } },
  ],
} satisfies Prisma.ImageAssetWhereInput;
const include = {
  renditions: {
    where: { contentHash: { not: null }, width: { in: [...renditionWidths] } },
    orderBy: { version: "desc" },
  },
} satisfies Prisma.ImageAssetInclude;
type PublicAsset = Prisma.ImageAssetGetPayload<{ include: typeof include }>;
type Database = PrismaClient | Prisma.TransactionClient;

function representations(asset: PublicAsset) {
  const rows = asset.renditions.flatMap((r) =>
    r.contentHash
      ? [
          {
            ...r,
            src: `/media/public/${asset.id}/${r.contentHash}/${r.width}.webp`,
            hash: r.contentHash,
          },
        ]
      : [],
  );
  if (asset.sourceHash && /^[a-f0-9]{64}$/.test(asset.sourceHash))
    rows.push({
      ...asset,
      assetId: asset.id,
      version: 0,
      contentHash: asset.sourceHash,
      src: `/media/public/${asset.id}/${asset.sourceHash}/master.webp`,
      hash: asset.sourceHash,
    });
  return rows.filter((r) => publicMediaPath.test(r.src));
}

export async function publicManifests(db: Database, ids: string[]) {
  const result: Record<string, PublicMediaManifest> = {};
  if (!ids.length) return result;
  const assets = await db.imageAsset.findMany({
    where: { id: { in: ids }, ...eligibility },
    include,
  });
  for (const asset of assets) {
    const byWidth = new Map<number, PublicMediaManifest[number]>();
    for (const { src, width, height } of representations(asset))
      if (!byWidth.has(width)) byWidth.set(width, { src, width, height });
    if (byWidth.size)
      result[`/images/uploads/${asset.id}.webp`] = [...byWidth.values()].sort(
        (a, b) => a.width - b.width,
      );
  }
  return result;
}

export async function publicContentManifests(db: Database, key: string) {
  const uses = await db.contentAssetUse.findMany({
    where: { documentKey: key, published: true },
    select: { assetId: true },
  });
  return publicManifests(
    db,
    uses.map((use) => use.assetId),
  );
}

export function publicMediaCacheControl(config: ApiConfig) {
  return `public, max-age=${config.PUBLIC_MEDIA_BROWSER_TTL_SECONDS}, s-maxage=${config.PUBLIC_MEDIA_EDGE_TTL_SECONDS}, must-revalidate`;
}

export function anonymousPublicGet(req: FastifyRequest) {
  return (
    req.method === "GET" &&
    publicMediaPath.test(req.url) &&
    req.headers.cookie === undefined &&
    req.headers.authorization === undefined &&
    req.headers.range === undefined
  );
}

export async function isPublicRepresentation(db: Database, path: string) {
  const asset = await db.imageAsset.findFirst({
    where: { id: path.split("/")[3], ...eligibility },
    include,
  });
  return asset ? representations(asset).find((r) => r.src === path) : undefined;
}

export async function publicMediaRoutes(
  app: FastifyInstance,
  { config, storage: injected }: { config: ApiConfig; storage?: ImageStorage },
) {
  const storage = injected ?? imageStorage(config);
  const missing = () => new AdminError("NOT_FOUND", "Image not found.", 404);
  app.get(publicMediaRoute, async (req, reply) => {
    if (!config.PUBLIC_MEDIA_CACHE_ENABLED || !publicMediaPath.test(req.url))
      throw missing();
    const image = await isPublicRepresentation(app.db, req.url);
    if (!image) throw missing();
    let bytes: Buffer;
    try {
      bytes = await storage.get(image.objectKey);
      if (
        bytes.length !== image.bytes ||
        createHash("sha256").update(bytes).digest("hex") !== image.hash
      )
        throw Error("Stored image differs from the published representation");
    } catch {
      throw new AdminError(
        "IMAGE_UNAVAILABLE",
        "Image is temporarily unavailable.",
        503,
      );
    }
    // A publication can change while the private object is being read.
    if (!(await isPublicRepresentation(app.db, req.url))) throw missing();
    const etag = `"${image.hash}"`;
    reply
      .type("image/webp")
      .header("ETag", etag)
      .header("X-Content-Type-Options", "nosniff");
    if (anonymousPublicGet(req))
      reply.header("Cache-Control", publicMediaCacheControl(config));
    if (
      req.headers["if-none-match"]
        ?.split(",")
        .some(
          (tag) =>
            tag.trim() === "*" || tag.trim().replace(/^W\//, "") === etag,
        )
    )
      return reply.code(304).send();
    return reply.header("Content-Length", String(bytes.length)).send(bytes);
  });
}
