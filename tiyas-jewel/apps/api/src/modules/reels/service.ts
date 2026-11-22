import type { z } from "zod";
import type { reelInputSchema } from "@tiyas/shared";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { AdminError } from "../admin/errors.js";
export function reelService(db: PrismaClient) {
  async function list(admin = false) {
    const rows = await db.reel.findMany({
      where: admin ? {} : { published: true, rightsConfirmed: true },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                active: true,
                category: { select: { active: true } },
              },
            },
          },
        },
      },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      take: 50,
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        caption: r.caption,
        transcript: r.transcript,
        poster: `/images/uploads/${r.posterId}.webp`,
        instagramUrl: r.instagramUrl,
        productSlugs: r.products
          .filter((p) => p.product.active && p.product.category.active)
          .map((p) => p.product.slug),
        ...(admin
          ? {
              posterId: r.posterId,
              productIds: r.products.map((p) => p.productId),
              position: r.position,
              rightsConfirmed: r.rightsConfirmed,
              published: r.published,
              version: r.version,
            }
          : {}),
      })),
    };
  }
  async function save(
    input: z.infer<typeof reelInputSchema>,
    adminId: string,
    id?: string,
  ) {
    return db.$transaction(async (tx) => {
      const { productIds, version, ...data } = input;
      if (id)
        await tx.$queryRaw`SELECT id FROM "Reel" WHERE id=${id} FOR UPDATE`;
      const current = id ? await tx.reel.findUnique({ where: { id } }) : null;
      if (id && (!current || current.version !== version))
        throw new AdminError(
          "CONFLICT",
          "This reel changed. Reload before saving.",
          409,
        );
      await tx.$queryRaw`SELECT id FROM "ImageAsset" WHERE id=${input.posterId}::uuid FOR UPDATE`;
      const poster = await tx.imageAsset.findUnique({
        where: { id: input.posterId },
        select: { uploaderId: true },
      });
      if (
        !poster ||
        (poster.uploaderId !== adminId && current?.posterId !== input.posterId)
      )
        throw new AdminError(
          "MISSING_MEDIA",
          "Upload a poster from your CMS account first.",
        );
      if (
        new Set(productIds).size !== productIds.length ||
        (await tx.product.count({
          where: {
            id: { in: productIds },
            ...(input.published
              ? { active: true, category: { active: true } }
              : {}),
          },
        })) !== productIds.length
      )
        throw new AdminError(
          "INVALID_PRODUCTS",
          "Choose distinct products that are active before publishing.",
        );
      if (id) await tx.reelProduct.deleteMany({ where: { reelId: id } });
      const values = {
        ...data,
        updatedBy: adminId,
        products: {
          create: productIds.map((productId, position) => ({
            productId,
            position,
          })),
        },
      };
      return {
        data: id
          ? await tx.reel.update({
              where: { id },
              data: { ...values, version: { increment: 1 } },
            })
          : await tx.reel.create({ data: values }),
      };
    });
  }
  return { list, save };
}
