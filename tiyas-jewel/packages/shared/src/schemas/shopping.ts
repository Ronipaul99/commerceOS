import { z } from "zod";
import {
  categorySchema,
  collectionSchema,
  moneyPaiseSchema,
  paginationQuerySchema,
  productSchema,
  productTagSchema,
  slugSchema,
} from "./catalog.js";
export const catalogQuerySchema = paginationQuerySchema
  .extend({
    category: slugSchema.optional(),
    collection: slugSchema.optional(),
    tag: productTagSchema.optional(),
    edit: slugSchema.optional(),
    minPricePaise: z.coerce.number().int().min(0).max(2147483647).optional(),
    maxPricePaise: z.coerce.number().int().min(0).max(2147483647).optional(),
    availability: z.enum(["in-stock", "out-of-stock"]).optional(),
    sort: z.enum(["newest", "price-asc", "price-desc"]).default("newest"),
    featured: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    ids: z
      .string()
      .max(6500)
      .transform((value) => value.split(","))
      .pipe(z.array(z.string().min(1).max(128)).min(1).max(50))
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.minPricePaise === undefined ||
      value.maxPricePaise === undefined ||
      value.minPricePaise <= value.maxPricePaise,
    {
      message: "Minimum price must not exceed maximum price",
      path: ["maxPricePaise"],
    },
  );
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export const searchQuerySchema = z
  .object({
    q: z.string().trim().max(80).default(""),
    limit: z.coerce.number().int().min(1).max(12).default(6),
  })
  .strict();
export const searchResponseSchema = z.object({
  data: z.object({
    products: z.array(productSchema),
    categories: z.array(categorySchema),
  }),
});
export const collectionResponseSchema = z.object({ data: collectionSchema });
export const cartItemSchema = z
  .object({
    productId: z.string().min(1).max(128),
    slug: slugSchema,
    variantId: z.string().min(1).max(128).nullable(),
    quantity: z.number().int().min(1).max(99),
  })
  .strict();
export const cartRequestSchema = z
  .object({ items: z.array(cartItemSchema).max(50) })
  .strict()
  .refine(
    ({ items }) =>
      new Set(items.map((item) => `${item.productId}:${item.variantId ?? ""}`))
        .size === items.length,
    { message: "Duplicate cart selections are not allowed", path: ["items"] },
  );
const aggregatePaise = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const cartLineSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  variantId: z.string().nullable(),
  requestedQuantity: z.number().int(),
  quantity: z.number().int().min(0).max(99),
  product: productSchema.nullable(),
  unitPricePaise: moneyPaiseSchema.nullable(),
  lineTotalPaise: aggregatePaise,
  maxQuantity: z.number().int().min(0).max(99),
  status: z.enum([
    "ready",
    "adjusted",
    "unavailable",
    "missing",
    "variant_required",
    "variant_missing",
  ]),
});
export const cartResponseSchema = z.object({
  data: z.object({
    items: z.array(cartLineSchema),
    subtotalPaise: aggregatePaise,
    currency: z.literal("INR"),
  }),
});
export type CartItemRef = z.infer<typeof cartItemSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
export type CartQuote = z.infer<typeof cartResponseSchema>["data"];
