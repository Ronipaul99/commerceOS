import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import {
  productDetailsSchema,
  type CatalogQuery,
  type Product,
} from "@tiyas/shared";
const productInclude = {
  category: true,
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: { sku: "asc" } },
  collections: {
    where: { collection: { active: true } },
    include: { collection: true },
    orderBy: { collection: { slug: "asc" } },
  },
} satisfies Prisma.ProductInclude;
type ProductRecord = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;
const taxonomy = (item: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}) => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  description: item.description,
});
function toProduct(product: ProductRecord): Product {
  const variants = product.variants.filter((variant) => variant.active);
  const maxQuantity = product.variants.length
    ? Math.min(
        99,
        Math.max(0, ...variants.map((variant) => variant.stockQuantity)),
      )
    : Math.min(99, product.stockQuantity);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    details:
      product.details === null
        ? null
        : productDetailsSchema.parse(product.details),
    sku: product.sku,
    pricePaise: product.pricePaise,
    compareAtPaise: product.compareAtPaise,
    featured: product.featured,
    maxQuantity,
    currency: "INR",
    available: maxQuantity > 0,
    category: taxonomy(product.category),
    images: product.images.map(({ id, url, alt, concept, position }) => ({
      id,
      url,
      alt,
      concept,
      position,
    })),
    variants: variants.map(
      ({ id, name, sku, pricePaise, stockQuantity, imageId }) => ({
        id,
        name,
        sku,
        pricePaise,
        imageId,
        available: stockQuantity > 0,
        maxQuantity: Math.min(99, stockQuantity),
      }),
    ),
    collections: product.collections.map(({ collection }) =>
      taxonomy(collection),
    ),
  };
}
const publicProduct = {
  active: true,
  category: { active: true },
} satisfies Prisma.ProductWhereInput;
const inStock = {
  OR: [
    { variants: { none: {} }, stockQuantity: { gt: 0 } },
    { variants: { some: { active: true, stockQuantity: { gt: 0 } } } },
  ],
} satisfies Prisma.ProductWhereInput;
export function catalogRepository(db: PrismaClient) {
  return {
    async listProducts(query: CatalogQuery) {
      const {
        page,
        limit,
        category,
        collection,
        featured,
        minPricePaise,
        maxPricePaise,
        availability,
        sort,
        ids,
      } = query;
      const where: Prisma.ProductWhereInput = {
        ...publicProduct,
        AND: [
          ...(category ? [{ category: { slug: category } }] : []),
          ...(collection
            ? [
                {
                  collections: {
                    some: { collection: { slug: collection, active: true } },
                  },
                },
              ]
            : []),
          ...(featured !== undefined ? [{ featured }] : []),
          ...(minPricePaise !== undefined || maxPricePaise !== undefined
            ? [{ pricePaise: { gte: minPricePaise, lte: maxPricePaise } }]
            : []),
          ...(availability
            ? [availability === "in-stock" ? inStock : { NOT: inStock }]
            : []),
          ...(ids ? [{ id: { in: ids } }] : []),
        ],
      };
      const orderBy: Prisma.ProductOrderByWithRelationInput[] =
        sort === "price-asc"
          ? [{ pricePaise: "asc" }, { id: "asc" }]
          : sort === "price-desc"
            ? [{ pricePaise: "desc" }, { id: "asc" }]
            : [{ createdAt: "desc" }, { id: "asc" }];
      return db.$transaction(
        async (tx) => {
          const products = await tx.product.findMany({
            where,
            include: productInclude,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
          });
          const total = await tx.product.count({ where });
          return {
            data: products.map(toProduct),
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          };
        },
        { isolationLevel: "RepeatableRead" },
      );
    },
    async findProduct(slug: string) {
      const product = await db.product.findFirst({
        where: { ...publicProduct, slug },
        include: productInclude,
      });
      return product ? toProduct(product) : null;
    },
    async findByIds(ids: string[]) {
      return db.$transaction(
        async (tx) =>
          (
            await tx.product.findMany({
              where: { ...publicProduct, id: { in: ids } },
              include: productInclude,
            })
          ).map(toProduct),
        { isolationLevel: "RepeatableRead" },
      );
    },
    async listCategories() {
      return {
        data: (
          await db.category.findMany({
            where: { active: true },
            orderBy: { name: "asc" },
          })
        ).map(taxonomy),
      };
    },
    async listCollections() {
      return {
        data: (
          await db.collection.findMany({
            where: { active: true },
            orderBy: { name: "asc" },
          })
        ).map(taxonomy),
      };
    },
    async findCollection(slug: string) {
      const collection = await db.collection.findFirst({
        where: { slug, active: true },
      });
      return collection ? taxonomy(collection) : null;
    },
    async search(q: string, limit: number) {
      const products = await db.product.findMany({
        where: {
          ...publicProduct,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { category: { name: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: productInclude,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        take: limit,
      });
      const categories = await db.category.findMany({
        where: {
          active: true,
          ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { name: "asc" },
        take: limit,
      });
      return {
        data: {
          products: products.map(toProduct),
          categories: categories.map(taxonomy),
        },
      };
    },
  };
}
