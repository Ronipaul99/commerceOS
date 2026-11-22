import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { reelInputSchema } from "@tiyas/shared";
import { reelService } from "./service.js";
import type { ApiConfig } from "../../config/env.js";
import { adminAuth } from "../admin/auth.js";
export async function reelRoutes(
  app: FastifyInstance,
  options: { config: ApiConfig },
) {
  const service = reelService(app.db),
    auth = adminAuth(app, options.config);
  app.get("/api/v1/reels", () =>
    options.config.REELS_ENABLED ? service.list() : { data: [] },
  );
  await app.register(
    async (admin) => {
      await admin.register(rateLimit, { max: 30, timeWindow: "1 minute" });
      admin.addHook("preHandler", auth.requireAdmin);
      const id = (p: unknown) =>
        z.object({ id: z.string().min(1).max(120) }).parse(p).id;
      admin.get("/reels", () => service.list(true));
      admin.get("/reels/options", async () => ({
        data: await app.db.product.findMany({
          where: { active: true, category: { active: true } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
          take: 200,
        }),
      }));
      admin.post("/reels", (req) =>
        service.save(reelInputSchema.parse(req.body), req.admin!.id),
      );
      admin.patch("/reels/:id", (req) =>
        service.save(
          reelInputSchema.parse(req.body),
          req.admin!.id,
          id(req.params),
        ),
      );
    },
    { prefix: "/api/v1/admin/content" },
  );
}
