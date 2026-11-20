"use client";
import { useEffect } from "react";
export function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".festival-home");
    if (!root) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let mutations: MutationObserver | undefined;
    let heroObserver: IntersectionObserver | undefined;
    let frame = 0;
    let heroVisible = false;
    const hero = root.querySelector<HTMLElement>(".tj-hero");
    const scroll = () => {
      if (!heroVisible || frame || media.matches) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (hero) {
          const rect = hero.getBoundingClientRect();
          hero.style.setProperty(
            "--hero-shift",
            `${Math.min(22, Math.max(0, -rect.top * 0.055))}px`,
          );
        }
      });
    };
    const setup = () => {
      observer?.disconnect();
      mutations?.disconnect();
      heroObserver?.disconnect();
      root.classList.remove("motion-ready");
      if (media.matches) return;
      root.classList.add("motion-ready");
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            if (e.isIntersecting) {
              e.target.classList.add("is-revealed");
              observer?.unobserve(e.target);
            }
        },
        { threshold: 0.08, rootMargin: "0px 0px 30px 0px" },
      );
      const observed = new WeakSet<Element>();
      const watch = () =>
        root.querySelectorAll("[data-reveal]").forEach((el) => {
          if (!observed.has(el)) {
            observer?.observe(el);
            observed.add(el);
          }
        });
      watch();
      // Streamed product/showcase HTML can arrive after the first hydration boundary.
      mutations = new MutationObserver(watch);
      mutations.observe(root, { childList: true, subtree: true });
      if (hero) {
        heroObserver = new IntersectionObserver(([entry]) => {
          heroVisible = entry?.isIntersecting ?? false;
        });
        heroObserver.observe(hero);
      }
    };
    setup();
    media.addEventListener("change", setup);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      observer?.disconnect();
      mutations?.disconnect();
      heroObserver?.disconnect();
      cancelAnimationFrame(frame);
      root.classList.remove("motion-ready");
      media.removeEventListener("change", setup);
      window.removeEventListener("scroll", scroll);
    };
  }, []);
  return null;
}
