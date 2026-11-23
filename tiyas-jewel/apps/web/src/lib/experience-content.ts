import {
  contentSectionSchema,
  type HomepageContent,
  type ContentSection,
} from "@tiyas/shared";
/** Add new storefront sections to older CMS documents without rewriting their snapshots. */
export function withExperienceSections(
  content: HomepageContent,
): HomepageContent {
  const present = new Set(content.sections.map((s) => s.kind)),
    ids = new Set(content.sections.map((s) => s.id));
  const extra: ContentSection[] = [];
  for (const kind of ["reels", "reviews"] as const) {
    if (present.has(kind)) continue;
    let id = `auto-${kind}`;
    while (ids.has(id)) id += "-extra";
    ids.add(id);
    extra.push(
      contentSectionSchema.parse({
        id,
        kind,
        title: kind === "reels" ? "Shop Our Reels" : "Our Customers Love Us",
        description:
          kind === "reels"
            ? "Watch & shop the latest saree looks"
            : "Experiences shared in our customers’ own words.",
        href: kind === "reviews" ? "/happy-customers" : "/shop",
      }),
    );
  }
  if (!extra.length && present.has("types")) return content;
  const sections = [...content.sections],
    index = sections.findIndex((s) => s.kind === "newsletter");
  sections.splice(index < 0 ? sections.length : index, 0, ...extra);
  if (!present.has("types")) {
    let id = "auto-types";
    while (ids.has(id)) id += "-extra";
    const occasionIndex = sections.findIndex((s) => s.kind === "occasions");
    const position = occasionIndex < 0 ? sections.length : occasionIndex + 1;
    sections.splice(position, 0, contentSectionSchema.parse({
      id,
      kind: "types",
      title: "Shop by Type",
      href: "/shop",
    }));
  }
  return { ...content, sections };
}
