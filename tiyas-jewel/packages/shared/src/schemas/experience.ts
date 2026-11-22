import { z } from "zod";

const plain = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),
      "Control characters are not allowed",
    );
export const reviewContextSchema = z
  .object({
    kind: z.enum(["PRODUCT", "STORE"]),
    productId: z.string().min(1).max(120).optional(),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  })
  .strict()
  .refine(
    (v) => (v.kind === "STORE" ? !v.productId : !!v.productId),
    "Choose a valid review subject",
  );
export const reviewVerifySchema = z
  .object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
  .strict();
export const reviewSubmitSchema = z
  .object({
    grant: z.string().regex(/^[a-f0-9]{64}$/),
    displayName: plain(2, 80),
    title: plain(0, 120).default(""),
    text: plain(20, 3000),
    rating: z.number().int().min(1).max(5).nullable(),
    consent: z.literal(true),
  })
  .strict();
export const reviewQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(8),
    sort: z.enum(["newest", "highest", "lowest"]).default("newest"),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    kind: z.enum(["PRODUCT", "STORE"]).optional(),
    status: z.enum(["PENDING", "PUBLISHED", "REJECTED"]).optional(),
    ids: z
      .string()
      .max(3000)
      .transform((v) => v.split(",").filter(Boolean))
      .pipe(z.array(z.string().min(1).max(120)).max(24))
      .optional(),
  })
  .strict();
export const publicReviewSchema = z.object({
  id: z.string(),
  kind: z.enum(["PRODUCT", "STORE"]),
  displayName: z.string(),
  title: z.string(),
  text: z.string(),
  rating: z.number().nullable(),
  verifiedPurchase: z.boolean(),
  createdAt: z.string(),
  productSlug: z.string().nullable(),
  productName: z.string().nullable(),
});
export const reviewListSchema = z.object({
  data: z.object({
    items: z.array(publicReviewSchema),
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
    summary: z.object({
      count: z.number(),
      average: z.number().nullable(),
      distribution: z.array(z.number()).length(5),
    }),
  }),
});
export type PublicReview = z.infer<typeof publicReviewSchema>;
export const moderationSchema = z
  .object({
    status: z.enum(["PUBLISHED", "REJECTED", "PENDING"]),
    reason: plain(0, 500).default(""),
  })
  .strict();
export const customerStoryInputSchema = z
  .object({
    title: plain(1, 160),
    caption: plain(1, 2000),
    displayName: plain(2, 80),
    reviewId: z.string().nullable().default(null),
    imageAssetId: z.uuid().nullable().default(null),
    alt: plain(0, 300).default(""),
    productIds: z.array(z.string()).max(8).default([]),
    consentEvidence: plain(10, 2000),
    consentAt: z.iso.datetime(),
    published: z.boolean().default(false),
    position: z.number().int().min(0).max(10000).default(0),
  })
  .strict()
  .refine((v) => !v.imageAssetId || !!v.alt, "Describe the customer image");
export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,32}$/, "Enter a valid coupon code");
const money = z.number().int().min(0).max(100000000);
export const couponInputSchema = z
  .object({
    code: couponCodeSchema,
    description: plain(0, 300).default(""),
    type: z.enum(["FIXED", "PERCENT"]),
    value: z.number().int().min(1).max(100000000),
    minimumPaise: money.default(0),
    maximumDiscountPaise: money.positive().nullable().default(null),
    usageLimit: z.number().int().min(1).max(1000000).nullable().default(null),
    perCustomerLimit: z
      .number()
      .int()
      .min(1)
      .max(1000000)
      .nullable()
      .default(null),
    productIds: z.array(z.string()).max(100).default([]),
    categoryIds: z.array(z.string()).max(100).default([]),
    collectionIds: z.array(z.string()).max(100).default([]),
    paymentMethods: z
      .array(z.enum(["ONLINE", "COD"]))
      .min(1)
      .max(2)
      .default(["ONLINE", "COD"]),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    active: z.boolean().default(false),
    archived: z.boolean().default(false),
    version: z.number().int().min(1).optional(),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.type === "PERCENT" && v.value > 10000)
      c.addIssue({
        code: "custom",
        path: ["value"],
        message: "Percentage cannot exceed 100%",
      });
    if (v.startsAt >= v.endsAt)
      c.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must follow start",
      });
  });
