import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import {
  reviewContextSchema,
  reviewVerifySchema,
  reviewSubmitSchema,
  reviewQuerySchema,
  moderationSchema,
  customerStoryInputSchema,
  couponInputSchema,
} from "@tiyas/shared";
import { reviewService } from "../reviews/service.js";
import { couponAdmin } from "../coupons/service.js";
import {
  reviewEmail,
  type ReviewEmail,
} from "../../integrations/review-email.js";
import { adminAuth } from "../admin/auth.js";
import { AdminError } from "../admin/errors.js";
import type { ApiConfig } from "../../config/env.js";
export async function experienceRoutes(
  app: FastifyInstance,
  options: { config: ApiConfig; email?: ReviewEmail; background?: boolean },
) {
  const reviews = reviewService(
      app.db,
      options.config,
      options.email ?? reviewEmail(options.config),
    ),
    coupons = couponAdmin(app.db),
    auth = adminAuth(app, options.config);
  await app.register(rateLimit, { max: 90, timeWindow: "1 minute" });
  if (options.background && options.config.REVIEWS_ENABLED) {
    const timer = setInterval(() => {
      void (async () => {
        const cutoff = new Date(Date.now() - 86400000),
          rows = await app.db.reviewChallenge.findMany({
            where: { expiresAt: { lt: cutoff } },
            select: { id: true },
            take: 100,
          });
        if (rows.length)
          await app.db.reviewChallenge.deleteMany({
            where: {
              id: { in: rows.map((r) => r.id) },
              expiresAt: { lt: cutoff },
            },
          });
      })().catch(() =>
        app.log.warn("Expired review verification cleanup will retry."),
      );
    }, 60000);
    timer.unref();
    app.addHook("onClose", async () => {
      clearInterval(timer);
    });
  }
  app.addHook("onRequest", async (req) => {
    if (req.method !== "GET" && req.method !== "HEAD") auth.checkOrigin(req);
  });
  app.get("/experience/settings", async () => ({
    data: {
      reviews: options.config.REVIEWS_ENABLED,
      homepageReviews: options.config.HOMEPAGE_REVIEWS_ENABLED,
      coupons: options.config.COUPONS_ENABLED,
      reels: options.config.REELS_ENABLED,
    },
  }));
  app.post(
    "/reviews/challenges",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    (req) => reviews.request(reviewContextSchema.parse(req.body)),
  );
  app.post(
    "/reviews/challenges/verify",
    { config: { rateLimit: { max: 15, timeWindow: "15 minutes" } } },
    (req) => {
      const v = reviewVerifySchema.parse(req.body);
      return reviews.verify(v.challengeId, v.code);
    },
  );
  app.post("/products/:slug/reviews", (req) =>
    reviews.submit(
      reviewSubmitSchema.parse(req.body),
      z.object({ slug: z.string().max(120) }).parse(req.params).slug,
    ),
  );
  app.post("/store-reviews", (req) =>
    reviews.submit(reviewSubmitSchema.parse(req.body)),
  );
  app.get("/products/:slug/reviews", (req) =>
    reviews.list(
      reviewQuerySchema.parse(req.query),
      z.object({ slug: z.string().max(120) }).parse(req.params).slug,
    ),
  );
  app.get("/store-reviews", (req) =>
    reviews.list(reviewQuerySchema.parse(req.query)),
  );
  app.get("/customer-stories", (req) => {
    const q = z
      .object({
        page: z.coerce.number().int().min(1).max(10000).default(1),
        limit: z.coerce.number().int().min(1).max(24).default(12),
      })
      .strict()
      .parse(req.query);
    return reviews.stories(false, q.page, q.limit);
  });
  await app.register(
    async (admin) => {
      admin.addHook("preHandler", auth.requireAdmin);
      const id = (params: unknown) =>
        z.object({ id: z.string().min(1).max(120) }).parse(params).id;
      admin.get("/reviews", (req) =>
        reviews.adminList(reviewQuerySchema.parse(req.query)),
      );
      admin.patch("/reviews/:id", (req) => {
        const b = moderationSchema.parse(req.body);
        return reviews.moderate(
          id(req.params),
          b.status,
          b.reason,
          req.admin!.id,
        );
      });
      admin.get("/customer-stories", () => reviews.stories(true));
      admin.post("/customer-stories", (req) =>
        reviews.saveStory(
          customerStoryInputSchema.parse(req.body),
          req.admin!.id,
        ),
      );
      admin.patch("/customer-stories/:id", (req) =>
        reviews.saveStory(
          customerStoryInputSchema.parse(req.body),
          req.admin!.id,
          id(req.params),
        ),
      );
      admin.get("/coupons", () => coupons.list());
      admin.get("/coupons/:id", async (req) => {
        const c = await app.db.coupon.findUnique({
          where: { id: id(req.params) },
        });
        if (!c) throw new AdminError("NOT_FOUND", "Coupon not found.", 404);
        return {
          data: {
            ...c,
            startsAt: c.startsAt.toISOString(),
            endsAt: c.endsAt.toISOString(),
          },
        };
      });
      admin.post("/coupons", (req) =>
        coupons.save(couponInputSchema.parse(req.body), req.admin!.id),
      );
      admin.patch("/coupons/:id", (req) =>
        coupons.save(
          couponInputSchema.parse(req.body),
          req.admin!.id,
          id(req.params),
        ),
      );
    },
    { prefix: "/admin" },
  );
}
