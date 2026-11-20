"use client";
import Link from "next/link";
import { useStorefront } from "./storefront-provider";
import { QuantitySelector } from "./quantity-selector";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { presentProduct } from "@/lib/catalog-presentation";
import { cartKey } from "@/lib/shopping-storage";
import { formatINR } from "@/lib/money";
export function CartContent({
  drawer = false,
  onNavigate,
}: {
  drawer?: boolean;
  onNavigate?: () => void;
}) {
  const {
    cartRefs,
    cart,
    cartStatus,
    cartError,
    hydrated,
    storageWarning,
    removeFromBag,
    updateQuantity,
    refreshCart,
  } = useStorefront();
  if (!hydrated || cartStatus === "loading")
    return (
      <p className="shopping-loading" role="status">
        Checking your bag against the current catalogue...
      </p>
    );
  if (!cartRefs.length)
    return (
      <div className="shopping-empty">
        <h2>A little room for something lovely.</h2>
        <p>Your bag is waiting for a piece that feels like you.</p>
        <Link
          className="button button-primary"
          href="/shop"
          onClick={onNavigate}
        >
          Discover the collection
        </Link>
      </div>
    );
  if (cartStatus === "error")
    return (
      <div role="alert">
        <p>{cartError}</p>
        <button className="action" onClick={refreshCart}>
          Try again
        </button>
        <p>Your saved selections have been kept.</p>
      </div>
    );
  if (!cartRefs.length)
    return (
      <div className="empty-shopping">
        <p className="eyebrow">A little room for something lovely</p>
        <h2>Your bag is waiting.</h2>
        <p>Discover a piece that feels like you.</p>
        <Link
          className="button button-primary"
          href="/shop"
          onClick={onNavigate}
        >
          Explore the collection
        </Link>
      </div>
    );
  return (
    <>
      {storageWarning ? (
        <p className="shopping-warning" role="status">
          {storageWarning}
        </p>
      ) : null}
      <div className="cart-lines">
        {cart.items.map((line) => {
          const presentation = line.product
            ? presentProduct(line.product)
            : null;
          const variant = line.product?.variants.find(
            (item) => item.id === line.variantId,
          );
          const ready = line.quantity > 0;
          return (
            <article className="cart-line" key={cartKey(line)}>
              {presentation ? (
                <Link
                  className="cart-line-image"
                  href={`/products/${line.product!.slug}`}
                  onClick={onNavigate}
                >
                  <ResponsiveImage
                    src={presentation.image}
                    alt={presentation.alt}
                    sizes={drawer ? "90px" : "(max-width: 599px) 90px, 150px"}
                  />
                </Link>
              ) : (
                <div className="cart-line-image missing-image">Unavailable</div>
              )}
              <div className="cart-line-details">
                <h3>
                  {line.product ? (
                    <Link
                      href={`/products/${line.product.slug}`}
                      onClick={onNavigate}
                    >
                      {line.product.name}
                    </Link>
                  ) : (
                    "This piece is no longer listed"
                  )}
                </h3>
                {variant ? (
                  <p>
                    {variant.name} <span className="sku">{variant.sku}</span>
                  </p>
                ) : null}
                {line.unitPricePaise !== null ? (
                  <p>{formatINR(line.unitPricePaise)}</p>
                ) : null}
                {line.status !== "ready" ? (
                  <p className="shopping-warning">
                    {line.status === "adjusted"
                      ? `Only ${line.quantity} available. The subtotal reflects this quantity.`
                      : line.status === "variant_required"
                        ? "Choose a size or option before adding this piece."
                        : "This selection is currently unavailable and is excluded from the subtotal."}
                  </p>
                ) : null}
                {ready ? (
                  <QuantitySelector
                    value={line.quantity}
                    max={line.maxQuantity}
                    label={`Quantity for ${line.product?.name ?? "item"}`}
                    onChange={(value) => {
                      void updateQuantity(cartKey(line), value);
                    }}
                  />
                ) : null}
                <button
                  className="text-button"
                  onClick={() => removeFromBag(cartKey(line))}
                  aria-label={`Remove ${line.product?.name ?? "unavailable item"} from bag`}
                >
                  Remove
                </button>
              </div>
              <div className="cart-line-total">
                {ready ? formatINR(line.lineTotalPaise) : "Unavailable"}
              </div>
            </article>
          );
        })}
      </div>
      <div className="cart-summary">
        <div>
          <span>Subtotal</span>
          <strong>{formatINR(cart.subtotalPaise)}</strong>
        </div>
        <p>
          Available pieces only. Delivery and any applicable taxes will be
          confirmed when checkout opens.
        </p>
        <p className="shopping-warning">
          Checkout and payments are not available yet.
        </p>
        {drawer ? (
          <Link
            className="button button-primary"
            href="/cart"
            onClick={onNavigate}
          >
            View your bag
          </Link>
        ) : (
          <Link className="editorial-link" href="/shop">
            Continue discovering
          </Link>
        )}
      </div>
    </>
  );
}
