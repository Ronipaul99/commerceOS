import { randomUUID, createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { productDetailsSchema, type AdminProductInput } from "@tiyas/shared";
import type { ImageStorage } from "../../integrations/image-storage.js";
import { validateImage } from "../../integrations/image-storage.js";
import { AdminError } from "./errors.js";
import { createRenditions } from "../media/renditions.js";
type Tx = Prisma.TransactionClient;
const include = {
  category: true,
  collections: true,
  images: { orderBy: { position: "asc" as const } },
  variants: { orderBy: { createdAt: "asc" as const } },
};
type RecordProduct = Prisma.ProductGetPayload<{ include: typeof include }>;
function view(p: RecordProduct) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    details: p.details === null ? null : productDetailsSchema.parse(p.details),
    categoryId: p.categoryId,
    category: {
      id: p.category.id,
      name: p.category.name,
      slug: p.category.slug,
      description: p.category.description,
      active: p.category.active,
    },
    collectionIds: p.collections.map((c) => c.collectionId),
    pricePaise: p.pricePaise,
    compareAtPaise: p.compareAtPaise,
    sku: p.sku,
    stockQuantity: p.stockQuantity,
    active: p.active,
    featured: p.featured,
    version: p.updatedAt.toISOString(),
    images: p.images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      assetId: i.assetId,
      concept: i.concept,
      position: i.position,
    })),
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      pricePaise: v.pricePaise,
      stockQuantity: v.stockQuantity,
      active: v.active,
      imageRef: v.imageId,
      version: v.updatedAt.toISOString(),
    })),
  };
}
export function adminCatalog(db: PrismaClient, storage: ImageStorage) {
  async function get(id: string) {
    const p = await db.product.findUnique({ where: { id }, include });
    if (!p) throw new AdminError("NOT_FOUND", "Product not found.", 404);
    return { data: view(p) };
  }
  async function list(q: {
    q: string;
    categoryId?: string;
    page: number;
    limit: number;
    status?: "ALL" | "ACTIVE" | "ARCHIVED" | "OUT_OF_STOCK";
  }) {
    const where: Prisma.ProductWhereInput = {
      ...(q.status === "ACTIVE"
        ? { active: true }
        : q.status === "ARCHIVED"
          ? { active: false }
          : q.status === "OUT_OF_STOCK"
            ? {
                active: true,
                OR: [
                  { variants: { none: {} }, stockQuantity: 0 },
                  {
                    variants: { some: {} },
                    NOT: {
                      variants: {
                        some: { active: true, stockQuantity: { gt: 0 } },
                      },
                    },
                  },
                ],
              }
            : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.q
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: q.q, mode: "insensitive" } },
                  { sku: { contains: q.q, mode: "insensitive" } },
                  { slug: { contains: q.q, mode: "insensitive" } },
                  {
                    category: { name: { contains: q.q, mode: "insensitive" } },
                  },
                ],
              },
            ],
          }
        : {}),
    };
    return db.$transaction(
      async (tx) => {
        const [rows, total] = await Promise.all([
          tx.product.findMany({
            where,
            include,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (q.page - 1) * q.limit,
            take: q.limit,
          }),
          tx.product.count({ where }),
        ]);
        return {
          data: rows.map(view),
          pagination: {
            page: q.page,
            limit: q.limit,
            total,
            totalPages: Math.ceil(total / q.limit),
          },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  async function lock(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE "productId"=${id} ORDER BY id FOR UPDATE`;
  }
  async function save(input: AdminProductInput, adminId: string, id?: string) {
    return db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('tiyas-catalog-skus'))`;
        if (id) await lock(tx, id);
        const existing = id
          ? await tx.product.findUnique({ where: { id }, include })
          : null;
        if (id && !existing)
          throw new AdminError("NOT_FOUND", "Product not found.", 404);
        if (
          existing &&
          (input.version !== existing.updatedAt.toISOString() ||
            existing.variants.some((v) => {
              const submitted = input.variants.find((i) => i.id === v.id);
              return (
                submitted && submitted.version !== v.updatedAt.toISOString()
              );
            }))
        )
          throw new AdminError(
            "STALE_PRODUCT",
            "Product or stock changed. Reload before saving. Keep used variants and switch them inactive instead of removing them.",
            409,
          );
        if (
          !existing &&
          (input.version ||
            input.variants.some((v) => v.id || v.version) ||
            input.images.some((i) => i.id))
        )
          throw new AdminError(
            "INVALID_PRODUCT",
            "New products cannot reference existing product images or variants.",
          );
        const category = await tx.category.findUnique({
          where: { id: input.categoryId },
        });
        if (!category)
          throw new AdminError(
            "INVALID_CATEGORY",
            "Choose an existing category.",
          );
        if (
          (await tx.collection.count({
            where: { id: { in: input.collectionIds } },
          })) !== input.collectionIds.length
        )
          throw new AdminError(
            "INVALID_COLLECTION",
            "Choose existing collections.",
          );
        const assetIds = input.images
          .flatMap((i) => (i.assetId ? [i.assetId] : []))
          .sort();
        if (assetIds.length)
          await tx.$queryRaw(
            Prisma.sql`SELECT id FROM "ImageAsset" WHERE id IN (${Prisma.join(assetIds.map((i) => Prisma.sql`${i}::uuid`))}) ORDER BY id FOR UPDATE`,
          );
        const assets = await tx.imageAsset.findMany({
          where: { id: { in: assetIds }, uploaderId: adminId, image: null },
        });
        if (assets.length !== assetIds.length)
          throw new AdminError(
            "INVALID_IMAGE",
            "An uploaded image is missing, already used or belongs to another administrator.",
          );
        const removedVariants =
          existing?.variants.filter(
            (v) => !input.variants.some((i) => i.id === v.id),
          ) ?? [];
        if (
          removedVariants.length &&
          (await tx.orderItem.count({
            where: { variantId: { in: removedVariants.map((v) => v.id) } },
          }))
        )
          throw new AdminError(
            "VARIANT_IN_USE",
            "A variant used by an order cannot be deleted. Set it inactive instead.",
            409,
          );
        const data = {
          name: input.name,
          slug: input.slug,
          description: input.description,
          ...(input.details !== undefined
            ? {
                details: input.details === null ? Prisma.DbNull : input.details,
              }
            : {}),
          categoryId: input.categoryId,
          pricePaise: input.pricePaise,
          compareAtPaise: input.compareAtPaise,
          sku: input.sku,
          stockQuantity: input.stockQuantity,
          active: input.active,
          featured: input.featured,
        };
        // SKUs remain unique across both product and variant identifiers.
        const skus = [input.sku, ...input.variants.map((v) => v.sku)];
        if (
          (await tx.product.count({
            where: { sku: { in: skus }, ...(id ? { id: { not: id } } : {}) },
          })) ||
          (await tx.productVariant.count({
            where: {
              sku: { in: skus },
              ...(id ? { productId: { not: id } } : {}),
            },
          }))
        )
          throw new AdminError(
            "DUPLICATE_SKU",
            "A SKU is already used by another product.",
            409,
          );
        const p = existing
          ? await tx.product.update({ where: { id: existing.id }, data })
          : await tx.product.create({ data });
        await tx.productCollection.deleteMany({ where: { productId: p.id } });
        if (input.collectionIds.length)
          await tx.productCollection.createMany({
            data: input.collectionIds.map((collectionId) => ({
              productId: p.id,
              collectionId,
            })),
          });
        // Detach variant images first; offset all existing positions to avoid unique-index collisions while reordering.
        await tx.productVariant.updateMany({
          where: { productId: p.id },
          data: { imageId: null },
        });
        await tx.productImage.updateMany({
          where: { productId: p.id },
          data: { position: { increment: 1000 } },
        });
        const imageMap = new Map<string, string>();
        for (const [position, image] of input.images.entries()) {
          if (image.id) {
            if (!existing?.images.some((i) => i.id === image.id))
              throw new AdminError(
                "INVALID_IMAGE",
                "Image does not belong to this product.",
              );
            const i = await tx.productImage.update({
              where: { id: image.id },
              data: { position, alt: image.alt },
            });
            imageMap.set(image.id, i.id);
          } else {
            const asset = assets.find((a) => a.id === image.assetId)!;
            const i = await tx.productImage.create({
              data: {
                productId: p.id,
                assetId: asset.id,
                url: `/images/uploads/${asset.id}.webp`,
                alt: image.alt,
                position,
                concept: false,
              },
            });
            imageMap.set(asset.id, i.id);
          }
        }
        await tx.productImage.deleteMany({
          where: { productId: p.id, position: { gte: 1000 } },
        });
        await tx.productVariant.deleteMany({
          where: { id: { in: removedVariants.map((v) => v.id) } },
        });
        // Offset retained SKUs temporarily to permit a safe swap within the same product.
        for (const v of existing?.variants ?? [])
          if (!removedVariants.some((r) => r.id === v.id))
            await tx.productVariant.update({
              where: { id: v.id },
              data: { sku: `pending-${randomUUID()}` },
            });
        for (const v of input.variants) {
          const variantData = {
            name: v.name,
            sku: v.sku,
            pricePaise: v.pricePaise,
            stockQuantity: v.stockQuantity,
            active: v.active,
            imageId: v.imageRef ? imageMap.get(v.imageRef)! : null,
          };
          if (v.id) {
            if (!existing?.variants.some((i) => i.id === v.id))
              throw new AdminError(
                "INVALID_VARIANT",
                "Variant does not belong to this product.",
              );
            await tx.productVariant.update({
              where: { id: v.id },
              data: variantData,
            });
          } else
            await tx.productVariant.create({
              data: { ...variantData, productId: p.id },
            });
        }
        return {
          data: view(
            (await tx.product.findUnique({ where: { id: p.id }, include }))!,
          ),
        };
      },
      { timeout: 15000 },
    );
  }
  async function archive(id: string, version: string) {
    return db.$transaction(async (tx) => {
      await lock(tx, id);
      const p = await tx.product.findUnique({ where: { id } });
      if (!p) throw new AdminError("NOT_FOUND", "Product not found.", 404);
      if (p.updatedAt.toISOString() !== version)
        throw new AdminError(
          "STALE_PRODUCT",
          "Product changed. Reload before archiving.",
          409,
        );
      await tx.product.update({ where: { id }, data: { active: false } });
      return { data: { ok: true } };
    });
  }
  async function remove(id: string, version: string) {
    return db.$transaction(async (tx) => {
      await lock(tx, id);
      const p = await tx.product.findUnique({ where: { id } });
      if (!p) throw new AdminError("NOT_FOUND", "Product not found.", 404);
      if (p.updatedAt.toISOString() !== version)
        throw new AdminError(
          "STALE_PRODUCT",
          "Product changed. Reload before deleting.",
          409,
        );
      if (await tx.orderItem.count({ where: { productId: id } }))
        throw new AdminError(
          "PRODUCT_IN_USE",
          "This product is referenced by an order. Archive it instead.",
          409,
        );
      if (
        (await tx.customerReview.count({ where: { productId: id } })) ||
        (await tx.reelProduct.count({ where: { productId: id } })) ||
        (await tx.customerStory.count({
          where: { productIds: { has: id } },
        })) ||
        (await tx.coupon.count({
          where: { archived: false, productIds: { has: id } },
        }))
      )
        throw new AdminError(
          "PRODUCT_IN_USE",
          "This product is referenced by customer content or an offer. Archive it instead.",
          409,
        );
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: { imageId: null },
      });
      await tx.product.delete({ where: { id } });
      return { data: { ok: true } };
    });
  }
  async function upload(buffer: Buffer, adminId: string) {
    const image = await validateImage(buffer);
    const sourceHash = createHash("sha256").update(image.data).digest("hex");
    const shared = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`tiyas-image:${adminId}:${sourceHash}`},0))`;
      const existing = await tx.imageAsset.findFirst({
        where: { uploaderId: adminId, sourceHash },
        include: { renditions: true },
      });
      if (!existing) return null;
      const id = randomUUID();
      const asset = await tx.imageAsset.create({
        data: {
          id,
          objectKey: existing.objectKey,
          width: existing.width,
          height: existing.height,
          bytes: existing.bytes,
          uploaderId: adminId,
          sourceHash,
        },
      });
      await tx.imageRendition.createMany({
        data: existing.renditions.map((r) => ({
          assetId: id,
          width: r.width,
          height: r.height,
          bytes: r.bytes,
          version: r.version,
          contentHash: r.contentHash,
          objectKey: r.objectKey,
        })),
      });
      return asset;
    });
    if (shared)
      return {
        data: {
          id: shared.id,
          url: `/images/uploads/${shared.id}.webp`,
          width: shared.width,
          height: shared.height,
          bytes: shared.bytes,
        },
      };
    const id = randomUUID(),
      objectKey = `products/${id}.webp`;
    await storage.put(objectKey, image.data);
    try {
      await db.imageAsset.create({
        data: {
          id,
          objectKey,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
          uploaderId: adminId,
        },
      });
      await createRenditions(db, storage, id, image.data);
    } catch (e) {
      await db.imageAsset
        .deleteMany({ where: { id, image: null } })
        .catch(() => {});
      await storage.remove(objectKey).catch(() => {});
      throw e;
    }
    return {
      data: {
        id,
        url: `/images/uploads/${id}.webp`,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
      },
    };
  }
  async function removeImage(id: string, adminId: string) {
    return db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ImageAsset" WHERE id=${id}::uuid FOR UPDATE`;
        const asset = await tx.imageAsset.findUnique({
          where: { id },
          include: { image: true },
        });
        if (!asset || asset.uploaderId !== adminId)
          throw new AdminError("NOT_FOUND", "Image not found.", 404);
        if (asset.sourceHash)
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`tiyas-image:${adminId}:${asset.sourceHash}`},0))`;
        if (
          asset.image ||
          (await tx.customerStory.count({ where: { imageAssetId: id } })) > 0 ||
          (await tx.reel.count({ where: { posterId: id } })) > 0 ||
          (await tx.contentAssetUse.count({ where: { assetId: id } })) > 0 ||
          (await tx.orderItem.count({
            where: { image: `/images/uploads/${id}.webp` },
          }))
        )
          throw new AdminError(
            "IMAGE_IN_USE",
            "Remove the image from the product first. Order images are retained.",
            409,
          );
        const renditions = await tx.imageRendition.findMany({
          where: { assetId: id },
        });
        for (const rendition of renditions)
          if (
            (await tx.imageRendition.count({
              where: { objectKey: rendition.objectKey },
            })) === 1
          )
            await storage.remove(rendition.objectKey);
        if (
          (await tx.imageAsset.count({
            where: { objectKey: asset.objectKey },
          })) === 1
        )
          await storage.remove(asset.objectKey);
        await tx.imageAsset.delete({ where: { id } });
        return { data: { ok: true } };
      },
      { timeout: 20000 },
    );
  }
  async function options() {
    const [categories, collections] = await Promise.all([
      db.category.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          active: true,
        },
      }),
      db.collection.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          active: true,
        },
      }),
    ]);
    return { data: { categories, collections } };
  }
  return { get, list, save, archive, remove, upload, removeImage, options };
}
