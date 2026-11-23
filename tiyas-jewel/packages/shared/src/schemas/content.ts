import { z } from "zod";
import { slugSchema } from "./catalog.js";
import { contentImagePaths } from "../content-assets.js";
import { publicMediaManifestSchema } from "./public-media.js";

/** Only storefront paths. No protocols, escapes, admin/API routes or script URLs. */
export const storefrontHrefSchema = z
  .string()
  .trim()
  .max(300)
  .refine(
    (v) =>
      /^(?:\/(?:shop|collections|products|info|journal)(?:[/?#][a-zA-Z0-9/?=&_#.-]*)?|\/(?:cart|wishlist|happy-customers)?(?:#[a-z0-9-]+)?)$/.test(
        v,
      ) && !v.includes(".."),
    "Use a storefront link such as /collections/silver-replica",
  );
export const contentImageSchema = z
  .string()
  .max(240)
  .refine(
    (v) =>
      v === "" ||
      /^\/images\/uploads\/[a-f0-9-]{36}\.webp$/.test(v) ||
      (contentImagePaths as readonly string[]).includes(v),
    "Choose a local campaign image or upload an image",
  );
const text = z.string().trim().max(300);
export const contentItemSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(80),
    title: text,
    subtitle: text.default(""),
    description: z.string().trim().max(2000).default(""),
    eyebrow: text.default(""),
    image: contentImageSchema.default(""),
    mobileImage: contentImageSchema.default(""),
    alt: text.default(""),
    href: storefrontHrefSchema.default("/shop"),
    buttonText: text.default("Explore collection"),
    enabled: z.boolean().default(true),
    collection: slugSchema.optional(),
  })
  .strict();
export const contentSectionKinds = [
  "hero",
  "categories",
  "collections",
  "arrivals",
  "campaign",
  "occasions",
  "types",
  "showcases",
  "promotion",
  "trust",
  "story",
  "newsletter",
  "reviews",
  "reels",
] as const;
export const contentSectionSchema = contentItemSchema
  .extend({
    kind: z.enum(contentSectionKinds),
    recordIds: z.array(z.string().min(1).max(120)).max(24).default([]),
    items: z.array(contentItemSchema).max(24).default([]),
  })
  .strict();
export const homepageContentSchema = z
  .object({
    sections: z.array(contentSectionSchema).min(1).max(25),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.sections.filter((s) => s.enabled && s.kind === "hero").length > 1)
      ctx.addIssue({
        code: "custom",
        message: "Use one enabled hero carousel",
        path: ["sections"],
      });
    if (new Set(v.sections.map((s) => s.id)).size !== v.sections.length)
      ctx.addIssue({
        code: "custom",
        message: "Section identifiers must be unique",
        path: ["sections"],
      });
    for (const [i, s] of v.sections.entries()) {
      for (const [n, item] of [s, ...s.items].entries())
        if (item.image && !item.alt.trim())
          ctx.addIssue({
            code: "custom",
            message: "Add an image description",
            path: ["sections", i, ...(n ? ["items", n - 1] : []), "alt"],
          });
      if (new Set(s.items.map((item) => item.id)).size !== s.items.length)
        ctx.addIssue({
          code: "custom",
          message: "Item identifiers must be unique",
          path: ["sections", i, "items"],
        });
      if (
        s.enabled &&
        s.kind === "hero" &&
        !s.items.some(
          (item) => item.enabled && item.image && item.title && item.alt,
        )
      )
        ctx.addIssue({
          code: "custom",
          message:
            "An enabled hero needs an image, title and image description",
          path: ["sections", i, "items"],
        });
    }
  });
export const menuLinkSchema = z
  .object({
    label: z.string().trim().min(1).max(70),
    href: storefrontHrefSchema,
  })
  .strict();
export const navigationContentSchema = z
  .object({
    mobile: z.array(menuLinkSchema).max(30),
    footer: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(60),
            links: z.array(menuLinkSchema).max(15),
          })
          .strict(),
      )
      .max(6),
  })
  .strict();
export const staticPageContentSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(300),
    body: z.string().trim().min(1).max(20000),
    image: contentImageSchema.default(""),
    alt: text.default(""),
  })
  .strict();
export const contentValueSchema = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("homepage"), content: homepageContentSchema })
    .strict(),
  z
    .object({ type: z.literal("navigation"), content: navigationContentSchema })
    .strict(),
  z
    .object({ type: z.literal("page"), content: staticPageContentSchema })
    .strict(),
]);
export const contentKeySchema = z
  .string()
  .regex(/^(?:homepage|navigation|page-[a-z0-9]+(?:-[a-z0-9]+)*)$/)
  .max(130);
export const contentSaveSchema = z
  .object({ version: z.number().int().min(0), value: contentValueSchema })
  .strict();
export const contentPublishSchema = contentSaveSchema
  .extend({ published: z.boolean() })
  .strict();
export const contentDocumentSchema = z.object({
  key: contentKeySchema,
  version: z.number().int(),
  draft: contentValueSchema,
  published: contentValueSchema.nullable(),
  publishedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
});
export const contentDocumentResponseSchema = z.object({
  data: contentDocumentSchema.nullable(),
});
export const contentDocumentsResponseSchema = z.object({
  data: z.array(
    contentDocumentSchema.omit({ draft: true, published: true }).extend({
      title: z.string(),
      type: z.enum(["homepage", "navigation", "page"]),
    }),
  ),
});
export const publicContentResponseSchema = z.object({
  data: contentValueSchema.nullable(),
  media: z.record(z.string().regex(/^\/images\/uploads\/[a-f0-9-]{36}\.webp$/), publicMediaManifestSchema).optional(),
});
export type ContentValue = z.infer<typeof contentValueSchema>;
export type ContentSection = z.infer<typeof contentSectionSchema>;
export type ContentItem = z.infer<typeof contentItemSchema>;
export type ContentDocument = z.infer<typeof contentDocumentSchema>;
export type HomepageContent = z.infer<typeof homepageContentSchema>;
export type NavigationContent = z.infer<typeof navigationContentSchema>;
