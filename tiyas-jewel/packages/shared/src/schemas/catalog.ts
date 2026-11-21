import { z } from "zod";

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const moneyPaiseSchema = z.number().int().min(0).max(2_147_483_647);
export const productParamsSchema = z.object({ slug: slugSchema }).strict();
export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .strict();

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: slugSchema,
  description: z.string().nullable(),
});
export const collectionSchema = categorySchema.extend({});
/** Store-owner supplied product facts; ratings and sales claims are not editable facts. */
export const productDetailsSchema = z
  .object({
    subtitle: z.string().trim().max(160).optional(),
    material: z.string().trim().max(100).optional(),
    weightGrams: z.number().finite().positive().max(10000).optional(),
    size: z.string().trim().max(100).optional(),
    colors: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(40),
            hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          })
          .strict(),
      )
      .max(12)
      .optional(),
  })
  .strict();
export const productImageSchema = z.object({
  id: z.string(),
  url: z.string().startsWith("/images/"),
  alt: z.string(),
  concept: z.boolean().optional(),
  position: z.number().int(),
});
export const productVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  pricePaise: moneyPaiseSchema.nullable(),
  available: z.boolean(),
  maxQuantity: z.number().int().min(0).max(99).optional(),
  imageId: z.string().nullable().optional(),
});
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: slugSchema,
  description: z.string(),
  details: productDetailsSchema.nullable().optional(),
  pricePaise: moneyPaiseSchema,
  compareAtPaise: moneyPaiseSchema.nullable().optional(),
  sku: z.string().nullable().optional(),
  featured: z.boolean().optional(),
  maxQuantity: z.number().int().min(0).max(99).optional(),
  currency: z.literal("INR"),
  available: z.boolean(),
  category: categorySchema,
  images: z.array(productImageSchema),
  variants: z.array(productVariantSchema),
  collections: z.array(collectionSchema),
});
export const productsResponseSchema = z.object({
  data: z.array(productSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export const productResponseSchema = z.object({ data: productSchema });
export const categoriesResponseSchema = z.object({
  data: z.array(categorySchema),
});
export const collectionsResponseSchema = z.object({
  data: z.array(collectionSchema),
});
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "unavailable"]),
  database: z.enum(["up", "down"]),
});
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    issues: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional(),
  }),
});
