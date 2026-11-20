import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3200", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node apps/api/dist/server.js",
      url: "http://127.0.0.1:4100/api/health",
      timeout: 60000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
        API_HOST: "127.0.0.1",
        API_PORT: "4100",
        NODE_ENV: "test",
        CORS_ORIGINS: "http://127.0.0.1:3200",
        LOG_LEVEL: "warn",
      },
    },
    {
      command: "npm run start -w @tiyas/web -- --port 3200",
      url: "http://127.0.0.1:3200",
      reuseExistingServer: false,
      timeout: 120000,
      env: { API_INTERNAL_URL: "http://127.0.0.1:4100" },
    },
  ],
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 834, height: 1024 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
