import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { ApiConfig } from "../config/env.js";
import { AdminError } from "../modules/admin/errors.js";
export interface ImageStorage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
export function imageStorage(config: ApiConfig): ImageStorage {
  if (config.STORAGE_ADAPTER === "oci") {
    const client = new S3Client({
      endpoint: config.OCI_S3_ENDPOINT!,
      region: config.OCI_REGION!,
      forcePathStyle: true,
      maxAttempts: 2,
      credentials: {
        accessKeyId: config.OCI_ACCESS_KEY_ID!,
        secretAccessKey: config.OCI_SECRET_ACCESS_KEY!,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    return {
      async put(Key, Body) {
        await client.send(
          new PutObjectCommand({
            Bucket: config.OCI_BUCKET!,
            Key,
            Body,
            ContentType: "image/webp",
            ContentLength: Body.length,
          }),
          { abortSignal: AbortSignal.timeout(15000) },
        );
      },
      async get(Key) {
        const result = await client.send(
          new GetObjectCommand({ Bucket: config.OCI_BUCKET!, Key }),
          { abortSignal: AbortSignal.timeout(15000) },
        );
        if (!result.Body) throw Error("Missing image");
        if ((result.ContentLength ?? 0) > 5 * 1024 * 1024)
          throw Error("Image exceeds storage limit");
        return Buffer.from(await result.Body.transformToByteArray());
      },
      async remove(Key) {
        await client.send(
          new DeleteObjectCommand({ Bucket: config.OCI_BUCKET!, Key }),
          { abortSignal: AbortSignal.timeout(15000) },
        );
      },
    };
  }
  const root = path.resolve(
    fileURLToPath(new URL("../../../../", import.meta.url)),
    config.STORAGE_LOCAL_DIR,
  );
  function filename(key: string) {
    if (!/^products\/[a-f0-9-]{36}(?:\/\d{2,4})?\.webp$/.test(key))
      throw Error("Unsafe object key");
    return path.join(root, key);
  }
  return {
    async put(key, data) {
      const target = filename(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data, { flag: "wx", mode: 0o600 });
    },
    async get(key) {
      return readFile(filename(key));
    },
    async remove(key) {
      await unlink(filename(key)).catch((e: NodeJS.ErrnoException) => {
        if (e.code !== "ENOENT") throw e;
      });
    },
  };
}
export async function validateImage(input: Buffer) {
  if (input.length > 5 * 1024 * 1024)
    throw new AdminError(
      "IMAGE_TOO_LARGE",
      "Images must be 5 MB or smaller.",
      413,
    );
  const jpeg =
    input.length >= 3 &&
    input[0] === 0xff &&
    input[1] === 0xd8 &&
    input[2] === 0xff;
  const png = input
    .subarray(0, 8)
    .equals(Buffer.from("89504e470d0a1a0a", "hex"));
  const webp =
    input.subarray(0, 4).toString("ascii") === "RIFF" &&
    input.subarray(8, 12).toString("ascii") === "WEBP";
  if (!jpeg && !png && !webp)
    throw new AdminError("INVALID_IMAGE", "Choose a JPEG, PNG or WebP image.");
  try {
    const image = sharp(input, {
      limitInputPixels: 24000000,
      failOn: "warning",
      animated: true,
    });
    const meta = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
      (meta.pages ?? 1) !== 1 ||
      !meta.width ||
      !meta.height ||
      Math.min(meta.width, meta.height) < 200 ||
      Math.max(meta.width, meta.height) > 6000
    )
      throw new AdminError(
        "INVALID_IMAGE",
        "Use a static JPEG, PNG or WebP, 200–6000 px per side (up to 24 MP).",
      );
    const { data, info } = await image
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    if (Math.min(info.width, info.height) < 200)
      throw new AdminError(
        "INVALID_IMAGE",
        "Choose an image with a less extreme aspect ratio.",
      );
    if (data.length > 5 * 1024 * 1024)
      throw new AdminError(
        "IMAGE_TOO_LARGE",
        "The optimized image exceeds 5 MB.",
        413,
      );
    return { data, width: info.width, height: info.height, bytes: data.length };
  } catch (e) {
    if (e instanceof AdminError) throw e;
    throw new AdminError(
      "INVALID_IMAGE",
      "The file is not a valid supported image.",
    );
  }
}
