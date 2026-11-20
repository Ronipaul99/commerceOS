import type { NextConfig } from "next";
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
const nextConfig: NextConfig = {
  // Container builds launch the generated server; host builds use next start.
  output:
    process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${upstream}/api/:path*` },
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
export default nextConfig;
