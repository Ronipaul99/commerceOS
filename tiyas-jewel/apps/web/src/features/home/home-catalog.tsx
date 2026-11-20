import { cache } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@tiyas/shared";
import { serverApi } from "@/lib/api-server";
import { presentProduct } from "@/lib/catalog-presentation";
import { campaignCollections, showcaseSlugs } from "@/lib/homepage-config";
import { ProductCard } from "@/components/storefront/product-card";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { ProductRail } from "./product-rail";
const readCatalog = cache(async () => {
  const api = serverApi();
  const results = await Promise.allSettled([
    api.catalog({ sort: "newest", limit: "6" }),
    ...showcaseSlugs.map((collection) =>
      api.catalog({ collection, sort: "newest", limit: "3" }),
    ),
  ]);
  const newest = results[0];
  return {
    newest: newest?.status === "fulfilled" ? newest.value.data : [],
    groups: showcaseSlugs.map((_, index) => {
      const r = results[index + 1];
      return r?.status === "fulfilled" ? r.value.data : [];
    }),
    unavailable: newest?.status !== "fulfilled",
  };
});
function ProductCards({ products }: { products: Product[] }) {
  return products.map((p) => (
    <ProductCard key={p.id} product={presentProduct(p)} variant="campaign" />
  ));
}
export function HomeProductSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="tj-product-skeleton"
      role="status"
      aria-label="Loading current jewellery"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <span />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}
export async function NewArrivals() {
  const { newest, unavailable } = await readCatalog();
  if (!newest.length)
    return (
      <div className="tj-catalog-message" role="status">
        <p>
          {unavailable
            ? "Our current edit could not be loaded. Please try the shop again shortly."
            : "New pieces are on their way."}
        </p>
        <Link href="/shop">
          Explore all jewellery <ArrowRight size={16} />
        </Link>
      </div>
    );
  return (
    <>
      <ProductRail label="New arrivals">
        <ProductCards products={newest} />
      </ProductRail>
      {newest.some((p) => p.images.some((i) => i.concept)) && (
        <p className="tj-image-disclosure">
          Development catalog &middot; Concept product images are marked
          individually.
        </p>
      )}
    </>
  );
}
export async function CollectionShowcases() {
  const { newest, groups } = await readCatalog();
  return (
    <div className="tj-showcases tj-shell">
      {showcaseSlugs.map((slug, index) => {
        const c = campaignCollections.find((c) => c.slug === slug)!;
        const assigned = groups[index] ?? [];
        const products = assigned.length
          ? assigned
          : [...newest.slice(index % 2 ? 3 : 0), ...newest].slice(0, 3);
        return (
          <section
            key={slug}
            className={`tj-showcase ${index % 2 ? "tj-showcase-reverse" : ""}`}
            aria-labelledby={`showcase-${slug}`}
          >
            <Link
              className={`tj-showcase-banner tj-banner-${slug}`}
              href={`/collections/${slug}`}
              data-reveal
            >
              <ResponsiveImage
                src={c.image}
                alt={`Concept campaign for ${c.name}`}
                sizes="(max-width: 767px) 100vw, 48vw"
              />
              <div className="tj-banner-shade" />
              <div className="tj-showcase-copy">
                <p className="tj-eyebrow">{c.label}</p>
                <h2 id={`showcase-${slug}`}>{c.name}</h2>
                <p>{c.description}</p>
                <span className="tj-button tj-button-cream">
                  Shop {c.name}
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
            <div className="tj-showcase-products" data-reveal>
              <h3>
                {assigned.length ? `Discover ${c.name}` : "More from Tiyas"}
              </h3>
              {!assigned.length && (
                <p className="tj-curation-note">
                  This collection is on its way. Explore our current edit.
                </p>
              )}
              {products.length ? (
                <ProductRail label={`${c.name} supporting products`}>
                  <ProductCards products={products} />
                </ProductRail>
              ) : (
                <div className="tj-catalog-message">
                  <p>The current edit is taking a moment to load.</p>
                  <Link href="/shop">Browse the shop</Link>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
