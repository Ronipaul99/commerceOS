import fp from "fastify-plugin";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

export const databasePlugin = fp<{
  connectionString: string;
  client?: PrismaClient;
}>(
  async (app, options) => {
    const db =
      options.client ??
      new PrismaClient({
        adapter: new PrismaPg({
          connectionString: options.connectionString,
          max: 10,
          connectionTimeoutMillis: 3000,
          query_timeout: 5000,
          // The Prisma pg adapter normalizes timestamptz responses as UTC. Pin the
          // PostgreSQL session timezone so offsets are converted before decoding.
          options: "-c timezone=UTC",
        }),
      });
    app.decorate("db", db);
    if (!options.client) {
      // Fail startup on an unavailable database rather than serving a misleading healthy API.
      app.addHook("onClose", async () => {
        await db.$disconnect();
      });
      try {
        await db.$connect();
      } catch (error) {
        await db.$disconnect();
        throw error;
      }
    }
  },
  { name: "database" },
);