export type CouponInput = z.infer<typeof couponInputSchema>;
export const instagramReelUrlSchema = z
  .string()
  .trim()
  .max(500)
  .transform((value, ctx) => {
    const match =
      /^https:\/\/(?:www\.)?instagram\.com\/reel\/([A-Za-z0-9_-]{1,64})\/?(?:\?[^#\s]*)?$/i.exec(
        value,
      );
    if (!match) {
      ctx.addIssue({
        code: "custom",
        message:
          "Enter an HTTPS Instagram Reel link, such as https://www.instagram.com/reel/SHORTCODE/.",
      });
      return z.NEVER;
    }
    return `https://www.instagram.com/reel/${match[1]}/`;
  });
export const reelInputSchema = z
  .object({
    title: plain(1, 160),
    caption: plain(0, 2000).default(""),
    transcript: plain(0, 5000).default(""),
    posterId: z.uuid(),
    instagramUrl: instagramReelUrlSchema,
    productIds: z.array(z.string().min(1)).max(8).default([]),
    published: z.boolean().default(false),
    rightsConfirmed: z.boolean().default(false),
    position: z.number().int().min(0).max(10000).default(0),
    version: z.number().int().min(1).optional(),
  })
  .strict()
  .refine(
    (v) => !v.published || v.rightsConfirmed,
    "Confirm publication rights before publishing",
  )
  .refine(
    (v) => !v.published || v.transcript.length >= 20,
    "Add a transcript or visual description before publishing.",
  )
  .refine(
    (v) => !v.published || v.productIds.length > 0,
    "Tag at least one product before publishing a shoppable reel.",
  );
export const experienceSettingsSchema = z.object({
  data: z.object({
    reviews: z.boolean(),
    homepageReviews: z.boolean(),
    coupons: z.boolean(),
    reels: z.boolean(),
  }),
});
export const couponRecordSchema = couponInputSchema
  .safeExtend({
    id: z.string(),
    version: z.number().int(),
    reserved: z.number().optional(),
    redeemed: z.number().optional(),
  })
  .strip();
export const couponListSchema = z.object({ data: z.array(couponRecordSchema) });
export const couponResponseSchema = z.object({ data: couponRecordSchema });
export const adminReviewsSchema = z.object({
  data: z.object({
    items: z.array(
      publicReviewSchema.extend({ status: z.string(), reason: z.string() }),
    ),
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
  }),
});
export const storySchema = z.object({
  id: z.string(),
  title: z.string(),
  caption: z.string(),
  displayName: z.string(),
  image: z.string().nullable(),
  alt: z.string(),
  productIds: z.array(z.string()),
  products: z
    .array(z.object({ name: z.string(), slug: z.string() }))
    .default([]),
  review: publicReviewSchema.nullable(),
});
export const storiesResponseSchema = z.object({
  data: z.array(storySchema),
  pagination: z
    .object({ page: z.number(), limit: z.number(), total: z.number() })
    .optional(),
});
export const adminStoriesSchema = z.object({
  data: z.array(
    storySchema.extend({
      reviewId: z.string().nullable(),
      imageAssetId: z.string().nullable(),
      consentEvidence: z.string(),
      consentAt: z.string(),
      position: z.number(),
      published: z.boolean(),
    }),
  ),
});
export const publicReelSchema = z.object({
  id: z.string(),
  title: z.string(),
  caption: z.string(),
  transcript: z.string(),
  poster: z.string(),
  instagramUrl: instagramReelUrlSchema,
  productSlugs: z.array(z.string()),
});
export const reelsResponseSchema = z.object({
  data: z.array(publicReelSchema),
});
export const adminReelsSchema = z.object({
  data: z.array(
    publicReelSchema.extend({
      posterId: z.string(),
      productIds: z.array(z.string()),
      position: z.number(),
      rightsConfirmed: z.boolean(),
      published: z.boolean(),
      version: z.number(),
    }),
  ),
});
export type PublicReel = z.infer<typeof publicReelSchema>;
