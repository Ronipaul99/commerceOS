"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function ProductRail({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  const [edges, setEdges] = useState({ start: true, end: false });
  const pageSize = useRef({ count: 1, step: 0, total: 0 });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const wrapper = el.parentElement!;
    const updateEdges = () =>
      setEdges({
        start: el.scrollLeft <= 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 3,
      });
    const update = () => {
      const cards = [...el.children].filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          child.classList.contains("tj-product-card"),
      );
      if (cards[0]) {
        const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
        const cardWidth = cards[0].offsetWidth;
        const count = Math.min(
          cards.length,
          Math.max(
            1,
            Math.floor((wrapper.clientWidth + gap) / (cardWidth + gap)),
          ),
        );
        const value = `${count * cardWidth + (count - 1) * gap}px`;
        if (wrapper.style.getPropertyValue("--rail-page-width") !== value)
          wrapper.style.setProperty("--rail-page-width", value);
        pageSize.current = {
          count,
          step: cardWidth + gap,
          total: cards.length,
        };
        const index = Math.min(
          cards.length - count,
          Math.max(0, Math.round(el.scrollLeft / (cardWidth + gap))),
        );
        const left = index * (cardWidth + gap);
        if (Math.abs(el.scrollLeft - left) > 1)
          el.scrollTo({ left, behavior: "instant" });
      }
      updateEdges();
    };
    update();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    observer.observe(wrapper);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, [children]);
  function move(delta: number) {
    const el = track.current;
    if (el) {
      const { count, step, total } = pageSize.current;
      const index = step ? Math.round(el.scrollLeft / step) : 0;
      el.scrollTo({
        left: step
          ? Math.min(total - count, Math.max(0, index + delta * count)) * step
          : el.scrollLeft + delta * el.clientWidth,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }
  return (
    <div className={`tj-rail-wrap ${className}`}>
      <div
        className="tj-product-rail"
        id={id}
        ref={track}
        role="group"
        aria-label={label}
        tabIndex={0}
        onFocusCapture={(event) => {
          const el = event.currentTarget;
          const card = (event.target as HTMLElement).closest<HTMLElement>(
            ".tj-product-card",
          );
          const first = el.querySelector<HTMLElement>(
            ":scope > .tj-product-card",
          );
          if (!card || !first || card.parentElement !== el) return;
          const left = card.offsetLeft - first.offsetLeft;
          if (
            left >= el.scrollLeft - 1 &&
            left + card.offsetWidth <= el.scrollLeft + el.clientWidth + 1
          )
            return;
          const { count, step, total } = pageSize.current;
          if (!step) return;
          const index = Math.round(left / step);
          el.scrollTo({
            left:
              Math.min(total - count, Math.floor(index / count) * count) * step,
            behavior: "instant",
          });
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {children}
      </div>
      <div className="tj-rail-controls" hidden={edges.start && edges.end}>
        <button
          className="tj-carousel-arrow"
          aria-label={`Previous ${label.toLowerCase()}`}
          aria-controls={id}
          disabled={edges.start}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={19} aria-hidden="true" />
        </button>
        <button
          className="tj-carousel-arrow"
          aria-label={`Next ${label.toLowerCase()}`}
          aria-controls={id}
          disabled={edges.end}
          onClick={() => move(1)}
        >
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
