import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import {
  adminLoginSchema,
  adminProductInputSchema,
  adminProductQuerySchema,
  adminOrderQuerySchema,
  adminParamsSchema,
  adminVersionSchema,
} from "@tiyas/shared";
import type { ApiConfig } from "../../config/env.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  imageStorage,
  type ImageStorage,
} from "../../integrations/image-storage.js";
import { adminAuth } from "./auth.js";
import { adminCatalog } from "./catalog.js";
import { adminOrders } from "./orders.js";
import { AdminError } from "./errors.js";
export async function adminRoutes(
  app: FastifyInstance,
  options: { config: ApiConfig; storage?: ImageStorage },
) {
  const auth = adminAuth(app, options.config),
    catalog = adminCatalog(
      app.db,
      options.storage ?? imageStorage(options.config),
    ),
    orders = adminOrders(app.db);
  await app.register(rateLimit, { max: 180, timeWindow: "1 minute" });
  app.post(
    "/login",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    async (req, reply) => {
      const body = adminLoginSchema.parse(req.body);
      return auth.login(req, reply, body.email, body.password);
    },
  );
  await app.register(async (protectedApp) => {
    protectedApp.addHook("onRequest", auth.requireAdmin);
    await protectedApp.register(multipart, {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    });
    protectedApp.setErrorHandler((error, req, reply) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
          throw new AdminError(
            "DUPLICATE_VALUE",
            "A slug, SKU or image is already in use.",
            409,
          );
        if (error.code === "P2003")
          throw new AdminError(
            "RECORD_IN_USE",
            "This record is used by an order or another product. Archive it instead.",
            409,
          );
        if (error.code === "P2025")
          throw new AdminError("NOT_FOUND", "Record not found.", 404);
      }
      throw error;
    });
    protectedApp.get("/session", async (req) => ({
      data: {
        email: req.admin!.email,
        csrfToken: req.admin!.csrfToken,
        expiresAt: req.admin!.expiresAt.toISOString(),
      },
    }));
    protectedApp.post("/logout", async (req, reply) => auth.logout(req, reply));
    protectedApp.get("/dashboard", async () => orders.dashboard());
    protectedApp.get("/options", async () => catalog.options());
    protectedApp.get("/products", async (req) =>
      catalog.list(adminProductQuerySchema.parse(req.query)),
    );
    protectedApp.get("/products/:id", async (req) =>
      catalog.get(adminParamsSchema.parse(req.params).id),
    );
    protectedApp.post("/products", async (req, reply) => {
      const result = await catalog.save(
        adminProductInputSchema.parse(req.body),
        req.admin!.id,
      );
      reply.code(201);
      return result;
    });
    protectedApp.put("/products/:id", async (req) =>
      catalog.save(
        adminProductInputSchema.parse(req.body),
        req.admin!.id,
        adminParamsSchema.parse(req.params).id,
      ),
    );
    protectedApp.post("/products/:id/archive", async (req) =>
      catalog.archive(
        adminParamsSchema.parse(req.params).id,
        adminVersionSchema.parse(req.body).version,
      ),
    );
    protectedApp.delete("/products/:id", async (req) =>
      catalog.remove(
        adminParamsSchema.parse(req.params).id,
        adminVersionSchema.parse(req.body).version,
      ),
    );
    protectedApp.post(
      "/images",
      { bodyLimit: 6 * 1024 * 1024 },
      async (req, reply) => {
        const file = await req.file();
        if (!file)
          throw new AdminError("IMAGE_REQUIRED", "Choose an image to upload.");
        const buffer = await file.toBuffer();
        if (file.file.truncated)
          throw new AdminError(
            "IMAGE_TOO_LARGE",
            "Images must be 5 MB or smaller.",
            413,
          );
        reply.code(201);
        return catalog.upload(buffer, req.admin!.id);
      },
    );
    protectedApp.delete("/images/:id", async (req) =>
      catalog.removeImage(
        z.object({ id: z.uuid() }).parse(req.params).id,
        req.admin!.id,
      ),
    );
    protectedApp.get("/orders", async (req) =>
      orders.list(adminOrderQuerySchema.parse(req.query)),
    );
    protectedApp.get("/orders/:id", async (req) =>
      orders.get(adminParamsSchema.parse(req.params).id),
    );
    protectedApp.post("/orders/:id/complete", async (req) => {
      z.object({}).strict().parse(req.body);
      return orders.complete(adminParamsSchema.parse(req.params).id);
    });
  });
}
export async function uploadedImageRoutes(
  app: FastifyInstance,
  options: { config: ApiConfig; storage?: ImageStorage },
) {
  const storage = options.storage ?? imageStorage(options.config),
    auth = adminAuth(app, options.config);
  app.get("/images/uploads/:file", async (req, reply) => {
    const { file } = z
      .object({ file: z.string().regex(/^[a-f0-9-]{36}\.webp$/) })
      .parse(req.params);
    const id = z.uuid().parse(file.slice(0, -5));
    const asset = await app.db.imageAsset.findUnique({
      where: { id },
      include: {
        image: { include: { product: { include: { category: true } } } },
      },
    });
    if (!asset) throw new AdminError("NOT_FOUND", "Image not found.", 404);
    const published =
      asset.image?.product.active && asset.image.product.category.active;
    const historical = published
      ? false
      : (await app.db.orderItem.count({
          where: { image: `/images/uploads/${file}` },
        })) > 0;
    if (!published && !historical && !(await auth.session(req)))
      throw new AdminError("NOT_FOUND", "Image not found.", 404);
    let buffer: Buffer;
    try {
      buffer = await storage.get(asset.objectKey);
    } catch {
      throw new AdminError(
        "IMAGE_UNAVAILABLE",
        "Image is temporarily unavailable.",
        503,
      );
    }
    return reply
      .type("image/webp")
      .header("X-Content-Type-Options", "nosniff")
      .send(buffer);
  });
}
