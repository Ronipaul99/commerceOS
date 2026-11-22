import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { adminRoutes, uploadedImageRoutes } from "./modules/admin/routes.js";
import type { ImageStorage } from "./integrations/image-storage.js";
import type { AdminEmail } from "./integrations/admin-email.js";
import {
  contentKeySchema,
  contentValueSchema,
  publicMediaRoute,
} from "@tiyas/shared";
import type { ApiConfig } from "./config/env.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { databasePlugin } from "./plugins/database.js";
import { registerErrorHandler } from "./middleware/error-handler.js";
import { checkoutRoutes } from "./modules/checkout/routes.js";
import type { PaymentGateway } from "./integrations/payments.js";
import { catalogRoutes } from "./modules/catalog/routes.js";
import { experienceRoutes } from "./modules/experience/routes.js";
import type { ReviewEmail } from "./integrations/review-email.js";
import { reelRoutes } from "./modules/reels/routes.js";
import {
  anonymousPublicGet,
  publicContentManifests,
  publicMediaCacheControl,
  publicMediaRoutes,
} from "./modules/media/public-media.js";
import { startMediaPurgeWorker } from "./modules/media/cdn-purge.js";

export async function buildApp(
  config: ApiConfig,
  options: {
    db?: PrismaClient;
    logger?: boolean;
    gateway?: PaymentGateway;
    background?: boolean;
    storage?: ImageStorage;
    email?: AdminEmail;
    reviewEmail?: ReviewEmail;
  } = {},
) {
  const app = Fastify({
    trustProxy: config.API_TRUSTED_PROXY_IP ?? false,
    bodyLimit: 64 * 1024,
    genReqId: () => randomUUID(),
    logger:
      options.logger === false
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              "res.headers.set-cookie",
            ],
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url?.split("?")[0],
                remoteAddress: req.ip,
              }),
            },
          },
  });
  registerErrorHandler(app);
  await app.register(helmet);
  await app.register(cookie);
  app.decorateRequest("admin", null);
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    methods: ["GET", "HEAD", "OPTIONS", "POST", "PUT", "DELETE"],
    credentials: false,
  });
  await app.register(databasePlugin, {
    connectionString: config.DATABASE_URL,
    client: options.db,
  });
  app.addHook("onSend", async (request, reply) => {
    const canCache =
      config.PUBLIC_MEDIA_CACHE_ENABLED &&
      request.routeOptions.url === publicMediaRoute &&
      anonymousPublicGet(request) &&
      [200, 304].includes(reply.statusCode) &&
      !reply.hasHeader("Set-Cookie") &&
      reply.getHeader("Cache-Control") === publicMediaCacheControl(config);
    reply.header(
      "Cache-Control",
      canCache
        ? publicMediaCacheControl(config)
        : request.url.startsWith("/images/uploads/") ||
            request.url.startsWith("/media/public/")
          ? "private, no-store"
          : "no-store",
    );
  });
  app.get("/api/health", async (request, reply) => {
    try {
      await app.db.$queryRaw`SELECT 1`;
      return { status: "ok", database: "up" };
    } catch {
      request.log.warn("Database readiness probe failed");
      return reply.code(503).send({ status: "unavailable", database: "down" });
    }
  });
  await app.register(catalogRoutes, {
    prefix: "/api/v1",
    publicMedia: config.PUBLIC_MEDIA_CACHE_ENABLED,
  });
  await app.register(experienceRoutes, {
    prefix: "/api/v1",
    config,
    email: options.reviewEmail,
    background: options.background,
  });
  app.get("/api/v1/content/:key", async (req) => {
    const key = contentKeySchema.parse((req.params as { key: string }).key);
    const document = await app.db.contentDocument.findUnique({
      where: { key },
      select: { published: true },
    });
    return {
      data: document?.published
        ? contentValueSchema.parse(document.published)
        : null,
      ...(document?.published && config.PUBLIC_MEDIA_CACHE_ENABLED
        ? { media: await publicContentManifests(app.db, key) }
        : {}),
    };
  });
  await app.register(checkoutRoutes, {
    prefix: "/api/v1",
    config,
    gateway: options.gateway,
    background: options.background,
  });
  await app.register(adminRoutes, {
    prefix: "/api/v1/admin",
    config,
    storage: options.storage,
    email: options.email,
  });
  await app.register(uploadedImageRoutes, { config, storage: options.storage });
  await app.register(publicMediaRoutes, { config, storage: options.storage });
  if (options.background) startMediaPurgeWorker(app, config);
  await app.register(reelRoutes, { config });
  return app;
}
