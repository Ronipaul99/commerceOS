import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
// Read only the upstream from the root file; do not inject database secrets into web env.
const fileEnv = loadEnv({
  path: path.join(projectRoot, ".env"),
  quiet: true,
  processEnv: {},
}).parsed;
const parsed = z
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      );
    } catch {
      return false;
    }
  })
  .safeParse(
    process.env.API_INTERNAL_URL ??
      fileEnv?.API_INTERNAL_URL ??
      "http://127.0.0.1:4000",
  );
if (!parsed.success)
  throw new Error(
    "API_INTERNAL_URL must be an HTTP(S) origin without credentials, path, query or fragment",
  );
const upstream = parsed.data.replace(/\/$/, "");
const sitePublicUrl =
  process.env.SITE_PUBLIC_URL ?? fileEnv?.SITE_PUBLIC_URL ?? "";
if (sitePublicUrl) {
  const site = z.url().safeParse(sitePublicUrl);
  if (
    !site.success ||
    new URL(sitePublicUrl).protocol !== "https:" ||
    new URL(sitePublicUrl).origin !== sitePublicUrl ||
    new URL(sitePublicUrl).hostname.endsWith(".example")
  )
    throw new Error(
      "SITE_PUBLIC_URL must be an actual HTTPS origin without path or trailing slash",
    );
}
const nextConfig: NextConfig = {
  env: { SITE_PUBLIC_URL: sitePublicUrl },
  // Keep review builds separate from an owner's running development preview.
  distDir: process.env.UI_REVIEW_BUILD === "true" ? ".next-ui-review" : ".next",
  // Container builds launch the generated server; host builds use next start.
  output:
    process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${upstream}/api/:path*` },
      { source: "/media/public/:path*", destination: `${upstream}/media/public/:path*` },
      {
        source: "/images/uploads/:path*",
        destination: `${upstream}/images/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default function config(phase: string): NextConfig {
  // Match Next's browser fallback during dev reloads. Keep the production
  // optimizer widths, which are compiled with the production client bundle.
  if (phase === PHASE_DEVELOPMENT_SERVER) return nextConfig;
  return {
    ...nextConfig,
    images: {
      deviceSizes: [320, 480, 640, 960, 1440, 1920, 2400],
      imageSizes: [160],
    },
  };
}
