import { z } from "zod";
import {
  slugSchema,
  paginationQuerySchema,
  categorySchema,
} from "./catalog.js";
import { addressSchema, orderLineSchema, totalsSchema } from "./checkout.js";

const id = z.string().min(1).max(100);
const money = z.number().int().min(1).max(100000000);
const stock = z.number().int().min(0).max(1000000);
const version = z.iso.datetime();
export const adminLoginSchema = z
  .object({
    email: z.email().max(254).trim().toLowerCase(),
    password: z.string().min(1).max(128),
  })
  .strict();
export const adminPasswordSchema = z
  .string()
  .min(14, "Use at least 14 characters")
  .max(128);
export const adminSessionSchema = z.object({
  data: z.object({
    email: z.email(),
    csrfToken: z.string(),
    expiresAt: version,
  }),
});
export const adminImageInputSchema = z
  .object({
    id: id.optional(),
    assetId: z.uuid().optional(),
    alt: z.string().trim().min(1).max(250),
  })
  .strict()
  .refine(
    (v) => Boolean(v.id) !== Boolean(v.assetId),
    "Select an existing image or an uploaded asset",
  );
export const adminVariantInputSchema = z
  .object({
    id: id.optional(),
    version: version.optional(),
    name: z.string().trim().min(1).max(100),
    sku: z.string().trim().min(1).max(80),
    pricePaise: money.nullable(),
    stockQuantity: stock,
    active: z.boolean(),
    imageRef: id.nullable(),
  })
  .strict();
export const adminProductInputSchema = z
  .object({
    version: version.optional(),
    name: z.string().trim().min(1).max(200),
    slug: slugSchema,
    description: z.string().trim().min(1).max(10000),
    categoryId: id,
    collectionIds: z.array(id).max(20),
    pricePaise: money,
    compareAtPaise: money.nullable(),
    sku: z.string().trim().min(1).max(80),
    stockQuantity: stock,
    active: z.boolean(),
    featured: z.boolean(),
    images: z.array(adminImageInputSchema).max(12),
    variants: z.array(adminVariantInputSchema).max(50),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.compareAtPaise !== null && v.compareAtPaise <= v.pricePaise)
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPaise"],
        message: "Comparison price must be higher than price",
      });
    for (const [field, values] of [
      ["collectionIds", v.collectionIds],
      ["images", v.images.map((i) => i.id ?? i.assetId!)],
      ["variants", v.variants.map((i) => i.sku)],
    ] as const)
      if (new Set(values).size !== values.length)
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "Duplicate entries are not allowed",
        });
    if (v.variants.some((i) => i.sku === v.sku))
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Variant SKUs must differ from the product SKU",
      });
    if (
      new Set(v.variants.flatMap((i) => (i.id ? [i.id] : []))).size !==
      v.variants.filter((i) => i.id).length
    )
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Duplicate variant identifiers are not allowed",
      });
    const images = new Set(v.images.map((i) => i.id ?? i.assetId));
    if (v.variants.some((i) => i.imageRef && !images.has(i.imageRef)))
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Variant images must belong to this product",
      });
  });
export const adminProductQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).default(""),
  categoryId: id.optional(),
});
export const adminOrderQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["NEW", "COMPLETED", "ALL"]).default("NEW"),
});
export const adminParamsSchema = z.object({ id }).strict();
export const adminVersionSchema = z.object({ version }).strict();
export const adminAssetSchema = z.object({
  id: z.uuid(),
  url: z.string().startsWith("/images/uploads/"),
  width: z.number().int(),
  height: z.number().int(),
  bytes: z.number().int(),
});
export const adminImageSchema = z.object({
  id,
  url: z.string().startsWith("/images/"),
  assetId: z.uuid().nullable(),
  alt: z.string(),
  concept: z.boolean(),
  position: z.number().int(),
});
export const adminProductSchema = z.object({
  id,
  name: z.string(),
  slug: slugSchema,
  description: z.string(),
  categoryId: id,
  category: categorySchema.extend({ active: z.boolean() }),
  collectionIds: z.array(id),
  pricePaise: z.number().int(),
  compareAtPaise: z.number().int().nullable(),
  sku: z.string().nullable(),
  stockQuantity: stock,
  active: z.boolean(),
  featured: z.boolean(),
  version,
  images: z.array(adminImageSchema),
  variants: z.array(adminVariantInputSchema.extend({ id, version })),
});
export const adminProductResponseSchema = z.object({
  data: adminProductSchema,
});
const pagination = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
export const adminProductsResponseSchema = z.object({
  data: z.array(adminProductSchema),
  pagination,
});
export const adminOptionsSchema = z.object({
  data: z.object({
    categories: z.array(categorySchema.extend({ active: z.boolean() })),
    collections: z.array(categorySchema.extend({ active: z.boolean() })),
  }),
});
export const adminOrderSummarySchema = z.object({
  id,
  orderNumber: z.string(),
  createdAt: version,
  completedAt: version.nullable(),
  customerName: z.string(),
  customerMobile: z.string(),
  totalPaise: z.number().int(),
  paymentMethod: z.enum(["ONLINE", "COD"]),
  paymentStatus: z.enum(["PAID", "COD_PENDING"]),
  operationalStatus: z.enum(["NEW", "COMPLETED"]),
});
export const adminOrderSchema = adminOrderSummarySchema.extend({
  customerEmail: z.email(),
  address: addressSchema,
  items: z.array(orderLineSchema),
  totals: totalsSchema,
});
export const adminOrderResponseSchema = z.object({ data: adminOrderSchema });
export const adminOrdersResponseSchema = z.object({
  data: z.array(adminOrderSummarySchema),
  pagination,
});
export const adminDashboardSchema = z.object({
  data: z.object({
    totalProducts: z.number().int(),
    activeProducts: z.number().int(),
    newOrders: z.number().int(),
    completedOrders: z.number().int(),
    recentOrders: z.array(adminOrderSummarySchema),
  }),
});
export type AdminProductInput = z.infer<typeof adminProductInputSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;
export type AdminOrder = z.infer<typeof adminOrderSchema>;
export type AdminOrderSummary = z.infer<typeof adminOrderSummarySchema>;
export type AdminSession = z.infer<typeof adminSessionSchema>["data"];
