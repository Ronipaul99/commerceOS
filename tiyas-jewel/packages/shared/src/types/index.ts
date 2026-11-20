import type { z } from "zod";
import type { productSchema, productsResponseSchema, categorySchema, collectionSchema, apiErrorSchema } from "../schemas/catalog.js";

export type Product = z.infer<typeof productSchema>;
export type ProductsResponse = z.infer<typeof productsResponseSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
