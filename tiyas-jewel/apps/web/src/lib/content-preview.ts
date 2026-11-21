import type { HomepageContent } from "@tiyas/shared";
/** Preserve live section order and whole sections, with one visible neighbour per side. */
export function previewSections(content: HomepageContent, selectedId?: string) {
  const sections = content.sections.filter(
    (s) => s.enabled || s.id === selectedId,
  );
  if (!selectedId) return sections;
  const index = sections.findIndex((s) => s.id === selectedId);
  return index < 0 ? null : sections.slice(Math.max(0, index - 1), index + 2);
}
