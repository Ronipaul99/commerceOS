import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { adminRoutes, uploadedImageRoutes } from "./modules/admin/routes.js";
import type { ImageStorage } from "./integrations/image-storage.js";
import type { ApiConfig } from "./config/env.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { databasePlugin } from "./plugins/database.js";
import { registerErrorHandler } from "./middleware/error-handler.js";
import { checkoutRoutes } from "./modules/checkout/routes.js";
import type { PaymentGateway } from "./integrations/payments.js";
import { catalogRoutes } from "./modules/catalog/routes.js";

export async function buildApp(
  config: ApiConfig,
  options: {
    db?: PrismaClient;
    logger?: boolean;
    gateway?: PaymentGateway;
    background?: boolean;
    storage?: ImageStorage;
  } = {},
) {
  const app = Fastify({
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
  app.addHook("onSend", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
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
  await app.register(catalogRoutes, { prefix: "/api/v1" });
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
  });
  await app.register(uploadedImageRoutes, { config, storage: options.storage });
  return app;
}
