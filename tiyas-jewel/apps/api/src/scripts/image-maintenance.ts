import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { parseEnv } from "../config/env.js";
import { imageStorage } from "../integrations/image-storage.js";
import {
  createRenditions,
  renditionWidths,
} from "../modules/media/renditions.js";
const config = parseEnv(process.env),
  target = new URL(config.DATABASE_URL);
const args = new Set(process.argv.slice(2)),
  apply = args.has("--apply");
if (apply && !args.has(`--confirm=${target.hostname}${target.pathname}`))
  throw Error(
    "To create missing derivatives, explicitly confirm the database host/name with --confirm=HOST/DATABASE. No password is required in this argument.",
  );
const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
  }),
  storage = imageStorage(config);
try {
  let after: string | undefined,
    processed = 0,
    failed = 0,
    missing = 0;
  do {
    const rows = await db.imageAsset.findMany({
      where: after ? { id: { gt: after } } : {},
      include: {
        renditions: true,
        _count: {
          select: { contentUses: true, stories: true, reelPosters: true },
        },
        image: true,
      },
      orderBy: { id: "asc" },
      take: 25,
    });
    if (!rows.length) break;
    for (const a of rows) {
      after = a.id;
      const expected = renditionWidths.filter((w) => w < a.width);
      if (
        !a.sourceHash || expected.some(
          (w) => !a.renditions.some((r) => r.width === w && r.version === 1 && r.contentHash),
        )
      ) {
        missing++;
        if (apply) {
          try {
            await createRenditions(
              db,
              storage,
              a.id,
              await storage.get(a.objectKey),
            );
            processed++;
          } catch {
            failed++;
            console.error(JSON.stringify({ assetId: a.id, status: "failed" }));
          }
        }
      }
      const history = await db.orderItem.count({
        where: { image: `/images/uploads/${a.id}.webp` },
      });
      if (
        !a.image &&
        !history &&
        !a._count.contentUses &&
        !a._count.stories &&
        !a._count.reelPosters &&
        a.createdAt.getTime() < Date.now() - 30 * 86400000
      )
        console.log(
          JSON.stringify({
            assetId: a.id,
            status: "unreferenced-over-30-days",
            action: "report-only; manual reference recheck required",
          }),
        );
    }
  } while (after);
  const duplicates = await db.imageAsset.groupBy({
    by: ["sourceHash"],
    orderBy: { sourceHash: "asc" },
    where: { sourceHash: { not: null } },
    _count: { _all: true },
    having: { sourceHash: { _count: { gt: 1 } } },
    take: 100,
  });
  console.log(
    JSON.stringify({
      mode: apply ? "backfill" : "dry-run",
      missingDerivativeAssets: missing,
      processed,
      failed,
      duplicateGroups: duplicates.length,
      deletions: 0,
    }),
  );
  if (failed) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
