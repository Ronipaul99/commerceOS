"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@tiyas/shared";
import { api } from "@/lib/api-client";
import { presentProduct } from "@/lib/catalog-presentation";
import { ProductCard } from "@/components/storefront/product-card";
import { useStorefront } from "@/components/storefront/storefront-provider";
export function WishlistPage() {
  const { wishlistRefs, hydrated, removeSaved, storageWarning } =
    useStorefront();
  const [attempt, setAttempt] = useState(0);
  const key = wishlistRefs.map((item) => item.productId).join(",");
  const [result, setResult] = useState<{
    key: string;
    products: Product[];
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (!hydrated || !key) return;
    const abort = new AbortController();
    api
      .catalog({ ids: key, limit: "50" }, abort.signal)
      .then((response) =>
        setResult({ key, products: response.data, error: false }),
      )
      .catch(() => {
        if (!abort.signal.aborted)
          setResult({ key, products: [], error: true });
      });
    return () => abort.abort();
  }, [key, hydrated, attempt]);
  const loading = !hydrated || (Boolean(key) && result?.key !== key);
  const products = result?.key === key ? result.products : [];
  const missing = wishlistRefs.filter(
    (item) => !products.some((product) => product.id === item.productId),
  );
  return (
    <div className="shell shopping-page">
      <p className="eyebrow">Your personal collection</p>
      <h1>Your saved edit.</h1>
      <p className="shopping-intro">
        The pieces that caught your eye. Keep them close.
      </p>
      {storageWarning ? (
        <p className="shopping-warning">{storageWarning}</p>
      ) : null}
      {loading ? (
        <p className="shopping-loading" role="status">
          Finding your favourites...
        </p>
      ) : !key ? (
        <div className="shopping-empty">
          <h2>A place for your favourites.</h2>
          <p>Tap the heart on a piece you love to save it here.</p>
          <Link className="button button-primary" href="/shop">
            Explore the collection
          </Link>
        </div>
      ) : result?.error ? (
        <div role="alert">
          <p>
            We could not load your saved pieces. Your wishlist has been kept.
          </p>
          <button
            className="action"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {missing.length ? (
            <div className="shopping-warning">
              <p>
                {missing.length} saved{" "}
                {missing.length === 1 ? "piece is" : "pieces are"} no longer in
                the catalogue.
              </p>
              <button
                className="text-button"
                onClick={() =>
                  missing.forEach((item) => removeSaved(item.productId))
                }
              >
                Remove unavailable saved pieces
              </button>
            </div>
          ) : null}
          <p className="results-count">
            {products.length} saved {products.length === 1 ? "piece" : "pieces"}
          </p>
          <div className="product-grid">
            {wishlistRefs
              .map((ref) =>
                products.find((product) => product.id === ref.productId),
              )
              .filter((product): product is Product => Boolean(product))
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={presentProduct(product)}
                  wishlistMode
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
