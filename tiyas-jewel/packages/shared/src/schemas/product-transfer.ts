import { z } from "zod";
import { adminProductInputSchema } from "./admin.js";
import { productDetailsSchema, slugSchema } from "./catalog.js";

/** Portable admin form data. Image bytes always travel through authorized uploads. */
export const productFileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(
    /^[^<>:"/\\|?*\u0000-\u001f]+\.(?:jpe?g|png|webp)$/i,
    "Use an image filename, without folders",
  );
const rupees = z
  .string()
  .regex(/^\d+(?:\.\d{1,2})?$/, "Use an INR amount such as 1490.00");
export function rupeesToPaise(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export const productTransferSchema = z
  .object({
    format: z.literal("tiyas-product"),
    version: z.literal(1),
    currency: z.literal("INR"),
    _guide: z.unknown().optional(),
    product: z
      .object({
        name: adminProductInputSchema.shape.name,
        slug: adminProductInputSchema.shape.slug,
        description: adminProductInputSchema.shape.description,
        sku: adminProductInputSchema.shape.sku,
        stockQuantity: adminProductInputSchema.shape.stockQuantity,
        active: adminProductInputSchema.shape.active,
        featured: adminProductInputSchema.shape.featured,
        categorySlug: slugSchema,
        collectionSlugs: z.array(slugSchema).max(20),
        price: rupees,
        compareAtPrice: rupees.nullable(),
        details: productDetailsSchema
          .extend({
            weightGrams: productDetailsSchema.shape.weightGrams.nullable(),
          })
          .nullable(),
        images: z
          .array(
            z
              .object({
                fileName: productFileNameSchema,
                alt: z.string().trim().min(1).max(250),
              })
              .strict(),
          )
          .max(12),
        variants: z
          .array(
            z
              .object({
                ...adminProductInputSchema.shape.variants.element.pick({
                  name: true,
                  sku: true,
                  stockQuantity: true,
                  active: true,
                }).shape,
                price: rupees.nullable(),
                imageFileName: productFileNameSchema.nullable(),
              })
              .strict(),
          )
          .max(50),
      })
      .strict(),
  })
  .strict()
  .superRefine(({ product: p }, ctx) => {
    const parsed = adminProductInputSchema.safeParse({
      name: p.name,
      slug: p.slug,
      description: p.description,
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      active: p.active,
      featured: p.featured,
      categoryId: p.categorySlug,
      collectionIds: p.collectionSlugs,
      pricePaise: rupeesToPaise(p.price),
      compareAtPaise:
        p.compareAtPrice === null ? null : rupeesToPaise(p.compareAtPrice),
      details: p.details
        ? { ...p.details, weightGrams: p.details.weightGrams ?? undefined }
        : null,
      images: p.images.map((i) => ({ id: i.fileName, alt: i.alt })),
      variants: p.variants.map((v) => ({
        name: v.name,
        sku: v.sku,
        stockQuantity: v.stockQuantity,
        active: v.active,
        pricePaise: v.price === null ? null : rupeesToPaise(v.price),
        imageRef: v.imageFileName,
      })),
    });
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const names: Record<string, string> = {
          pricePaise: "price",
          compareAtPaise: "compareAtPrice",
          collectionIds: "collectionSlugs",
          categoryId: "categorySlug",
          imageRef: "imageFileName",
        };
        ctx.addIssue({
          code: "custom",
          path: [
            "product",
            ...issue.path.map((k) =>
              typeof k === "string" ? (names[k] ?? k) : k,
            ),
          ],
          message: issue.message,
        });
      }
  });
export type ProductTransfer = z.infer<typeof productTransferSchema>;
