import { expect, it, vi } from "vitest";
import { parseEnv } from "../src/config/env.js";
import { cloudflarePurge } from "../src/modules/media/cdn-purge.js";

const config = parseEnv({
  DATABASE_URL: "postgresql://test@127.0.0.1/isolated",
  CDN_PROVIDER: "cloudflare",
  CDN_ZONE_ID: "a".repeat(32),
  CDN_PURGE_API_TOKEN: "test-only-purge-fixture",
  CDN_PUBLIC_HOSTS: "tiyas.example,www.tiyas.example",
  CDN_PURGE_BATCH_SIZE: "1",
});
const path = `/media/public/abbbdfbf-f46b-4385-8e3f-abdeab1c2345/${"a".repeat(64)}/320.webp`;

it("purges canonical exact HTTPS URLs only, batching within the configured limit", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json({ success: true }));
  await cloudflarePurge(config, request)([path]);
  expect(request).toHaveBeenCalledTimes(2);
  expect(
    request.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).files),
  ).toEqual([
    [`https://tiyas.example${path}`],
    [`https://www.tiyas.example${path}`],
  ]);
  expect(request.mock.calls[0]?.[0]).toBe(
    `https://api.cloudflare.com/client/v4/zones/${config.CDN_ZONE_ID}/purge_cache`,
  );
  await expect(
    cloudflarePurge(config, request)([`${path}?key=invalid`]),
  ).rejects.toMatchObject({ code: "invalid_path" });
  expect(request).toHaveBeenCalledTimes(2);
});

it("preserves Retry-After and rejects a negative provider acknowledgement", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(null, { status: 429, headers: { "Retry-After": "90" } }),
    )
    .mockResolvedValueOnce(Response.json({ success: false }));
  const purge = cloudflarePurge(config, request);
  await expect(purge([path])).rejects.toMatchObject({
    code: "rate_limit",
    delayMs: 90000,
  });
  await expect(purge([path])).rejects.toMatchObject({
    code: "provider_rejected",
  });
});

it("requires a configured single-zone purge provider before allowing positive cache headers", () => {
  expect(() =>
    parseEnv({
      DATABASE_URL: config.DATABASE_URL,
      PUBLIC_MEDIA_CACHE_ENABLED: "true",
    }),
  ).toThrow(/PUBLIC_MEDIA_CACHE_ENABLED/);
  expect(() =>
    parseEnv({ DATABASE_URL: config.DATABASE_URL, CDN_PROVIDER: "cloudflare" }),
  ).toThrow(/CDN_PROVIDER/);
  expect(() =>
    parseEnv({
      DATABASE_URL: config.DATABASE_URL,
      API_TRUSTED_PROXY_IP: "10.0.0.0/8",
    }),
  ).toThrow(/API_TRUSTED_PROXY_IP/);
});
