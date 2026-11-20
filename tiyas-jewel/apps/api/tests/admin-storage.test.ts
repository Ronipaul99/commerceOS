import { describe, it, expect, vi, afterEach } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { imageStorage } from "../src/integrations/image-storage.js";
import { parseEnv } from "../src/config/env.js";
import { adminProductInputSchema } from "@tiyas/shared";
afterEach(() => vi.restoreAllMocks());
describe("Admin storage boundary", () => {
  it("round-trips local bytes and rejects unsafe paths", async () => {
    const storage = imageStorage(
      parseEnv({
        DATABASE_URL: "postgresql://local:test@localhost/test",
        STORAGE_LOCAL_DIR: `output/verification/storage-unit-${randomUUID()}`,
      }),
    );
    const key = `products/${randomUUID()}.webp`,
      buffer = randomBytes(20);
    await storage.put(key, buffer);
    expect(await storage.get(key)).toEqual(buffer);
    await storage.remove(key);
    await expect(storage.get(key)).rejects.toThrow();
    await expect(storage.put("../../unsafe", buffer)).rejects.toThrow(
      "Unsafe object key",
    );
  });
  it("uses OCI-compatible object commands without public ACLs or browser credentials", async () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    send
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({
        Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) },
      } as never)
      .mockResolvedValueOnce({} as never);
    const storage = imageStorage(
      parseEnv({
        DATABASE_URL: "postgresql://local:test@localhost/test",
        STORAGE_ADAPTER: "oci",
        OCI_S3_ENDPOINT:
          "https://example.compat.objectstorage.ap-mumbai-1.oraclecloud.com",
        OCI_REGION: "ap-mumbai-1",
        OCI_BUCKET: "jewellery-images",
        OCI_ACCESS_KEY_ID: randomBytes(16).toString("hex"),
        OCI_SECRET_ACCESS_KEY: randomBytes(24).toString("hex"),
      }),
    );
    const key = `products/${randomUUID()}.webp`;
    await storage.put(key, Buffer.from([1, 2, 3]));
    expect(await storage.get(key)).toEqual(Buffer.from([1, 2, 3]));
    await storage.remove(key);
    expect(send.mock.calls[0]![0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[1]![0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[2]![0]).toBeInstanceOf(DeleteObjectCommand);
    const put = send.mock.calls[0]![0] as PutObjectCommand;
    expect(put.input).toMatchObject({
      Bucket: "jewellery-images",
      Key: key,
      ContentType: "image/webp",
      ContentLength: 3,
    });
    expect(put.input.ACL).toBeUndefined();
  });
  it("rejects incomplete OCI configuration without revealing secrets", () => {
    const secret = randomBytes(24).toString("hex");
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgresql://local:test@localhost/test",
        STORAGE_ADAPTER: "oci",
        OCI_SECRET_ACCESS_KEY: secret,
      }),
    ).toThrow("STORAGE_ADAPTER");
    try {
      parseEnv({
        DATABASE_URL: "postgresql://local:test@localhost/test",
        STORAGE_ADAPTER: "oci",
        OCI_SECRET_ACCESS_KEY: secret,
      });
    } catch (e) {
      expect(String(e)).not.toContain(secret);
    }
  });
});
describe("Admin contract validation", () => {
  const base = {
    name: "Jewellery",
    slug: "jewellery",
    description: "Product description",
    categoryId: "category",
    collectionIds: [],
    pricePaise: 10000,
    compareAtPaise: null,
    sku: "sku",
    stockQuantity: 1,
    active: true,
    featured: false,
    images: [],
    variants: [],
  };
  it("rejects client image URLs, fractional money and duplicate variant IDs", () => {
    expect(
      adminProductInputSchema.safeParse({
        ...base,
        images: [{ url: "https://foreign.example/image.jpg", alt: "Image" }],
      }).success,
    ).toBe(false);
    expect(
      adminProductInputSchema.safeParse({ ...base, pricePaise: 100.5 }).success,
    ).toBe(false);
    const variant = {
      id: "same",
      version: new Date().toISOString(),
      name: "Gold",
      sku: "variant-a",
      pricePaise: null,
      stockQuantity: 1,
      active: true,
      imageRef: null,
    };
    expect(
      adminProductInputSchema.safeParse({
        ...base,
        variants: [variant, { ...variant, sku: "variant-b" }],
      }).success,
    ).toBe(false);
  });
});
