import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import type { ApiConfig } from "./config/env.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { databasePlugin } from "./plugins/database.js";
import { registerErrorHandler } from "./middleware/error-handler.js";
import { catalogRoutes } from "./modules/catalog/routes.js";

export async function buildApp(
  config: ApiConfig,
  options: { db?: PrismaClient; logger?: boolean } = {},
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
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    methods: ["GET", "HEAD", "OPTIONS", "POST"],
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
  return app;
}
