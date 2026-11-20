import "dotenv/config";
import { defineConfig } from "prisma/config";

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Empty URL lets generate/validate run without credentials; connection commands still fail clearly.
  datasource: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "" },
});
