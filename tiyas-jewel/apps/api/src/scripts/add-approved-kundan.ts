import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { productDetailsSchema } from "@tiyas/shared";
config({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
  quiet: true,
});
if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 8000,
  }),
});
try {
  const result = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('tiyas-approved-kundan'))`;
      const slug = "premium-kundan-choker-set";
      const existing = await tx.product.findUnique({ where: { slug } });
      if (existing)
        return { created: false, slug, stockQuantity: existing.stockQuantity };
      const category = await tx.category.upsert({
        where: { slug: "necklaces" },
        update: {},
        create: { name: "Necklaces", slug: "necklaces" },
      });
      const collection = await tx.collection.upsert({
        where: { slug: "premium-kundan" },
        update: {},
        create: {
          name: "Premium Kundan",
          slug: "premium-kundan",
          description: "Traditional Kundan forms for special occasions.",
        },
      });
      await tx.product.create({
        data: {
          name: "Premium Kundan Choker Set",
          slug,
          description:
            "A brass Kundan necklace with matching earrings. Adjustable necklace length of 14–16 inches, with an approximate set weight of 78 grams. Product specifications supplied for the approved design; actual product photography is pending.",
          details: productDetailsSchema.parse({
            subtitle: "Necklace with Matching Earrings",
            material: "Brass with Kundan",
            weightGrams: 78,
            size: "Adjustable (14–16 in)",
            colors: [
              { name: "Green", hex: "#00582d" },
              { name: "Ruby Red", hex: "#a50908" },
              { name: "Pearl White", hex: "#eee0d2" },
              { name: "Navy Blue", hex: "#062557" },
            ],
          }),
          pricePaise: 749000,
          compareAtPaise: 899900,
          sku: "TJ-KUNDAN-CHOKER-001",
          stockQuantity: 0,
          active: true,
          featured: true,
          categoryId: category.id,
          collections: { create: { collectionId: collection.id } },
          images: {
            create: [
              {
                url: "/images/campaign/tyohar-mobile.webp",
                alt: "Kundan campaign concept; actual Premium Kundan Choker Set photography pending",
                concept: true,
                position: 0,
              },
              {
                url: "/images/campaign/tyohar.webp",
                alt: "Kundan campaign styling concept; actual product photography pending",
                concept: true,
                position: 1,
              },
            ],
          },
        },
      });
      return { created: true, slug, stockQuantity: 0 };
    },
    { timeout: 15000 },
  );
  console.log(JSON.stringify(result));
} catch {
  console.error(
    "Approved Kundan creation failed; check migration and database configuration. No existing product was overwritten.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
