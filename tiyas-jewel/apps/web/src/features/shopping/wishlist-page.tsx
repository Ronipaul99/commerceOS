"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Heart,
  ShoppingBag,
  Bookmark,
  Gem,
} from "lucide-react";
import type { Product } from "@tiyas/shared";
import { api } from "@/lib/api-client";
import { presentProduct } from "@/lib/catalog-presentation";
import { ProductCard } from "@/components/storefront/product-card";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { ResponsiveImage } from "@/components/ui/responsive-image";
export function WishlistPage() {
  const { wishlistRefs, cartRefs, hydrated, removeSaved, storageWarning } =
    useStorefront();
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState("saved");
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
  const ordered = wishlistRefs
    .map((ref) => products.find((product) => product.id === ref.productId))
    .filter((product): product is Product => Boolean(product));
  if (sort === "price-low") ordered.sort((a, b) => a.pricePaise - b.pricePaise);
  if (sort === "price-high")
    ordered.sort((a, b) => b.pricePaise - a.pricePaise);
  const bagCount = cartRefs.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div className="purchase-page wishlist-page">
      <div className="purchase-shell wishlist-shell">
        <nav className="wishlist-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">Favourites</span>
        </nav>
        <header className="wishlist-heading">
          <span className="wishlist-heading-icon">
            <Heart size={29} strokeWidth={1.3} aria-hidden="true" />
          </span>
          <p className="tj-eyebrow">Your personal collection</p>
          <h1>
            My Favourites <span>({hydrated ? wishlistRefs.length : 0})</span>
          </h1>
          <p>The pieces that caught your eye. Keep them close.</p>
          <Link className="wishlist-continue" href="/shop">
            <ArrowLeft size={15} aria-hidden="true" /> Continue shopping
          </Link>
        </header>
        {storageWarning ? (
          <p className="shopping-warning" role="status">
            {storageWarning}
          </p>
        ) : null}
        {loading ? (
          <div className="wishlist-panel" aria-busy="true">
            <p className="wishlist-loading-label" role="status">
              Finding your favourites...
            </p>
            <div className="wishlist-grid" aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="wishlist-skeleton" key={index}>
                  <div />
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          </div>
        ) : !key ? (
          <div className="wishlist-empty">
            <div className="wishlist-empty-copy">
              <span className="wishlist-empty-icon">
                <Heart size={36} strokeWidth={1.15} aria-hidden="true" />
              </span>
              <p className="tj-eyebrow">A little space for something lovely</p>
              <h2>A place for your favourites.</h2>
              <p>Tap the heart on a piece you love to save it here.</p>
              <Link className="purchase-button" href="/shop">
                Explore the collection{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <span className="wishlist-device-note">
                <Bookmark size={14} aria-hidden="true" /> Your favourites stay
                saved on this device.
              </span>
            </div>
            <div className="wishlist-empty-image">
              <ResponsiveImage
                src="/images/campaign/tyohar.webp"
                alt="Concept campaign: Kundan jewellery on burgundy silk"
                sizes="(max-width: 767px) 90vw, 550px"
                position="77% 50%"
              />
              <span>
                Jewellery for every side of you.
                <small>Campaign inspiration</small>
              </span>
            </div>
          </div>
        ) : result?.error ? (
          <div className="wishlist-message" role="alert">
            <Heart size={30} strokeWidth={1.3} aria-hidden="true" />
            <h2>Your favourites are still here.</h2>
            <p>
              We could not load your saved pieces. Your wishlist has been kept.
            </p>
            <button
              className="purchase-button"
              onClick={() => {
                setResult(null);
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          <section
            className="wishlist-panel"
            aria-labelledby="wishlist-selection-title"
          >
            <div className="wishlist-toolbar">
              <div>
                <h2 id="wishlist-selection-title">
                  <Heart size={18} aria-hidden="true" /> Your saved edit
                </h2>
                <p className="results-count" role="status">
                  {products.length} saved{" "}
                  {products.length === 1 ? "piece" : "pieces"}
                  <span aria-hidden="true"> · </span>Chosen by you.
                </p>
              </div>
              <div className="wishlist-toolbar-actions">
                <label className="wishlist-sort">
                  Sort by
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    aria-label="Sort favourites"
                  >
                    <option value="saved">Saved order</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                  </select>
                </label>
                <Link className="wishlist-bag-link" href="/cart">
                  <ShoppingBag size={17} aria-hidden="true" /> View bag{" "}
                  {hydrated && bagCount > 0 ? `(${bagCount})` : ""}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
            {missing.length ? (
              <div
                className="shopping-warning wishlist-unavailable"
                role="status"
              >
                <p>
                  {missing.length} saved{" "}
                  {missing.length === 1 ? "piece is" : "pieces are"} no longer
                  in the catalogue.
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
            <div className="product-grid wishlist-grid">
              {ordered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={presentProduct(product)}
                  wishlistMode
                />
              ))}
            </div>
            <p className="wishlist-selection-note">
              <Bookmark size={15} aria-hidden="true" /> Saved on this device.
              Prices and availability are checked when you add a piece to your
              bag.
            </p>
          </section>
        )}
        <aside className="wishlist-discover" aria-label="Keep exploring">
          <div className="wishlist-discover-title">
            <Gem size={27} strokeWidth={1.2} aria-hidden="true" />
            <div>
              <h2>Find your next favourite.</h2>
              <p>
                A new detail. A different mood. An edit that feels like you.
              </p>
            </div>
          </div>
          <div>
            <Link href="/shop?sort=newest">
              Discover new arrivals <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/collections">
              Explore all collections{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
