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
  contentKeySchema,
  contentSaveSchema,
  contentPublishSchema,
  otpRequestSchema,
  otpCompleteSchema,
  adminUserInputSchema,
  adminUserUpdateSchema,
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
import { adminContent } from "./content.js";
import { adminAccess } from "./access.js";
import { adminEmail, type AdminEmail } from "../../integrations/admin-email.js";
export async function adminRoutes(
  app: FastifyInstance,
  options: { config: ApiConfig; storage?: ImageStorage; email?: AdminEmail },
) {
  const auth = adminAuth(app, options.config),
    catalog = adminCatalog(
      app.db,
      options.storage ?? imageStorage(options.config),
    ),
    orders = adminOrders(app.db);
  const content = adminContent(app.db),
    access = adminAccess(
      app.db,
      options.config,
      options.email ?? adminEmail(options.config),
    );
  await app.register(rateLimit, { max: 180, timeWindow: "1 minute" });
  app.post(
    "/login",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    async (req, reply) => {
      const body = adminLoginSchema.parse(req.body);
      return auth.login(req, reply, body.email, body.password);
    },
  );
  app.post(
    "/access/request",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    async (req) => {
      auth.checkOrigin(req);
      const body = otpRequestSchema.parse(req.body);
      // Missing delivery configuration is global, independent of the supplied address.
      if (
        !options.email &&
        (!options.config.SMTP_HOST ||
          !options.config.SMTP_FROM ||
          !options.config.SMTP_USER ||
          !options.config.SMTP_PASSWORD ||
          !options.config.ADMIN_OTP_SECRET)
      )
        throw new AdminError(
          "EMAIL_UNAVAILABLE",
          "Email delivery is not configured. Contact the store owner.",
          503,
        );
      try {
        await access.send(body.email, body.purpose);
      } catch {
        req.log.warn("Admin OTP email delivery failed");
      }
      return { data: { ok: true } };
    },
  );
  app.post(
    "/access/complete",
    { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
    async (req) => {
      auth.checkOrigin(req);
      const body = otpCompleteSchema.parse(req.body);
      return access.complete(
        body.email,
        body.purpose,
        body.code,
        body.password,
      );
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
            "An email, slug, SKU or image is already in use.",
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
        name: req.admin!.name,
        role: req.admin!.role,
      },
    }));
    protectedApp.post("/logout", async (req, reply) => auth.logout(req, reply));
    protectedApp.get("/content", async () => content.list());
    protectedApp.get("/content/:key", async (req) =>
      content.get(contentKeySchema.parse((req.params as { key: string }).key)),
    );
    protectedApp.put("/content/:key", async (req) => {
      const body = contentSaveSchema.parse(req.body);
      return content.save(
        contentKeySchema.parse((req.params as { key: string }).key),
        body.version,
        body.value,
      );
    });
    protectedApp.post("/content/:key/publish", async (req) => {
      const body = contentPublishSchema.parse(req.body);
      return content.save(
        contentKeySchema.parse((req.params as { key: string }).key),
        body.version,
        body.value,
        body.published,
      );
    });
    protectedApp.delete("/content/:key", async (req) => {
      const body = z
        .object({ version: z.number().int().positive() })
        .strict()
        .parse(req.body);
      return content.remove(
        contentKeySchema.parse((req.params as { key: string }).key),
        body.version,
      );
    });
    protectedApp.get("/users", async () => access.list());
    protectedApp.post("/users", async (req, reply) => {
      const result = await access.invite(adminUserInputSchema.parse(req.body));
      reply.code(201);
      return result;
    });
    protectedApp.put("/users/:id", async (req) =>
      access.update(
        adminParamsSchema.parse(req.params).id,
        adminUserUpdateSchema.parse(req.body),
      ),
    );
    protectedApp.post("/users/:id/resend", async (req) => {
      z.object({}).strict().parse(req.body);
      const user = await app.db.adminUser.findUnique({
        where: { id: adminParamsSchema.parse(req.params).id },
      });
      if (!user) throw new AdminError("NOT_FOUND", "Admin not found.", 404);
      await access.send(user.email, user.invited ? "INVITE" : "RESET");
      return { data: { ok: true } };
    });
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
    const { width } = z
      .object({ width: z.coerce.number().int().min(16).max(3840).optional() })
      .strict()
      .parse(req.query);
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
    const publishedContent = await app.db.contentAssetUse.count({
      where: { assetId: id, published: true },
    });
    const publicStory = await app.db.customerStory.count({
      where: {
        imageAssetId: id,
        published: true,
        OR: [{ reviewId: null }, { review: { status: "PUBLISHED" } }],
      },
    });
    const publicReel = options.config.REELS_ENABLED
      ? await app.db.reel.count({
          where: { posterId: id, published: true, rightsConfirmed: true },
        })
      : 0;
    if (
      !published &&
      !historical &&
      !publishedContent &&
      !publicStory &&
      !publicReel &&
      !(await auth.session(req))
    )
      throw new AdminError("NOT_FOUND", "Image not found.", 404);
    let buffer: Buffer;
    try {
      const rendition = width
        ? await app.db.imageRendition.findFirst({
            where: { assetId: id, width: { gte: width } },
            orderBy: { width: "asc" },
          })
        : null;
      buffer = await storage.get(rendition?.objectKey ?? asset.objectKey);
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
