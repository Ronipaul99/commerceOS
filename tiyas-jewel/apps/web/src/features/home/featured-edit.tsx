"use client";
import { ProductCard } from "@/components/storefront/product-card";
import { useStorefront } from "@/components/storefront/storefront-provider";
export function FeaturedEdit() {
  const { products, catalogState } = useStorefront();
  return (
    <>
      <p className="catalog-disclosure" role="status">
        {catalogState === "api"
          ? "The featured edit"
          : catalogState === "loading"
            ? "Loading catalogue - showing the preview edit"
            : "Sample edit - catalogue currently unavailable"}
        . Concept images are illustrative; actual product photography is
        pending.
      </p>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
