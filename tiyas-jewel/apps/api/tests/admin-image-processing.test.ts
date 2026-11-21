import { it, expect } from "vitest";
import sharp from "sharp";
import { validateImage } from "../src/integrations/image-storage.js";
it.each(["png", "jpeg", "webp"] as const)(
  "stores validated %s input as compressed metadata-free WebP with the same aspect ratio",
  async (format) => {
    const source = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: "#650F2A" },
    })
      .withMetadata()
      .toFormat(format)
      .toBuffer();
    const output = await validateImage(source),
      meta = await sharp(output.data).metadata();
    expect(meta.format).toBe("webp");
    expect(output.width).toBe(2400);
    expect(output.height).toBe(1200);
    expect(meta.exif).toBeUndefined();
    expect(output.bytes).toBe(output.data.length);
    expect(output.bytes).toBeLessThan(5 * 1024 * 1024);
  },
);
