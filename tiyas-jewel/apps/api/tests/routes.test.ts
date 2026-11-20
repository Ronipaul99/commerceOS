import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import type { FastifyInstance } from "fastify";
const config = parseEnv({ DATABASE_URL: "postgresql://test@localhost/test" });
const apps: FastifyInstance[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
async function appFor(db: object) {
  const app = await buildApp(config, { db: db as PrismaClient, logger: false });
  apps.push(app);
  return app;
}
describe("HTTP foundation", () => {
  it("checks database readiness and returns no connection details on failure", async () => {
    const probe = vi
      .fn()
      .mockResolvedValueOnce([{ value: 1 }])
      .mockRejectedValueOnce(new Error("password=secret"));
    const app = await appFor({ $queryRaw: probe });
    expect((await app.inject("/api/health")).json()).toEqual({
      status: "ok",
      database: "up",
    });
    const failure = await app.inject("/api/health");
    expect(failure.statusCode).toBe(503);
    expect(failure.json()).toEqual({ status: "unavailable", database: "down" });
  });
  it("rejects invalid queries and slugs before querying the database", async () => {
    const app = await appFor({});
    for (const url of [
      "/api/v1/products?page=0",
      "/api/v1/products?limit=51",
      "/api/v1/products?active=false",
      "/api/v1/products/INVALID",
    ]) {
      const response = await app.inject(url);
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
      expect(response.json().error.requestId).toEqual(expect.any(String));
    }
  });
  it("returns a stable 404 and has no public mutation routes", async () => {
    const app = await appFor({
      product: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    expect((await app.inject("/api/v1/products/unknown")).statusCode).toBe(404);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const)
      expect(
        (await app.inject({ method, url: "/api/v1/products" })).statusCode,
      ).toBe(404);
    expect((await app.inject("/api/v1/admin")).statusCode).toBe(404);
  });
  it("sets security headers and allows only configured CORS origins", async () => {
    const app = await appFor({ $queryRaw: vi.fn().mockResolvedValue([]) });
    const response = await app.inject({
      url: "/api/health",
      headers: { origin: "http://localhost:3000" },
    });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(
      (
        await app.inject({
          url: "/api/health",
          headers: { origin: "https://untrusted.example" },
        })
      ).headers["access-control-allow-origin"],
    ).toBeUndefined();
  });
  it("sanitizes unexpected failures", async () => {
    const app = await appFor({
      category: {
        findMany: vi
          .fn()
          .mockRejectedValue(new Error("postgresql://secret:password@db")),
      },
    });
    const response = await app.inject("/api/v1/categories");
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe("INTERNAL_ERROR");
    expect(response.body).not.toContain("password");
  });
});
