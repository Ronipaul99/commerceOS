import { describe, it, expect, vi } from "vitest";
import {
  createAdminActivityStore,
  adminRequestLabel,
} from "./admin-activity-store";
import { adminActivity } from "./admin-activity-store";
import { adminRequest } from "./admin-client";
import { z } from "zod";
describe("admin pending operations", () => {
  it("keeps progress visible until all overlapping requests settle, including out-of-order completion", () => {
    const store = createAdminActivityStore(),
      listener = vi.fn(),
      unsubscribe = store.subscribe(listener);
    const endSave = store.start("Saving…"),
      endUpload = store.start("Uploading…");
    expect(store.getSnapshot()).toBe("Uploading…");
    endUpload();
    expect(store.getSnapshot()).toBe("Saving…");
    const endRefresh = store.start("Refreshing…");
    endSave();
    expect(store.getSnapshot()).toBe("Refreshing…");
    endRefresh();
    expect(store.getSnapshot()).toBe("");
    const count = listener.mock.calls.length;
    endRefresh();
    expect(listener).toHaveBeenCalledTimes(count);
    unsubscribe();
    store.start("Detached");
    expect(listener).toHaveBeenCalledTimes(count);
  });
  it("provides meaningful labels without displaying private paths or customer identifiers", () => {
    expect(adminRequestLabel("/images", "POST")).toContain("Uploading");
    expect(adminRequestLabel("/orders/private-id/complete", "POST")).toContain(
      "Completing",
    );
    expect(adminRequestLabel("/products/private-id", "DELETE")).toBe(
      "Removing item…",
    );
    expect(adminRequestLabel("/login", "POST")).toBe("Signing in…");
  });
});
it.each(["network", "http", "contract"])(
  "releases request progress after a %s failure",
  async (failure) => {
    vi.stubGlobal("window", {});
    let reject!: (error: Error) => void;
    const promise = new Promise<Response>((_, fail) => {
      reject = fail;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        failure === "network"
          ? promise
          : Promise.resolve(
              new Response(
                JSON.stringify(
                  failure === "http"
                    ? { error: { message: "Rejected" } }
                    : { wrong: true },
                ),
                { status: failure === "http" ? 503 : 200 },
              ),
            ),
      ),
    );
    try {
      const request = adminRequest("/products", z.object({ data: z.string() }));
      expect(adminActivity.getSnapshot()).not.toBe("");
      if (failure === "network") reject(Error("Network unavailable"));
      await expect(request).rejects.toThrow();
      expect(adminActivity.getSnapshot()).toBe("");
    } finally {
      vi.unstubAllGlobals();
    }
  },
);
