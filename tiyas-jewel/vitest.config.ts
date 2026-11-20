import { defineConfig } from "vitest/config";
export default defineConfig({ test: {
  include: ["apps/api/tests/**/*.test.ts", "packages/shared/tests/**/*.test.ts", "apps/web/src/lib/**/*.test.ts"],
  exclude: ["**/*.integration.test.ts"],
} });
