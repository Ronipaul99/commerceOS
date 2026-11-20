import { z } from "zod";
import {
  apiErrorSchema,
  productsResponseSchema,
  productResponseSchema,
  categoriesResponseSchema,
  collectionsResponseSchema,
  healthResponseSchema,
  slugSchema,
  collectionResponseSchema,
  searchResponseSchema,
  cartResponseSchema,
  type CartItemRef,
} from "@tiyas/shared";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
  ) {
    super(
      status === 404
        ? "This item could not be found."
        : "We could not load this information. Please try again.",
    );
    this.name = "ApiClientError";
  }
}

// Browser calls use the same origin. Server callers must explicitly provide an origin;
// they may use this client but must never access Prisma/PostgreSQL.
export function createApiClient(origin = "", fetcher: typeof fetch = fetch) {
  async function get<T>(
    path: string,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
    body?: unknown,
  ): Promise<T> {
    const response = await fetcher(`${origin}${path}`, {
      cache: "no-store",
      signal,
      method: body === undefined ? "GET" : "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
    });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiClientError(response.status, "INVALID_RESPONSE");
    }
    if (!response.ok) {
      const parsed = apiErrorSchema.safeParse(payload);
      throw new ApiClientError(
        response.status,
        parsed.success ? parsed.data.error.code : "API_ERROR",
        parsed.success ? parsed.data.error.requestId : undefined,
      );
    }
    return schema.parse(payload);
  }
  return {
    catalog: (
      query: Record<string, string | undefined> = {},
      signal?: AbortSignal,
    ) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query))
        if (value !== undefined && value !== "") params.set(key, value);
      return get(`/api/v1/products?${params}`, productsResponseSchema, signal);
    },
    collection: (slug: string, signal?: AbortSignal) =>
      get(
        `/api/v1/collections/${encodeURIComponent(slugSchema.parse(slug))}`,
        collectionResponseSchema,
        signal,
      ),
    search: (q: string, signal?: AbortSignal) =>
      get(
        `/api/v1/search?${new URLSearchParams({ q, limit: "6" })}`,
        searchResponseSchema,
        signal,
      ),
    resolveCart: (items: CartItemRef[], signal?: AbortSignal) =>
      get("/api/v1/cart/resolve", cartResponseSchema, signal, { items }),
    products: (page = 1, limit = 12, signal?: AbortSignal) =>
      get(
        `/api/v1/products?${new URLSearchParams({ page: String(page), limit: String(limit) })}`,
        productsResponseSchema,
        signal,
      ),
    product: (slug: string, signal?: AbortSignal) =>
      get(
        `/api/v1/products/${encodeURIComponent(slugSchema.parse(slug))}`,
        productResponseSchema,
        signal,
      ),
    categories: (signal?: AbortSignal) =>
      get("/api/v1/categories", categoriesResponseSchema, signal),
    collections: (signal?: AbortSignal) =>
      get("/api/v1/collections", collectionsResponseSchema, signal),
    health: (signal?: AbortSignal) =>
      get("/api/health", healthResponseSchema, signal),
  };
}
export const api = createApiClient();
