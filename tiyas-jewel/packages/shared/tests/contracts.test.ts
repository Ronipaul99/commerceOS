import { describe, it, expect } from "vitest";
import { paginationQuerySchema, slugSchema, moneyPaiseSchema } from "../src/index.js";
describe("public input contracts", () => {
  it("defaults and bounds pagination", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 12 });
    expect(paginationQuerySchema.parse({ page: "2", limit: "5" })).toEqual({ page: 2, limit: 5 });
    for (const input of [{ page: "0" }, { limit: "51" }, { limit: "2.5" }, { admin: "true" }, { page: ["1", "2"] }]) expect(paginationQuerySchema.safeParse(input).success).toBe(false);
  });
  it("accepts only integer paise in PostgreSQL Int range", () => {
    expect(moneyPaiseSchema.parse(199900)).toBe(199900);
    for (const value of [-1, 1.5, 2147483648, NaN]) expect(moneyPaiseSchema.safeParse(value).success).toBe(false);
  });
  it("rejects unsafe and malformed slugs", () => {
    expect(slugSchema.parse("petal-stud-earrings")).toBe("petal-stud-earrings");
    for (const value of ["../admin", "Ring", "ring--gold", "ring?active=false"]) expect(slugSchema.safeParse(value).success).toBe(false);
  });
});
