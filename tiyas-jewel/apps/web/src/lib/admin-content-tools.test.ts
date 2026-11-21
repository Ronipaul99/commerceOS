import { describe, it, expect } from "vitest";
import { contentSectionKinds, contentSectionSchema } from "@tiyas/shared";
import { buildImagePrompt, imagePromptProfile } from "./admin-image-prompt";
import { previewSections } from "./content-preview";
describe("image preparation prompts", () => {
  it.each(["product", "page", ...contentSectionKinds] as const)(
    "has upload-safe dimensions and truthful image instructions for %s",
    (kind) => {
      const profile = imagePromptProfile(kind);
      expect(Math.max(profile.width, profile.height)).toBeLessThanOrEqual(2400);
      expect(Math.min(profile.width, profile.height)).toBeGreaterThanOrEqual(
        200,
      );
      const prompt = buildImagePrompt(kind, "Silver necklace");
      expect(prompt).toContain("Silver necklace");
      expect(prompt).toContain("compressed WebP");
      expect(prompt).toContain("Preserve the exact product");
      expect(prompt).toContain("If this tool cannot export WebP");
    },
  );
  it("gives mobile hero its actual art-directed ratio and safe text area", () => {
    expect(imagePromptProfile("hero", true)).toMatchObject({
      width: 900,
      height: 1125,
      ratio: "4:5",
    });
    expect(buildImagePrompt("hero", "Kundan", true)).toContain("lower 40%");
    expect(buildImagePrompt("hero", "Kundan")).toContain("left 45%");
  });
});
describe("section previews in page context", () => {
  const sections = ["a", "b", "c", "d", "e"].map((id) =>
    contentSectionSchema.parse({
      id,
      kind: "campaign",
      title: id,
      enabled: id !== "b",
    }),
  );
  it("renders a whole selected section and its nearest visible neighbours", () =>
    expect(previewSections({ sections }, "c")?.map((s) => s.id)).toEqual([
      "a",
      "c",
      "d",
    ]));
  it("allows viewing a hidden draft section without including other hidden sections", () =>
    expect(previewSections({ sections }, "b")?.map((s) => s.id)).toEqual([
      "a",
      "b",
      "c",
    ]));
  it("handles first/last sections and unknown identifiers", () => {
    expect(previewSections({ sections }, "a")?.map((s) => s.id)).toEqual([
      "a",
      "c",
    ]);
    expect(previewSections({ sections }, "e")?.map((s) => s.id)).toEqual([
      "d",
      "e",
    ]);
    expect(previewSections({ sections }, "missing")).toBeNull();
    expect(previewSections({ sections })?.map((s) => s.id)).toEqual([
      "a",
      "c",
      "d",
      "e",
    ]);
  });
});
