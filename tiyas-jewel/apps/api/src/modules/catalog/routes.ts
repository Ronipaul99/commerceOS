import type { FastifyInstance } from "fastify";
import {
  catalogQuerySchema,
  productParamsSchema,
  searchQuerySchema,
  cartRequestSchema,
} from "@tiyas/shared";
import { catalogRepository } from "./repository.js";
import { resolveCart } from "./cart.js";
export async function catalogRoutes(app: FastifyInstance) {
  const catalog = catalogRepository(app.db);
  app.get("/products", async (request) =>
    catalog.listProducts(catalogQuerySchema.parse(request.query)),
  );
  app.get("/products/:slug", async (request, reply) => {
    const { slug } = productParamsSchema.parse(request.params);
    const product = await catalog.findProduct(slug);
    if (!product)
      return reply
        .code(404)
        .send({
          error: {
            code: "NOT_FOUND",
            message: "Product not found",
            requestId: request.id,
          },
        });
    return { data: product };
  });
  app.get("/categories", async () => catalog.listCategories());
  app.get("/collections", async () => catalog.listCollections());
  app.get("/collections/:slug", async (request, reply) => {
    const { slug } = productParamsSchema.parse(request.params);
    const collection = await catalog.findCollection(slug);
    if (!collection)
      return reply
        .code(404)
        .send({
          error: {
            code: "NOT_FOUND",
            message: "Collection not found",
            requestId: request.id,
          },
        });
    return { data: collection };
  });
  app.get("/search", async (request) => {
    const { q, limit } = searchQuerySchema.parse(request.query);
    return catalog.search(q, limit);
  });
  app.post("/cart/resolve", async (request) => {
    const { items } = cartRequestSchema.parse(request.body);
    return {
      data: resolveCart(
        items,
        items.length
          ? await catalog.findByIds(items.map((item) => item.productId))
          : [],
      ),
    };
  });
}
