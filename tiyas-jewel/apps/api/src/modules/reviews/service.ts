import {
  createHmac,
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import type { z } from "zod";
import type {
  reviewContextSchema,
  reviewSubmitSchema,
  reviewQuerySchema,
  customerStoryInputSchema,
} from "@tiyas/shared";
import {
  Prisma,
  type PrismaClient,
  type CustomerReview,
} from "../../generated/prisma/client.js";
import type { ApiConfig } from "../../config/env.js";
import type { ReviewEmail } from "../../integrations/review-email.js";
import { AdminError } from "../admin/errors.js";
const include = { product: { select: { slug: true, name: true } } };
export function publicReview(
  r: CustomerReview & { product?: { slug: string; name: string } | null },
) {
  return {
    id: r.id,
    kind: r.kind,
    displayName: r.displayName,
    title: r.title,
    text: r.text,
    rating: r.rating,
    verifiedPurchase: r.verifiedPurchase,
    createdAt: r.createdAt.toISOString(),
    productSlug: r.product?.slug ?? null,
    productName: r.product?.name ?? null,
  };
}
export function reviewService(
  db: PrismaClient,
  config: ApiConfig,
  email: ReviewEmail,
) {
  const fail = () =>
    new AdminError(
      "REVIEW_VERIFICATION",
      "This verification expired or is invalid. Request a new code.",
      422,
    );
  const digest = (v: string) =>
    createHmac("sha256", config.REVIEW_OTP_SECRET!).update(v).digest("hex");
  function available() {
    if (!config.REVIEWS_ENABLED)
      throw new AdminError(
        "REVIEWS_DISABLED",
        "Review submissions are not available yet.",
        503,
      );
    if (!config.REVIEW_OTP_SECRET)
      throw new AdminError(
        "EMAIL_UNAVAILABLE",
        "Review verification is not configured.",
        503,
      );
  }
  async function request(input: z.infer<typeof reviewContextSchema>) {
    available();
    if (
      input.kind === "PRODUCT" &&
      !(await db.product.count({
        where: {
          id: input.productId,
          active: true,
          category: { active: true },
        },
      }))
    )
      throw new AdminError("NOT_FOUND", "This product is unavailable.", 404);
    const subjectKey =
        input.kind === "STORE" ? "STORE" : `PRODUCT:${input.productId}`,
      emailKey = createHash("sha256")
        .update(`review-email:${input.email}`)
        .digest("hex"),
      code = String(randomInt(100000, 1000000));
    const challenge = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${emailKey + subjectKey},0))`;
      const current = await tx.reviewChallenge.findUnique({
        where: { emailKey_subjectKey: { emailKey, subjectKey } },
      });
      if (current && current.createdAt.getTime() > Date.now() - 60000)
        throw new AdminError(
          "RATE_LIMITED",
          "Please wait one minute before requesting another code.",
          429,
        );
      return tx.reviewChallenge.upsert({
        where: { emailKey_subjectKey: { emailKey, subjectKey } },
        create: {
          emailKey,
          email: input.email,
          subjectKey,
          codeHash: digest(`${subjectKey}:${code}`),
          expiresAt: new Date(Date.now() + 600000),
        },
        update: {
          codeHash: digest(`${subjectKey}:${code}`),
          grantHash: null,
          submissionHash: null,
          submittedReviewId: null,
          attempts: 0,
          usedAt: null,
          expiresAt: new Date(Date.now() + 600000),
          createdAt: new Date(),
        },
      });
    });
    try {
      await email.sendCode(input.email, code);
    } catch (e) {
      await db.reviewChallenge.deleteMany({
        where: { id: challenge.id, codeHash: challenge.codeHash },
      });
      throw e;
    }
    return {
      data: {
        challengeId: challenge.id,
        message:
          "If verification can be delivered, a code will arrive shortly.",
      },
    };
  }
  async function verify(id: string, code: string) {
    available();
    const grant = randomBytes(32).toString("hex");
    const valid = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ReviewChallenge" WHERE id=${id}::uuid FOR UPDATE`;
      const c = await tx.reviewChallenge.findUnique({ where: { id } });
      if (
        !c ||
        c.usedAt ||
        c.grantHash ||
        c.expiresAt <= new Date() ||
        c.attempts >= 5
      )
        return false;
      const ok = timingSafeEqual(
        Buffer.from(c.codeHash, "hex"),
        Buffer.from(digest(`${c.subjectKey}:${code}`), "hex"),
      );
      await tx.reviewChallenge.update({
        where: { id },
        data: {
          attempts: { increment: 1 },
          ...(ok
            ? {
                grantHash: digest(`grant:${grant}`),
                expiresAt: new Date(Date.now() + 600000),
              }
            : {}),
        },
      });
      return ok;
    });
    if (!valid) throw fail();
    return { data: { grant } };
  }
  async function submit(
    input: z.infer<typeof reviewSubmitSchema>,
    productSlug?: string,
  ) {
    available();
    return db.$transaction(async (tx) => {
      const grantHash = digest(`grant:${input.grant}`);
      const c = await tx.reviewChallenge.findUnique({ where: { grantHash } });
      if (!c) throw fail();
      await tx.$queryRaw`SELECT id FROM "ReviewChallenge" WHERE id=${c.id}::uuid FOR UPDATE`;
      const locked = await tx.reviewChallenge.findUniqueOrThrow({
        where: { id: c.id },
      });
      const submissionHash = digest(JSON.stringify({ input, productSlug }));
      if (locked.usedAt) {
        if (
          locked.submissionHash === submissionHash &&
          locked.submittedReviewId
        )
          return {
            data: {
              id: locked.submittedReviewId,
              status: "PENDING",
              message: "Submitted for review.",
            },
          };
        throw fail();
      }
      if (locked.expiresAt <= new Date()) throw fail();
      const productId = c.subjectKey.startsWith("PRODUCT:")
        ? c.subjectKey.slice(8)
        : null;
      if (productId) {
        if (input.rating === null)
          throw new AdminError(
            "RATING_REQUIRED",
            "Choose a product rating.",
            422,
          );
        if (
          !(await tx.product.count({
            where: {
              id: productId,
              slug: productSlug,
              active: true,
              category: { active: true },
            },
          }))
        )
          throw fail();
      } else if (productSlug) throw fail();
      const purchase = await tx.orderItem.findFirst({
        where: {
          ...(productId ? { productId } : {}),
          order: {
            customerEmail: c.email,
            accepted: true,
            OR: [
              { paymentMethod: "ONLINE", paymentStatus: "PAID" },
              { paymentMethod: "COD", operationalStatus: "COMPLETED" },
            ],
          },
        },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      const data = {
        kind: productId ? "PRODUCT" : "STORE",
        subjectKey: c.subjectKey,
        productId,
        emailKey: c.emailKey,
        email: c.email,
        displayName: input.displayName,
        title: input.title,
        text: input.text,
        rating: input.rating,
        status: "PENDING",
        orderItemId: purchase?.id ?? null,
        verifiedPurchase: !!purchase,
        consentAt: new Date(),
        consentVersion: "2026-11-22",
        publishedAt: null,
        moderatedBy: null,
        moderationReason: "",
      };
      const result = await tx.customerReview.upsert({
        where: {
          emailKey_subjectKey: {
            emailKey: c.emailKey,
            subjectKey: c.subjectKey,
          },
        },
        create: data,
        update: data,
      });
      await tx.reviewChallenge.update({
        where: { id: c.id },
        data: {
          usedAt: new Date(),
          submissionHash,
          submittedReviewId: result.id,
        },
      });
      return {
        data: {
          id: result.id,
          status: "PENDING",
          message:
            "Submitted for review. Your feedback will appear after moderation.",
        },
      };
    });
  }
  async function list(
    query: z.infer<typeof reviewQuerySchema>,
    productSlug?: string,
  ) {
    const where: Prisma.CustomerReviewWhereInput = {
      status: "PUBLISHED",
      ...(productSlug
        ? {
            kind: "PRODUCT",
            product: {
              slug: productSlug,
              active: true,
              category: { active: true },
            },
          }
        : {
            kind: query.kind ?? "STORE",
            ...(query.kind === "PRODUCT"
              ? { product: { active: true, category: { active: true } } }
              : {}),
          }),
      ...(query.ids ? { id: { in: query.ids } } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
    };
    const base = { ...where, rating: undefined };
    return db.$transaction(
      async (tx) => {
        const [items, total, ratings] = await Promise.all([
          tx.customerReview.findMany({
            where,
            include,
            orderBy:
              query.sort === "newest"
                ? [{ publishedAt: "desc" }, { id: "desc" }]
                : [
                    {
                      rating: {
                        sort: query.sort === "highest" ? "desc" : "asc",
                        nulls: "last",
                      },
                    },
                    { id: "desc" },
                  ],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
          }),
          tx.customerReview.count({ where }),
          tx.customerReview.groupBy({
            by: ["rating"],
            where: base,
            _count: { _all: true },
          }),
        ]);
        const distribution = [1, 2, 3, 4, 5].map(
            (n) => ratings.find((r) => r.rating === n)?._count._all ?? 0,
          ),
          count = distribution.reduce((a, b) => a + b, 0);
        return {
          data: {
            items: items.map(publicReview),
            total,
            page: query.page,
            totalPages: Math.ceil(total / query.limit),
            summary: {
              count,
              average: count
                ? distribution.reduce((n, v, i) => n + v * (i + 1), 0) / count
                : null,
              distribution,
            },
          },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  async function adminList(query: z.infer<typeof reviewQuerySchema>) {
    const where = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      db.customerReview.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      }),
      db.customerReview.count({ where }),
    ]);
    return {
      data: {
        items: items.map((r) => ({
          ...publicReview(r),
          status: r.status,
          reason: r.moderationReason,
        })),
        total,
        page: query.page,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async function moderate(
    id: string,
    status: string,
    reason: string,
    adminId: string,
  ) {
    const result = await db.customerReview.updateMany({
      where: { id },
      data: {
        status,
        moderationReason: reason,
        moderatedBy: adminId,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });
    if (!result.count)
      throw new AdminError("NOT_FOUND", "Review not found.", 404);
    return { data: { ok: true } };
  }
  async function stories(admin = false, page = 1, limit = 12) {
    const items = await db.customerStory.findMany({
      where: admin
        ? {}
        : {
            published: true,
            OR: [{ reviewId: null }, { review: { status: "PUBLISHED" } }],
          },
      include: { image: true, review: { include } },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      take: admin ? 100 : limit,
      skip: admin ? 0 : (page - 1) * limit,
    });
    const products = await db.product.findMany({
      where: {
        id: { in: [...new Set(items.flatMap((s) => s.productIds))] },
        active: true,
        category: { active: true },
      },
      select: { id: true, name: true, slug: true },
    });
    return {
      ...(!admin
        ? {
            pagination: {
              page,
              limit,
              total: await db.customerStory.count({
                where: {
                  published: true,
                  OR: [{ reviewId: null }, { review: { status: "PUBLISHED" } }],
                },
              }),
            },
          }
        : {}),
      data: items.map((s) => ({
        id: s.id,
        title: s.title,
        caption: s.caption,
        displayName: s.displayName,
        image: s.image ? `/images/uploads/${s.image.id}.webp` : null,
        alt: s.alt,
        productIds: s.productIds,
        products: s.productIds.flatMap((id) =>
          products
            .filter((p) => p.id === id)
            .map(({ name, slug }) => ({ name, slug })),
        ),
        review: s.review ? publicReview(s.review) : null,
        ...(admin
          ? {
              reviewId: s.reviewId,
              imageAssetId: s.imageAssetId,
              consentEvidence: s.consentEvidence,
              consentAt: s.consentAt.toISOString(),
              position: s.position,
              published: s.published,
            }
          : {}),
      })),
    };
  }
  async function saveStory(
    input: z.infer<typeof customerStoryInputSchema>,
    adminId: string,
    id?: string,
  ) {
    return db.$transaction(async (tx) => {
      if (input.imageAssetId) {
        await tx.$queryRaw`SELECT id FROM "ImageAsset" WHERE id=${input.imageAssetId}::uuid FOR UPDATE`;
        if (!(await tx.imageAsset.count({ where: { id: input.imageAssetId } })))
          throw new AdminError(
            "INVALID_IMAGE",
            "Upload the customer image first.",
          );
      }
      if (
        input.reviewId &&
        !(await tx.customerReview.count({
          where: {
            id: input.reviewId,
            ...(input.published ? { status: "PUBLISHED" } : {}),
          },
        }))
      )
        throw new AdminError(
          "INVALID_REVIEW",
          "Choose an approved review before publishing.",
        );
      if (
        (await tx.product.count({
          where: { id: { in: input.productIds } },
        })) !== input.productIds.length
      )
        throw new AdminError(
          "INVALID_PRODUCT",
          "A referenced product does not exist.",
        );
      const data = {
        ...input,
        consentAt: new Date(input.consentAt),
        updatedBy: adminId,
      };
      return {
        data: id
          ? await tx.customerStory.update({ where: { id }, data })
          : await tx.customerStory.create({ data }),
      };
    });
  }
  return {
    request,
    verify,
    submit,
    list,
    adminList,
    moderate,
    stories,
    saveStory,
  };
}
