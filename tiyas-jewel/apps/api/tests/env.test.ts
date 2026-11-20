import { describe, it, expect } from "vitest";
import { parseEnv } from "../src/config/env.js";
const database = "postgresql://user:secret@localhost:5432/tiyas_test";
describe("API environment", () => {
  it("validates the port, database protocol and exact CORS origins", () => {
    expect(parseEnv({ DATABASE_URL: database }).API_PORT).toBe(4000);
    expect(
      parseEnv({
        DATABASE_URL: database,
        CORS_ORIGINS: "http://localhost:3000,https://example.com",
      }).CORS_ORIGINS,
    ).toHaveLength(2);
    for (const input of [
      { DATABASE_URL: "https://example.com" },
      { API_PORT: "0" },
      { CORS_ORIGINS: "*" },
      { CORS_ORIGINS: "https://example.com/path" },
    ])
      expect(() => parseEnv({ DATABASE_URL: database, ...input })).toThrow();
  });
  it("reports invalid variable names without their values", () => {
    expect(() => parseEnv({ DATABASE_URL: "secret-value" })).toThrow(
      "Invalid API environment: DATABASE_URL",
    );
  });
});
