"use client";
import Link from "next/link";
import { useId, useState } from "react";
import {
  Heart,
  ShoppingBag,
  Check,
  Eye,
  Crown,
  Star,
  Layers,
  Leaf,
  Ruler,
  Palette,
} from "lucide-react";
import type { DisplayProduct } from "@/lib/catalog-presentation";
import {
  cardImages,
  cardSelection,
  formatCardPrice,
  defaultColorVariant,
  verifiedCardDetails,
  type ProductCardDetails,
} from "@/lib/product-card";
import { formatINR } from "@/lib/money";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Modal } from "@/components/ui/modal";
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
        strokeWidth={1.5}
        fill={active ? "currentColor" : "none"}
        aria-hidden="true"
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
      <ShoppingBag size={20} strokeWidth={1.3} aria-hidden="true" />
      {count ? <span className="count">{count}</span> : null}
    </button>
  );
}

function NecklaceSizeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4c1 12 17 12 18 0M12 13v3" />
      <circle cx="12" cy="19" r="3" />
    </svg>
  );
}

function ProductBagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 8h14l2 14H3L5 8ZM8 10V6a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** One card system for homepage rails, listings, favourites and related products. */
export function ProductCard({
  product,
  wishlistMode = false,
  variant = "default",
  details,
}: {
  product: DisplayProduct;
  wishlistMode?: boolean;
  /** Placement only. All placements share the same card design and interactions. */
  variant?: "default" | "campaign" | "listing";
  details?: ProductCardDetails;
}) {
  const { addToBag, removeSaved } = useStorefront();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [quickView, setQuickView] = useState(false);
  const [variantId, setVariantId] = useState<string | null>(() =>
    defaultColorVariant(product, details ?? product.cardDetails),
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [alternateReady, setAlternateReady] = useState(false);
  const selectId = useId();
  const facts = verifiedCardDetails(details ?? product.cardDetails);
  const selection = cardSelection(product, variantId);
  const images = cardImages(product);
  const activeImage =
    images[Math.min(imageIndex, images.length - 1)] ?? images[0];
  const variants = product.raw?.variants ?? [];
  const hasFullDetails = Boolean(facts.colors.length || facts.size);
  const showVariantChips =
    !hasFullDetails &&
    variants.length > 0 &&
    !variants.every((variant) =>
      facts.colors.some((color) => color.variantId === variant.id),
    );
  const href =
    product.source === "demo" ? "/shop" : `/products/${product.slug}`;
  const collection =
    product.raw?.collections[0]?.name ?? product.raw?.category.name;
  const unavailable =
    !product.available || (Boolean(selection.variant) && !selection.available);
  const badge = facts.bestseller
    ? "Bestseller"
    : product.raw?.featured
      ? "Featured"
      : null;

  function chooseVariant(id: string) {
    setVariantId(id || null);
    setAdded(false);
    setError("");
    const imageId = variants.find((item) => item.id === id)?.imageId;
    const index = images.findIndex((image) => image.id === imageId);
    if (index >= 0) setImageIndex(index);
  }
  async function add() {
    if (busy || unavailable || product.source === "demo") return;
    if (selection.from) {
      setQuickView(true);
      return;
    }
    setBusy(true);
    setError("");
    setQuickView(false);
    try {
      const success = await addToBag(product, variantId);
      setAdded(success);
      if (success && wishlistMode) removeSaved(product.id);
      if (!success)
        setError(
          "Could not add this selection. Please check availability and try again.",
        );
    } catch {
      setError("Could not add this selection. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function media(inDialog = false) {
    return (
      <div className="tj-pc-media">
        <Link
          href={href}
          className="tj-pc-image-link"
          aria-label={`View ${product.name}`}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setAlternateReady(true);
          }}
          onFocus={() => setAlternateReady(true)}
        >
          <ResponsiveImage
            src={activeImage.url}
            publicMedia={activeImage.publicMedia}
            alt={product.conceptImage ? product.alt : activeImage.alt}
            className="tj-pc-photo"
            sizes={
              inDialog
                ? "(max-width: 767px) 90vw, 400px"
                : "(max-width: 767px) 48vw, (max-width: 1199px) 30vw, 25vw"
            }
          />
          {!inDialog && alternateReady && imageIndex === 0 && images[1] && (
            <ResponsiveImage
              className="tj-pc-alternate"
              src={images[1].url}
              publicMedia={images[1].publicMedia}
              alt={`${product.name}, alternate view`}
              sizes="(max-width: 767px) 48vw, 25vw"
            />
          )}
        </Link>
        {badge && (
          <span className="tj-pc-badge">
            <Crown size={14} aria-hidden="true" />
            {badge}
          </span>
        )}
        <WishlistButton product={product} />
        {unavailable && <span className="tj-pc-stock">Sold out</span>}
        {product.conceptImage && (
          <span className="tj-pc-provenance">
            {product.source === "demo"
              ? "Sample / concept image"
              : "Concept image"}
          </span>
        )}
        {images.length > 1 && (
          <div
            className="tj-pc-dots"
            role="group"
            aria-label={`Photographs of ${product.name}`}
          >
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`Show image ${index + 1} of ${product.name}`}
                aria-pressed={imageIndex === index}
                onClick={() => setImageIndex(index)}
              >
                <span />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  function attributes(inDialog = false) {
    const rich = Boolean(facts.colors.length || facts.size);
    if (
      !facts.material &&
      !facts.weightGrams &&
      !facts.size &&
      !facts.colors.length
    )
      return null;
    const material = facts.material ? (
      <div className="tj-pc-fact">
        <Layers aria-hidden="true" />
        <dl>
          <dt>Material</dt>
          <dd title={facts.material}>{facts.material}</dd>
        </dl>
      </div>
    ) : null;
    const weight = facts.weightGrams ? (
      <div className="tj-pc-fact">
        <Leaf aria-hidden="true" />
        <dl>
          <dt>Weight</dt>
          <dd>&#8776; {facts.weightGrams} g</dd>
        </dl>
      </div>
    ) : null;
    const colors = facts.colors.length ? (
      <div className="tj-pc-fact">
        <Palette aria-hidden="true" />
        <dl>
          <dt>Colours available</dt>
          <dd className="tj-pc-colors">
            {(inDialog
              ? facts.colors
              : facts.colors.slice(0, facts.colors.length > 4 ? 3 : 4)
            ).map((color) => {
              const option = variants.find(
                (item) => item.id === color.variantId,
              );
              return option ? (
                <button
                  type="button"
                  key={color.name}
                  title={color.name}
                  aria-label={
                    color.name +
                    " colour" +
                    (option.available ? "" : ", out of stock")
                  }
                  aria-pressed={variantId === option.id}
                  disabled={!product.available || !option.available}
                  onClick={() => chooseVariant(option.id)}
                  style={{ backgroundColor: color.hex }}
                >
                  {variantId === option.id && (
                    <Check size={14} aria-hidden="true" />
                  )}
                </button>
              ) : (
                <span
                  key={color.name}
                  role="img"
                  title={color.name}
                  aria-label={color.name + " colour"}
                  style={{ backgroundColor: color.hex }}
                />
              );
            })}
            {!inDialog && facts.colors.length > 4 && (
              <button
                type="button"
                className="tj-pc-more-colors"
                aria-label={`View all ${facts.colors.length} colours of ${product.name}`}
                aria-haspopup="dialog"
                onClick={() => setQuickView(true)}
              >
                +{facts.colors.length - 3}
              </button>
            )}
          </dd>
        </dl>
      </div>
    ) : null;
    const size = facts.size ? (
      <div className="tj-pc-fact">
        {product.raw?.category.slug === "necklaces" ? (
          <NecklaceSizeIcon />
        ) : (
          <Ruler aria-hidden="true" />
        )}
        <dl>
          <dt>
            {product.raw?.category.slug === "necklaces"
              ? "Necklace size"
              : "Size"}
          </dt>
          <dd title={facts.size}>{facts.size}</dd>
        </dl>
      </div>
    ) : null;
    return (
      <div
        className={
          "tj-pc-attributes " +
          (rich ? "tj-pc-attributes-full" : "tj-pc-attributes-essential")
        }
      >
        {(material || (rich ? colors : weight)) && (
          <div className="tj-pc-fact-row">
            {material}
            {rich ? colors : weight}
          </div>
        )}
        {rich && (weight || size) && (
          <div className="tj-pc-fact-row tj-pc-fact-band">
            {weight}
            {size}
          </div>
        )}
      </div>
    );
  }
  function price(inDialog = false) {
    const format = inDialog ? formatINR : formatCardPrice;
    return (
      <div className="tj-pc-price">
        <strong>
          {selection.from && <small>From </small>}
          {format(selection.pricePaise)}
        </strong>
        {selection.compareAtPaise && (
          <del>{format(selection.compareAtPaise)}</del>
        )}
        {selection.discountPercent > 0 && (
          <span className="tj-pc-discount">
            {selection.discountPercent}% OFF
          </span>
        )}
      </div>
    );
  }
  function addButton(inDialog = false) {
    return (
      <button
        type="button"
        className="tj-pc-add"
        disabled={
          busy ||
          unavailable ||
          product.source === "demo" ||
          (inDialog && selection.from)
        }
        aria-label={
          selection.from
            ? `Choose options for ${product.name}`
            : `${wishlistMode ? "Move" : "Add"} ${product.name} to bag`
        }
        onClick={add}
      >
        {added ? <Check size={17} aria-hidden="true" /> : <ProductBagIcon />}
        <span>
          {busy
            ? "Checking..."
            : product.source === "demo"
              ? "Preview only"
              : unavailable
                ? "Out of stock"
                : selection.from
                  ? "Choose options"
                  : added
                    ? "Added to bag"
                    : wishlistMode
                      ? "Move to bag"
                      : "Add to Bag"}
        </span>
      </button>
    );
  }
  return (
    <article
      className={`product-card tj-product-card ${variant === "default" ? "" : `product-card-${variant}`} ${added ? "just-added" : ""}`}
      data-context={variant}
      data-details={hasFullDetails ? "full" : "essential"}
    >
      <div className="tj-pc-frame">
        {media()}
        <div className="tj-pc-body">
          {collection && <p className="tj-pc-collection">{collection}</p>}
          <div className="tj-pc-summary">
            <h3>
              <Link href={href}>{product.name}</Link>
            </h3>
            {(facts.subtitle || product.raw?.description) && (
              <p className="tj-pc-description">
                {facts.subtitle ?? product.raw?.description}
              </p>
            )}
            {facts.rating && (
              <p className="tj-pc-rating">
                <Star size={15} fill="currentColor" aria-hidden="true" />
                <strong>
                  {facts.rating.value.toFixed(1)}
                  <span className="sr-only"> out of 5</span>
                </strong>
                <span>{facts.rating.count} reviews</span>
              </p>
            )}
            {price()}
          </div>
          {attributes()}
          {showVariantChips && (
            <div
              className="tj-pc-options"
              role="group"
              aria-label={`Options for ${product.name}`}
            >
              <span>
                <Ruler size={18} aria-hidden="true" />
                Size / option
              </span>
              <div>
                {variants.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!product.available || !option.available}
                    aria-pressed={option.id === variantId}
                    onClick={() => chooseVariant(option.id)}
                  >
                    {option.name}
                    {!option.available && (
                      <span className="sr-only">, out of stock</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="tj-pc-actions">
          {addButton()}
          <button
            type="button"
            className="tj-pc-quick"
            aria-label={`Quick View ${product.name}`}
            aria-haspopup="dialog"
            onClick={() => setQuickView(true)}
          >
            <Eye size={18} aria-hidden="true" />
            <span>Quick View</span>
          </button>
        </div>
        {error && (
          <p className="tj-pc-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {quickView && (
        <Modal
          title={`Quick view: ${product.name}`}
          onClose={() => setQuickView(false)}
        >
          <div className="tj-pc-preview">
            {media(true)}
            <div className="tj-pc-preview-body">
              {collection && <p className="tj-pc-collection">{collection}</p>}
              <h3>{product.name}</h3>
              {price(true)}
              <p>{facts.subtitle ?? product.raw?.description}</p>
              {attributes(true)}
              {variants.length > 0 && (
                <div className="tj-pc-variant-field">
                  <label htmlFor={selectId}>Size or option</label>
                  <select
                    id={selectId}
                    value={variantId ?? ""}
                    onChange={(event) => chooseVariant(event.target.value)}
                  >
                    <option value="">Choose your option</option>
                    {variants.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                        {!option.available ? " / Out of stock" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selection.variant && (
                <p className="tj-pc-sku">SKU: {selection.variant.sku}</p>
              )}
              <p className="tj-pc-availability" role="status">
                {unavailable
                  ? "Currently out of stock"
                  : selection.from
                    ? "Choose a size or option to check availability"
                    : "Available"}
              </p>
              {addButton(true)}
              <Link
                className="tj-pc-details-link"
                href={wishlistMode ? `${href}?moveFromWishlist=true` : href}
              >
                View full product details
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </article>
  );
}
