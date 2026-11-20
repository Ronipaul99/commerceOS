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
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () =>
      setEdges({
        start: el.scrollLeft <= 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 3,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);
  function move(delta: number) {
    const el = track.current;
    if (el)
      el.scrollBy({
        left: delta * el.clientWidth * 0.88,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
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
      >
        {children}
      </div>
      <div className="tj-rail-controls">
        <button
          className="tj-carousel-arrow"
          aria-label={`Previous ${label.toLowerCase()}`}
          aria-controls={id}
          disabled={edges.start}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          className="tj-carousel-arrow"
          aria-label={`Next ${label.toLowerCase()}`}
          aria-controls={id}
          disabled={edges.end}
          onClick={() => move(1)}
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </div>
  );
}
