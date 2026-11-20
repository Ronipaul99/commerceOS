import "server-only";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { z } from "zod";
import { createApiClient } from "./api-client";
// Read a single server-only HTTP origin. Never inject the root database environment.
function apiOrigin() {
  const file = loadEnv({
    path: path.resolve(process.cwd(), "../../.env"),
    processEnv: {},
    quiet: true,
  }).parsed;
  const value =
    process.env.API_INTERNAL_URL ??
    file?.API_INTERNAL_URL ??
    "http://127.0.0.1:4000";
  const parsed = z.url().safeParse(value);
  if (!parsed.success) throw new Error("Invalid API_INTERNAL_URL");
  const url = new URL(parsed.data);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid API_INTERNAL_URL");
  return url.origin;
}
export const serverApi = () =>
  createApiClient(apiOrigin(), (input, init) =>
    fetch(input, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(10000),
    }),
  );
