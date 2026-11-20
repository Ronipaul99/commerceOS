"use client";
import Link from "next/link";
import { useState } from "react";
import { Heart, Plus, ShoppingBag, Check } from "lucide-react";
import type { DisplayProduct } from "@/lib/catalog-presentation";
import { formatINR } from "@/lib/money";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useStorefront } from "./storefront-provider";
export function WishlistButton({ product }: { product: DisplayProduct }) {
  const { saved, toggleSaved } = useStorefront();
  const active = saved.includes(product.id);
  return (
    <button
      className={`icon-button wishlist-button ${active ? "is-saved" : ""}`}
      disabled={product.source === "demo"}
      aria-label={`${active ? "Remove" : "Save"} ${product.name}${active ? " from" : " to"} wishlist`}
      aria-pressed={active}
      onClick={() => toggleSaved(product)}
    >
      <Heart
        size={19}
        strokeWidth={1.3}
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}
export function CartButton() {
  const { cartRefs, setPanel } = useStorefront();
  const count = cartRefs.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <button
      className="icon-button cart-button"
      aria-haspopup="dialog"
      aria-label={`Open bag, ${count} items`}
      onClick={() => setPanel("bag")}
    >
      <ShoppingBag size={20} strokeWidth={1.3} />
      {count ? <span className="count">{count}</span> : null}
    </button>
  );
}
export function ProductCard({
  product,
  wishlistMode = false,
  variant = "default",
}: {
  product: DisplayProduct;
  wishlistMode?: boolean;
  variant?: "default" | "campaign";
}) {
  const { addToBag, removeSaved } = useStorefront();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const href =
    product.source === "demo" ? "/shop" : `/products/${product.slug}`;
  return (
    <article
      className={`product-card ${variant === "campaign" ? "product-card-campaign" : ""} ${added ? "just-added" : ""}`}
    >
      <div className="product-image">
        <Link href={href} aria-label={`View ${product.name}`}>
          <ResponsiveImage
            src={product.image}
            alt={product.alt}
            sizes={
              variant === "campaign"
                ? "(max-width: 767px) 44vw, (max-width: 1199px) 24vw, 16vw"
                : "(max-width: 599px) 46vw, (max-width: 1023px) 45vw, 23vw"
            }
          />
          {product.alternateImage ? (
            <ResponsiveImage
              className="alternate-image"
              src={product.alternateImage}
              alt={`${product.name}, alternate view`}
              sizes="(max-width: 599px) 46vw, 23vw"
            />
          ) : null}
        </Link>
        <WishlistButton product={product} />
        {variant === "campaign" && !product.available && (
          <span className="tj-stock-label">Sold out</span>
        )}
        {product.conceptImage ? (
          <span className="image-label">
            {product.source === "demo"
              ? "Sample / concept image"
              : "Concept image"}
          </span>
        ) : null}
      </div>
      <div className="product-details">
        <h3>
          <Link href={href}>{product.name}</Link>
        </h3>
        <p>
          {product.hasVariants ? <span>From </span> : null}
          {formatINR(product.pricePaise)}
          {product.compareAtPaise &&
          product.compareAtPaise > product.pricePaise ? (
            <del>{formatINR(product.compareAtPaise)}</del>
          ) : null}
        </p>
      </div>
      {product.hasVariants && product.available ? (
        <Link
          className="add-to-bag"
          href={wishlistMode ? `${href}?moveFromWishlist=true` : href}
        >
          <span>Choose options</span>
          <span className="add-icon">
            <Plus size={17} aria-hidden="true" />
          </span>
        </Link>
      ) : (
        <button
          className="add-to-bag"
          disabled={busy || !product.available || product.source === "demo"}
          onClick={async () => {
            setBusy(true);
            const added = await addToBag(product);
            if (added) setAdded(true);
            if (added && wishlistMode) removeSaved(product.id);
            setBusy(false);
          }}
          aria-label={`${wishlistMode ? "Move" : "Add"} ${product.name} to bag`}
        >
          <span>
            {busy
              ? "Checking..."
              : product.source === "demo"
                ? "Preview only"
                : product.available
                  ? wishlistMode
                    ? "Move to bag"
                    : "Add to bag"
                  : "Out of stock"}
          </span>
          <span className="add-icon">
            {variant === "campaign" ? (
              added ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <ShoppingBag size={17} strokeWidth={1.4} aria-hidden="true" />
              )
            ) : (
              <Plus size={17} strokeWidth={1.3} aria-hidden="true" />
            )}
          </span>
        </button>
      )}
    </article>
  );
}
