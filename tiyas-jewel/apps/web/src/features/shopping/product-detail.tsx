"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Product } from "@tiyas/shared";
import { ChevronLeft, ChevronRight, Expand, Heart } from "lucide-react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Modal } from "@/components/ui/modal";
import { QuantitySelector } from "@/components/storefront/quantity-selector";
import { ProductCard } from "@/components/storefront/product-card";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { api } from "@/lib/api-client";
import { presentProduct } from "@/lib/catalog-presentation";
import { formatINR } from "@/lib/money";
function ProductGallery({
  product,
  imageId,
}: {
  product: Product;
  imageId?: string | null;
}) {
  const presentation = presentProduct(product);
  const images = product.images.length
    ? product.images
    : [
        {
          id: "pending",
          url: presentation.image,
          alt: presentation.alt,
          position: 0,
          concept: true,
        },
      ];
  const initial = Math.max(
    0,
    images.findIndex((image) => image.id === imageId),
  );
  const [active, setActive] = useState(initial);
  const [zoom, setZoom] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (track.current)
      track.current.scrollLeft = initial * track.current.clientWidth;
  }, [initial]);
  function go(index: number) {
    track.current?.scrollTo({
      left: index * track.current.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <div className="product-gallery">
      <div className="gallery-main">
        <div
          className="product-image-track"
          ref={track}
          onScroll={(event) =>
            setActive(
              Math.round(
                event.currentTarget.scrollLeft /
                  event.currentTarget.clientWidth,
              ),
            )
          }
          aria-label="Product photographs"
        >
          {images.map((image, index) => (
            <button
              className="gallery-slide"
              key={image.id}
              aria-label={`Zoom image ${index + 1} of ${product.name}`}
              onClick={() => setZoom(true)}
            >
              <ResponsiveImage
                src={
                  image.url.endsWith("catalog-placeholder.svg")
                    ? presentation.image
                    : image.url
                }
                alt={image.alt}
                preload={index === initial}
                sizes="(max-width: 599px) 90vw, 50vw"
              />
            </button>
          ))}
        </div>
        <button
          className="icon-button zoom-trigger"
          aria-label="Zoom current product image"
          onClick={() => setZoom(true)}
        >
          <Expand size={20} />
        </button>
        {images.length > 1 ? (
          <div className="gallery-arrows">
            <button
              className="icon-button"
              disabled={active === 0}
              onClick={() => go(active - 1)}
              aria-label="Previous product image"
            >
              <ChevronLeft size={20} />
            </button>
            <span>
              {active + 1} / {images.length}
            </span>
            <button
              className="icon-button"
              disabled={active === images.length - 1}
              onClick={() => go(active + 1)}
              aria-label="Next product image"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        ) : null}
      </div>
      <div className="gallery-thumbnails" aria-label="Select a product image">
        {images.map((image, index) => (
          <button
            key={image.id}
            className={active === index ? "selected" : ""}
            aria-label={`Show product image ${index + 1}`}
            aria-pressed={active === index}
            onClick={() => go(index)}
          >
            <ResponsiveImage
              src={
                image.url.endsWith("catalog-placeholder.svg")
                  ? presentation.image
                  : image.url
              }
              alt=""
              sizes="72px"
            />
          </button>
        ))}
      </div>
      {presentation.conceptImage ? (
        <p className="gallery-disclosure">
          Concept imagery. Actual product photography is pending.
        </p>
      ) : null}
      {zoom ? (
        <Modal title="A closer look." onClose={() => setZoom(false)}>
          <p className="panel-note">
            Scroll to explore the detail. Use your browser zoom to look closer.
          </p>
          <div
            className="zoom-scroll"
            tabIndex={0}
            aria-label="Zoomed product photograph"
          >
            <div className="zoom-canvas">
              <ResponsiveImage
                src={
                  images[active]?.url.endsWith("catalog-placeholder.svg")
                    ? presentation.image
                    : (images[active]?.url ?? presentation.image)
                }
                alt={images[active]?.alt ?? product.name}
                sizes="1200px"
              />
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
export function ProductDetail({
  product,
  moveFromWishlist = false,
}: {
  product: Product;
  moveFromWishlist?: boolean;
}) {
  const { saved, toggleSaved, addToBag, removeSaved } = useStorefront();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [related, setRelated] = useState<Product[]>([]);
  const variant = product.variants.find((item) => item.id === variantId);
  const hasVariants = product.variants.length > 0;
  const selected = !hasVariants || Boolean(variant);
  const available =
    selected && product.available && (!variant || variant.available);
  const max = variant?.maxQuantity ?? product.maxQuantity ?? 0;
  const price = variant?.pricePaise ?? product.pricePaise;
  useEffect(() => {
    const abort = new AbortController();
    api
      .catalog({ category: product.category.slug, limit: "5" }, abort.signal)
      .then((response) =>
        setRelated(
          response.data.filter((item) => item.id !== product.id).slice(0, 4),
        ),
      )
      .catch(() => {});
    return () => abort.abort();
  }, [product.category.slug, product.id]);
  return (
    <div className="shell product-detail-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        <span>/</span>
        <Link href={`/shop/${product.category.slug}`}>
          {product.category.name}
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <div className="product-detail-layout">
        <ProductGallery
          key={variantId ?? "base"}
          product={product}
          imageId={variant?.imageId}
        />
        <div className="product-information">
          <p className="eyebrow">The Tiyas edit / {product.category.name}</p>
          <h1>{product.name}</h1>
          <div className="detail-price">
            {hasVariants && !selected ? <span>From </span> : null}
            {formatINR(price)}
            {product.compareAtPaise && product.compareAtPaise > price ? (
              <del>{formatINR(product.compareAtPaise)}</del>
            ) : null}
          </div>
          <p className="product-description">{product.description}</p>
          {product.details && (
            <dl className="detail-specifications">
              {product.details.material && (
                <div>
                  <dt>Material</dt>
                  <dd>{product.details.material}</dd>
                </div>
              )}
              {product.details.weightGrams && (
                <div>
                  <dt>Weight</dt>
                  <dd>Approx. {product.details.weightGrams} g</dd>
                </div>
              )}
              {product.details.size && (
                <div>
                  <dt>Size</dt>
                  <dd>{product.details.size}</dd>
                </div>
              )}
              {product.details.colors?.length ? (
                <div>
                  <dt>Colours</dt>
                  <dd>
                    {product.details.colors.map((c) => c.name).join(", ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}
          {hasVariants ? (
            <div className="variant-picker">
              <label htmlFor="product-variant">Size or option</label>
              <select
                id="product-variant"
                value={variantId ?? ""}
                onChange={(event) => {
                  setVariantId(event.target.value || null);
                  setQuantity(1);
                }}
              >
                <option value="">Choose your option</option>
                {product.variants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {!item.available ? " / Out of stock" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <p
            className={`availability ${available ? "in-stock" : ""}`}
            role="status"
          >
            {!selected
              ? "Choose an option to see availability."
              : available
                ? "Available for your bag."
                : "This selection is currently out of stock."}
          </p>
          <p className="sku">
            {variant?.sku
              ? `SKU: ${variant.sku}`
              : product.sku
                ? `SKU: ${product.sku}`
                : ""}
          </p>
          <div className="purchase-controls">
            <QuantitySelector
              value={quantity}
              max={max}
              disabled={!available || busy}
              onChange={setQuantity}
            />
            <button
              className="action detail-add"
              disabled={!available || busy}
              onClick={async () => {
                setBusy(true);
                const added = await addToBag(product, variantId, quantity);
                if (added && moveFromWishlist) removeSaved(product.id);
                setBusy(false);
              }}
            >
              {busy
                ? "Checking availability..."
                : !selected
                  ? "Choose an option"
                  : !available
                    ? "Out of stock"
                    : "Add to bag"}
            </button>
          </div>
          <button
            className="detail-save"
            aria-pressed={saved.includes(product.id)}
            onClick={() => toggleSaved(product)}
          >
            <Heart
              size={19}
              fill={saved.includes(product.id) ? "currentColor" : "none"}
              strokeWidth={1.3}
              aria-hidden="true"
            />
            {saved.includes(product.id)
              ? "Saved to your wishlist"
              : "Save to wishlist"}
          </button>
          <p className="shopping-disclaimer">
            Your bag is saved on this browser. Review delivery and payment
            options at checkout.
          </p>
          <div className="product-accordions">
            <details open>
              <summary>Jewellery care</summary>
              <p>
                Store each piece separately, away from moisture and perfume.
                Wipe gently with a soft, dry cloth. Follow the material-specific
                care notes supplied with your piece.
              </p>
            </details>
            <details>
              <summary>Delivery & returns</summary>
              <p>
                Delivery eligibility and the return window will be confirmed
                before orders open. Visit{" "}
                <Link href="/info/shipping-returns">shipping & returns</Link>{" "}
                for current information.
              </p>
            </details>
          </div>
        </div>
      </div>
      {related.length ? (
        <section className="related-products">
          <p className="eyebrow">The considered pairing</p>
          <h2>Another piece of you.</h2>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={presentProduct(item)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
