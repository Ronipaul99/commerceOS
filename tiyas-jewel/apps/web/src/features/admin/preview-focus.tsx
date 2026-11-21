"use client";
import { useEffect } from "react";
export function PreviewFocus({ sectionId }: { sectionId: string }) {
  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      const section = document.getElementById(`preview-section-${sectionId}`);
      if (section) {
        window.scrollTo({
          top: Math.max(
            0,
            window.scrollY + section.getBoundingClientRect().top - 180,
          ),
          behavior: "instant",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sectionId]);
  return null;
}
