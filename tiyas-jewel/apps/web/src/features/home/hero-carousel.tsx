"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { heroSlides } from "@/lib/homepage-config";
import { ArtDirectedImage } from "@/components/ui/responsive-image";
export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const touch = useRef<number | null>(null);
  const move = (delta: number) =>
    setActive(
      (index) => (index + delta + heroSlides.length) % heroSlides.length,
    );
  const slide = heroSlides[active]!;
  return (
    <section
      className="tj-hero"
      aria-label="Festive collections"
      aria-roledescription="carousel"
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
              active === 0
                ? "Concept campaign: traditional Kundan necklace and earrings on burgundy silk with flowers and warm festive lights"
                : `Concept campaign for ${slide.eyebrow}`
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
      <div className="tj-hero-dots" aria-label="Choose a campaign">
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
      <span className="sr-only" role="status" aria-live="polite">
        Campaign {active + 1} of {heroSlides.length}: {slide.title}{" "}
        {slide.secondLine}
      </span>
    </section>
  );
}
