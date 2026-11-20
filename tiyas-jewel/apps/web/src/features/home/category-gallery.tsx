"use client";
import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { categories } from "@/lib/storefront-config";
import { ResponsiveImage } from "@/components/ui/responsive-image";
export function CategoryCard({
  category,
}: {
  category: (typeof categories)[number];
}) {
  return (
    <Link className="category-card" href={`/shop/${category.slug}`}>
      <div className="category-image">
        <ResponsiveImage
          src={category.image}
          alt={`${category.name} concept jewellery on warm stone`}
          sizes="(max-width: 599px) 45vw, 22vw"
        />
      </div>
      <h3>{category.name}</h3>
      <span>
        Explore <ArrowRight size={15} aria-hidden="true" />
      </span>
    </Link>
  );
}
export function CategoryGallery() {
  const ref = useRef<HTMLDivElement>(null);
  function move(direction: number) {
    ref.current?.scrollBy({
      left: direction * 200,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <div className="category-gallery">
      <div
        ref={ref}
        className="category-track"
        aria-label="Shop by form gallery"
      >
        {categories.map((category) => (
          <CategoryCard key={category.slug} category={category} />
        ))}
      </div>
      <div className="gallery-controls">
        <button
          className="icon-button"
          aria-label="Previous categories"
          onClick={() => move(-1)}
        >
          <ArrowLeft size={19} />
        </button>
        <button
          className="icon-button"
          aria-label="Next categories"
          onClick={() => move(1)}
        >
          <ArrowRight size={19} />
        </button>
      </div>
    </div>
  );
}
