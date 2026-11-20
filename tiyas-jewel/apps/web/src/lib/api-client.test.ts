import { describe, expect, it, vi } from "vitest";
import { createApiClient, ApiClientError } from "./api-client";
import { formatINR } from "./money";
describe("storefront API boundary", () => {
  it("uses same-origin versioned URLs and validates response contracts", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
        }),
      ),
    );
    expect((await createApiClient("", fetcher).products(2, 5)).data).toEqual(
      [],
    );
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/v1/products?page=2&limit=5");
  });
  it("sanitizes server errors and preserves correlation IDs", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "internal text",
            requestId: "req-1",
          },
        }),
        { status: 404 },
      ),
    );
    await expect(
      createApiClient("", fetcher).product("missing"),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      requestId: "req-1",
    });
    expect(new ApiClientError(500, "INTERNAL_ERROR").message).not.toContain(
      "internal text",
    );
  });
  it("rejects malformed success responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"data":"invalid"}'));
    await expect(createApiClient("", fetcher).categories()).rejects.toThrow();
  });
  it("formats integer INR paise and rejects fractional paise", () => {
    expect(formatINR(245050)).toBe("\u20b92,450.50");
    expect(() => formatINR(1.5)).toThrow();
  });
  it("returns a safe typed error when a proxy responds with HTML", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("<html>Internal proxy details</html>", { status: 502 }),
      );
    await expect(
      createApiClient("", fetcher).categories(),
    ).rejects.toMatchObject({ status: 502, code: "INVALID_RESPONSE" });
  });
});
