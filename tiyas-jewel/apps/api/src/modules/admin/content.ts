import {
  contentSectionSchema,
  contentValueSchema,
  type ContentValue,
} from "@tiyas/shared";
import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { AdminError } from "./errors.js";
function assets(value: unknown): string[] {
  if (typeof value === "string") {
    const m = value.match(/^\/images\/uploads\/([a-f0-9-]{36})\.webp$/);
    return m ? [m[1]!] : [];
  }
  if (Array.isArray(value)) return value.flatMap(assets);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(assets);
  return [];
}
function view(doc: {
  key: string;
  draft: unknown;
  published: unknown;
  version: number;
  publishedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    ...doc,
    draft: contentValueSchema.parse(doc.draft),
    published: doc.published ? contentValueSchema.parse(doc.published) : null,
    publishedAt: doc.publishedAt?.toISOString() ?? null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}
export function adminContent(db: PrismaClient) {
  async function get(key: string) {
    const doc = await db.contentDocument.findUnique({ where: { key } });
    return { data: doc ? view(doc) : null };
  }
  async function list() {
    const docs = await db.contentDocument.findMany({ orderBy: { key: "asc" } });
    return {
      data: docs.map((doc) => {
        const v = view(doc);
        return {
          key: v.key,
          version: v.version,
          publishedAt: v.publishedAt,
          updatedAt: v.updatedAt,
          type: v.draft.type,
          title:
            v.draft.type === "page"
              ? v.draft.content.title
              : v.draft.type === "homepage"
                ? "Homepage"
                : "Menus & Links",
        };
      }),
    };
  }
  async function save(
    key: string,
    version: number,
    value: ContentValue,
    publish?: boolean,
  ) {
    if (
      (key === "homepage"
        ? "homepage"
        : key === "navigation"
          ? "navigation"
          : "page") !== value.type
    )
      throw new AdminError(
        "INVALID_CONTENT",
        "Content type does not match its document.",
      );
    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`tiyas-content:${key}`}))`;
      const old = await tx.contentDocument.findUnique({ where: { key } });
      if ((old?.version ?? 0) !== version)
        throw new AdminError(
          "STALE_CONTENT",
          "Content changed in another window. Reload before saving.",
          409,
        );
      const ids = [...new Set(assets(value))].sort();
      const liveValue: ContentValue =
        value.type === "homepage"
          ? {
              type: "homepage",
              content: {
                sections: value.content.sections.flatMap((s) => {
                  if (s.enabled)
                    return [{ ...s, items: s.items.filter((i) => i.enabled) }];
                  // Keep the opt-out so legacy homepage defaults cannot reinsert this section.
                  if (s.kind === "reviews" || s.kind === "reels")
                    return [
                      contentSectionSchema.parse({
                        id: s.id,
                        kind: s.kind,
                        title: "",
                        enabled: false,
                      }),
                    ];
                  return [];
                }),
              },
            }
          : value;
      if (
        publish &&
        liveValue.type === "homepage" &&
        !liveValue.content.sections.some((section) => section.enabled)
      )
        throw new AdminError(
          "EMPTY_HOMEPAGE",
          "Keep at least one homepage section visible before publishing.",
        );
      for (const id of ids) {
        await tx.$queryRaw`SELECT id FROM "ImageAsset" WHERE id=${id}::uuid FOR UPDATE`;
        if (!(await tx.imageAsset.findUnique({ where: { id } })))
          throw new AdminError(
            "INVALID_IMAGE",
            "An uploaded image no longer exists. Upload it again.",
          );
      }
      const data = {
        draft: value as Prisma.InputJsonValue,
        version: version + 1,
        ...(publish === undefined
          ? {}
          : {
              published: publish
                ? (liveValue as Prisma.InputJsonValue)
                : Prisma.DbNull,
              publishedAt: publish ? new Date() : null,
            }),
      };
      const doc = old
        ? await tx.contentDocument.update({ where: { key }, data })
        : await tx.contentDocument.create({ data: { key, ...data } });
      await tx.contentAssetUse.deleteMany({
        where: {
          documentKey: key,
          ...(publish === undefined ? { published: false } : {}),
        },
      });
      for (const id of ids) {
        await tx.contentAssetUse.create({
          data: { documentKey: key, assetId: id, published: false },
        });
        if (publish && assets(liveValue).includes(id))
          await tx.contentAssetUse.create({
            data: { documentKey: key, assetId: id, published: true },
          });
      }
      return { data: view(doc) };
    });
  }
  async function remove(key: string, version: number) {
    if (!key.startsWith("page-"))
      throw new AdminError(
        "CONTENT_REQUIRED",
        "Core storefront documents cannot be deleted.",
      );
    const deleted = await db.contentDocument.deleteMany({
      where: { key, version },
    });
    if (!deleted.count)
      throw new AdminError(
        "STALE_CONTENT",
        "Page changed. Reload before deleting.",
        409,
      );
    return { data: { ok: true } };
  }
  return { get, list, save, remove };
}
