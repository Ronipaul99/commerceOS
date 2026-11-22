import { z } from "zod";

export const renditionWidths = [160, 320, 480, 640, 960, 1440, 1920] as const;
export const publicMediaRoute = "/media/public/:id/:version/:file";
const files = [...renditionWidths.map(String), "master"].join("|");
export const publicMediaPath = new RegExp(
  `^/media/public/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/[a-f0-9]{64}/(?:${files})\\.webp$`,
);
export const publicMediaManifestSchema = z
  .array(
    z.object({
      src: z.string().regex(publicMediaPath),
      width: z.number().int().positive().max(2400),
      height: z.number().int().positive().max(2400),
    }),
  )
  .min(1)
  .max(renditionWidths.length + 1);
export type PublicMediaManifest = z.infer<typeof publicMediaManifestSchema>;
