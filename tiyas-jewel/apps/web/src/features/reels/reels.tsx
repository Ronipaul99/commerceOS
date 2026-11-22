"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Instagram } from "lucide-react";
import { type PublicReel, type Product } from "@tiyas/shared";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Modal } from "@/components/ui/modal";
import { ProductCard } from "@/components/storefront/product-card";
import { presentProduct } from "@/lib/catalog-presentation";
import { api } from "@/lib/api-client";
export function ReelGallery({
  items,
  title,
  description,
}: {
  items: PublicReel[];
  title: string;
  description: string;
}) {
  const [active, setActive] = useState<PublicReel | null>(null),
    [products, setProducts] = useState<Product[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    Promise.all(
      active.productSlugs.map((slug) =>
        api
          .product(slug)
          .then((r) => r.data)
          .catch(() => null),
      ),
    ).then((rows) => {
      if (alive) setProducts(rows.filter((p): p is Product => p !== null));
    });
    return () => {
      alive = false;
      setProducts([]);
    };
  }, [active]);
  if (!items.length) return null;
  return (
    <section
      className="tj-shell tj-home-section experience-reels"
      aria-label={title}
    >
      <div className="experience-section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="experience-rail-controls">
          <button
            aria-label="Previous reels"
            onClick={() =>
              rail.current?.scrollBy({
                left: -320,
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              })
            }
          >
            ←
          </button>
          <button
            aria-label="Next reels"
            onClick={() =>
              rail.current?.scrollBy({
                left: 320,
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              })
            }
          >
            →
          </button>
        </div>
      </div>
      <div className="experience-reel-rail" ref={rail}>
        {items.map((r) => (
          <button
            key={r.id}
            className="experience-reel-card"
            onClick={() => {
              setActive(r);
            }}
            aria-label={`Shop the reel: ${r.title}`}
          >
            <ResponsiveImage
              src={r.poster}
              alt={r.title}
              sizes="(max-width:767px) 60vw,240px"
            />
            <span className="experience-play">
              <Instagram size={18} aria-hidden="true" /> Watch & shop
            </span>
            <strong>{r.title}</strong>
          </button>
        ))}
      </div>
      {active && (
        <Modal title={active.title} onClose={() => setActive(null)}>
          <div className="experience-reel-details">
            <a
              className="experience-instagram-link"
              href={active.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={18} aria-hidden="true" />
              Watch on Instagram
              <ExternalLink size={15} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p>{active.caption}</p>
            {active.transcript && (
              <details>
                <summary>Read transcript / captions</summary>
                <p>{active.transcript}</p>
              </details>
            )}
            <h3>Shop this look</h3>
            {products.length ? (
              <div className="experience-tagged-products">
                {products.map((p) => (
                  <ProductCard key={p.id} product={presentProduct(p)} />
                ))}
              </div>
            ) : (
              <p>
                Products in this look are being updated. Explore the shop for
                current availability.
              </p>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
