import { it, expect } from "vitest";
import { contentSectionSchema } from "@tiyas/shared";
import { withExperienceSections } from "./experience-content";
it("composes defaults before the newsletter without changing existing CMS records", () => {
  const original = {
    sections: [
      contentSectionSchema.parse({
        id: "story",
        kind: "story",
        title: "Our story",
      }),
      contentSectionSchema.parse({
        id: "newsletter",
        kind: "newsletter",
        title: "Updates",
      }),
    ],
  };
  const result = withExperienceSections(original);
  expect(result.sections.map((s) => s.kind)).toEqual([
    "story",
    "reels",
    "reviews",
    "newsletter",
  ]);
  expect(original.sections).toHaveLength(2);
});
it("respects explicit disabled customer-experience sections", () => {
  const original = {
    sections: [
      contentSectionSchema.parse({
        id: "reels",
        kind: "reels",
        title: "Reels",
        enabled: false,
      }),
      contentSectionSchema.parse({
        id: "reviews",
        kind: "reviews",
        title: "Reviews",
        enabled: false,
      }),
    ],
  };
  expect(withExperienceSections(original)).toBe(original);
});
