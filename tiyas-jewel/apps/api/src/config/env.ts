import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.url().refine((value) => { try { return ["postgres:", "postgresql:"].includes(new URL(value).protocol); } catch { return false; } }),
  CORS_ORIGINS: z.string().default("http://localhost:3000").transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)).pipe(z.array(z.url().refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && url.origin === value;
    } catch { return false; }
  }, "Use an exact HTTP(S) origin without a path or trailing slash"))),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type ApiConfig = z.infer<typeof envSchema>;
export function parseEnv(source: Record<string, string | undefined>): ApiConfig {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Report names only. Zod issue details can contain sensitive input.
    throw new Error(`Invalid API environment: ${[...new Set(result.error.issues.map((issue) => issue.path.join(".")))].join(", ")}`);
  }
  return result.data;
}
