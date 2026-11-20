import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/api/src/generated/prisma/client.js";
if (process.env.NODE_ENV === "production")
  throw new Error("Development catalog seeding is disabled in production");
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_URL is required for development seeding");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }),
});
try {
  await db.$transaction(
    async (tx) => {
      const categories = new Map<string, string>();
      for (const name of ["Earrings", "Necklaces", "Rings", "Bracelets"]) {
        const slug = name.toLowerCase();
        const value = await tx.category.upsert({
          where: { slug },
          update: {},
          create: { slug, name },
        });
        categories.set(slug, value.id);
      }
      const collections = new Map<string, string>();
      for (const [slug, name, description] of [
        [
          "everyday-edit",
          "The Everyday Edit",
          "Considered forms for everyday rituals. Minimal pieces. Maximum impact.",
        ],
        [
          "celebration",
          "The Celebration Edit",
          "For moments that stay. Expressive gold forms for your occasion edit.",
        ],
        [
          "statement",
          "Statement Pieces",
          "Sculptural forms, distinctive details. An expression all your own.",
        ],
      ] as const) {
        const value = await tx.collection.upsert({
          where: { slug },
          update: {},
          create: { slug, name, description },
        });
        collections.set(slug, value.id);
      }
      const catalog = [
        {
          slug: "petal-stud-earrings",
          name: "Petal Stud Earrings",
          category: "earrings",
          price: 245000,
          stock: 8,
          art: "flowers",
          featured: true,
          edit: "statement",
        },
        {
          slug: "fine-chain-necklace",
          name: "Fine Chain Necklace",
          category: "necklaces",
          price: 495000,
          stock: 4,
          art: "pendant",
          featured: true,
          edit: "celebration",
        },
        {
          slug: "sculpted-band-ring",
          name: "Sculpted Band Ring",
          category: "rings",
          price: 325000,
          stock: 0,
          art: "rings",
          featured: true,
          edit: "everyday-edit",
        },
        {
          slug: "sculpted-gold-cuff",
          name: "The Sculpted Cuff",
          category: "bracelets",
          price: 169000,
          stock: 6,
          art: "bracelet",
          featured: true,
          edit: "everyday-edit",
        },
        {
          slug: "everyday-hoops",
          name: "The Everyday Hoops",
          category: "earrings",
          price: 129000,
          stock: 12,
          art: "hoops",
          featured: false,
          edit: "everyday-edit",
        },
        {
          slug: "curve-pendant",
          name: "The Curve Pendant",
          category: "necklaces",
          price: 149000,
          stock: 5,
          art: "pendant",
          featured: false,
          edit: "everyday-edit",
        },
        {
          slug: "fine-gold-ring",
          name: "The Fine Ring",
          category: "rings",
          price: 99000,
          stock: 7,
          art: "rings",
          featured: false,
          edit: "everyday-edit",
        },
        {
          slug: "petal-drop-earrings",
          name: "Petal Drop Earrings",
          category: "earrings",
          price: 289000,
          stock: 0,
          art: "flowers",
          featured: false,
          edit: "statement",
        },
        {
          slug: "soft-form-cuff",
          name: "Soft Form Cuff",
          category: "bracelets",
          price: 219000,
          stock: 3,
          art: "bracelet",
          featured: false,
          edit: "statement",
        },
        {
          slug: "occasion-pendant",
          name: "The Occasion Pendant",
          category: "necklaces",
          price: 359000,
          stock: 2,
          art: "pendant",
          featured: false,
          edit: "celebration",
        },
        {
          slug: "sculptural-hoops",
          name: "Sculptural Hoops",
          category: "earrings",
          price: 189000,
          stock: 9,
          art: "hoops",
          featured: false,
          edit: "celebration",
        },
        {
          slug: "open-form-ring",
          name: "Open Form Ring",
          category: "rings",
          price: 229000,
          stock: 0,
          art: "rings",
          featured: false,
          edit: "statement",
        },
        {
          slug: "slender-cuff",
          name: "The Slender Cuff",
          category: "bracelets",
          price: 139000,
          stock: 4,
          art: "bracelet",
          featured: false,
          edit: "everyday-edit",
        },
      ];
      for (const item of catalog) {
        const product = await tx.product.upsert({
          where: { slug: item.slug },
          update: {},
          create: {
            slug: item.slug,
            name: item.name,
            sku: `DEV-${item.slug.toUpperCase()}`,
            description:
              "An expressive form for a considered jewellery edit. This is a development catalogue sample; imagery is a styling concept. Materials and final product details will be confirmed before orders open.",
            pricePaise: item.price,
            compareAtPaise: item.slug === "everyday-hoops" ? 159000 : null,
            featured: item.featured,
            stockQuantity: item.stock,
            categoryId: categories.get(item.category)!,
            images: {
              create: [
                {
                  url: `/images/editorial/${item.art}.webp`,
                  alt: `Concept jewellery for ${item.name}; actual product photography pending`,
                  concept: true,
                  position: 0,
                },
                ...(item.slug === "sculpted-band-ring"
                  ? [
                      {
                        url: "/images/editorial/story.webp",
                        alt: "Ring styling concept, not actual product photography",
                        concept: true,
                        position: 1,
                      },
                    ]
                  : []),
              ],
            },
            collections: {
              create: [
                { collectionId: collections.get(item.edit)! },
                ...(item.featured && item.edit !== "everyday-edit"
                  ? [{ collectionId: collections.get("everyday-edit")! }]
                  : []),
              ],
            },
          },
        });
        if (item.slug === "sculpted-band-ring") {
          const images = await tx.productImage.findMany({
            where: { productId: product.id },
            orderBy: { position: "asc" },
          });
          for (const [size, stock, price, index] of [
            [12, 3, null, 0],
            [14, 0, 335000, 1],
            [16, 5, 345000, 1],
          ] as const)
            await tx.productVariant.upsert({
              where: { sku: `DEV-RING-${size}` },
              update: {},
              create: {
                productId: product.id,
                name: `Size ${size}`,
                sku: `DEV-RING-${size}`,
                stockQuantity: stock,
                pricePaise: price,
                imageId: images[index]?.id,
              },
            });
        }
      }
      await tx.product.upsert({
        where: { slug: "archived-sample" },
        update: {},
        create: {
          slug: "archived-sample",
          name: "Archived sample",
          description: "Not public",
          active: false,
          pricePaise: 100,
          categoryId: categories.get("earrings")!,
        },
      });
    },
    { timeout: 30000 },
  );
  console.log(
    "Development catalog ready: 13 public samples, 1 archived sample, 4 categories and 3 collections. No admin user created; existing records preserved.",
  );
} finally {
  await db.$disconnect();
}
