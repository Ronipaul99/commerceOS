"use client";
import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Pause,
  Play,
} from "lucide-react";
import { heroAutoplayIntervalMs, heroSlides } from "@/lib/homepage-config";
import {
  ArtDirectedImage,
  warmCampaignImage,
  useMediaManifest,
} from "@/components/ui/responsive-image";

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export type HeroSlide = {
  title: string;
  secondLine: string;
  eyebrow: string;
  description: string;
  cta: string;
  href: string;
  image: string;
  mobileImage: string;
  alt?: string;
};
export function HeroCarousel({
  slides = heroSlides,
}: {
  slides?: readonly HeroSlide[];
}) {
  const heroSlides = slides;
  const manifest = useMediaManifest();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLElement>(null);
  const pausedBeforePointer = useRef(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const pageVisible = useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => false,
  );
  const rotating =
    !paused && !hovered && inView && pageVisible && !reducedMotion;
  const touch = useRef<number | null>(null);
  const move = (delta: number) => {
    setActive(
      (index) => (index + delta + heroSlides.length) % heroSlides.length,
    );
  };
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setInView(!!entry?.isIntersecting && entry.intersectionRatio >= 0.15),
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!rotating || heroSlides.length < 2) return;
    const warm = window.setTimeout(
      () => {
        const next = heroSlides[(active + 1) % heroSlides.length];
        if (next) warmCampaignImage(next.image, next.mobileImage, manifest);
      },
      Math.max(0, heroAutoplayIntervalMs - 1200),
    );
    const timer = window.setTimeout(
      () => setActive((index) => (index + 1) % heroSlides.length),
      heroAutoplayIntervalMs,
    );
    return () => {
      window.clearTimeout(warm);
      window.clearTimeout(timer);
    };
  }, [active, rotating, heroSlides, manifest]);
  const slide = heroSlides[active]!;
  return (
    <section
      ref={root}
      className="tj-hero"
      aria-label="Festive collections"
      aria-roledescription="carousel"
      onPointerOver={(event) => {
        setHovered(
          event.pointerType === "mouse" &&
            !!(event.target as HTMLElement).closest("button, a"),
        );
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if ((event.target as HTMLElement).matches(":focus-visible"))
          setPaused(true);
      }}
      onTouchStart={(e) => {
        touch.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const end = e.changedTouches[0]?.clientX;
        if (
          touch.current !== null &&
          end !== undefined &&
          Math.abs(end - touch.current) > 60
        )
          move(end < touch.current ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="tj-hero-dots" role="group" aria-label="Campaign controls">
        <button
          type="button"
          className="tj-hero-autoplay"
          aria-label={
            reducedMotion
              ? "Campaign autoplay disabled for reduced motion"
              : paused
                ? "Start campaign autoplay"
                : "Pause campaign autoplay"
          }
          disabled={reducedMotion}
          onPointerDown={() => {
            pausedBeforePointer.current = paused;
          }}
          onClick={(event) => {
            // Focus stops rotation before a pointer click; preserve the action the user chose.
            if (event.detail > 0) setPaused(!pausedBeforePointer.current);
            else setPaused((value) => !value);
          }}
        >
          {paused || reducedMotion ? (
            <Play size={14} aria-hidden="true" />
          ) : (
            <Pause size={14} aria-hidden="true" />
          )}
        </button>
        {heroSlides.map((slide, index) => (
          <button
            key={slide.title}
            aria-label={`Show ${slide.eyebrow}`}
            aria-pressed={active === index}
            onClick={() => setActive(index)}
          >
            <span />
          </button>
        ))}
      </div>
      <div
        key={slide.title}
        className="tj-hero-slide is-active"
        role="group"
        aria-roledescription="slide"
        aria-label={`${active + 1} of ${heroSlides.length}`}
      >
        <div className="tj-hero-image">
          <ArtDirectedImage
            desktop={slide.image}
            mobile={slide.mobileImage}
            alt={
              slide.alt ??
              (active === 0
                ? "Concept campaign: traditional Kundan necklace and earrings on burgundy silk with flowers and warm festive lights"
                : `Concept campaign for ${slide.eyebrow}`)
            }
            priority={active === 0}
          />
        </div>
        <div className="tj-hero-shade" />
        <div className="tj-shell tj-hero-inner">
          <div className="tj-hero-copy">
            <p className="tj-eyebrow">{slide.eyebrow}</p>
            <h1>
              {slide.title}
              <br />
              <em>{slide.secondLine}</em>
            </h1>
            <p className="tj-hero-description">{slide.description}</p>
            <Link className="tj-button tj-button-cream" href={slide.href}>
              {slide.cta}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <button
        className="tj-carousel-arrow tj-hero-prev"
        aria-label="Previous campaign"
        onClick={() => move(-1)}
      >
        <ChevronLeft size={22} aria-hidden="true" />
      </button>
      <button
        className="tj-carousel-arrow tj-hero-next"
        aria-label="Next campaign"
        onClick={() => move(1)}
      >
        <ChevronRight size={22} aria-hidden="true" />
      </button>
      <span
        className="sr-only"
        role="status"
        aria-live={rotating ? "off" : "polite"}
      >
        Campaign {active + 1} of {heroSlides.length}: {slide.title}{" "}
        {slide.secondLine}
      </span>
    </section>
  );
}
