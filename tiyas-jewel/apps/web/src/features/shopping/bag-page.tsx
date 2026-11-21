"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  MapPin,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { pinCodeSchema, type CheckoutQuote, type Product } from "@tiyas/shared";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { QuantitySelector } from "@/components/storefront/quantity-selector";
import { ProductCard } from "@/components/storefront/product-card";
import {
  PurchaseBenefits,
  PurchaseHelp,
  PurchaseSteps,
} from "@/components/storefront/purchase-ui";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { presentProduct } from "@/lib/catalog-presentation";
import { cartKey } from "@/lib/shopping-storage";
import { checkoutApi } from "@/lib/checkout-client";
import { formatINR } from "@/lib/money";

export function BagPage({ recommendations }: { recommendations: Product[] }) {
  const {
    cartRefs,
    cart,
    cartStatus,
    cartError,
    hydrated,
    storageWarning,
    saved,
    toggleSaved,
    removeFromBag,
    updateQuantity,
    refreshCart,
  } = useStorefront();
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [selection, setSelection] = useState<string[] | null>(null);
  const [delivery, setDelivery] = useState<{
    key: string;
    quote?: CheckoutQuote;
    error?: string;
  } | null>(null);
  const quoteKey = JSON.stringify({ cartRefs, pin });
  const quote = delivery?.key === quoteKey ? delivery.quote : undefined;
  const count = cart.items.reduce((total, line) => total + line.quantity, 0);
  const selected = cart.items.filter(
    (line) => selection === null || selection.includes(cartKey(line)),
  );
  const allSelected =
    cart.items.length > 0 && selected.length === cart.items.length;
  const ready =
    cartStatus === "ready" &&
    cart.items.length > 0 &&
    cart.items.every((line) => line.status === "ready");
  async function checkDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pinCodeSchema.safeParse(pin).success) {
      setDelivery({
        key: quoteKey,
        error: "Enter a valid six-digit Indian PIN code.",
      });
      return;
    }
    setChecking(true);
    try {
      const result = await checkoutApi.quote(cartRefs, pin);
      setDelivery({ key: quoteKey, quote: result.data });
    } catch (error) {
      setDelivery({
        key: quoteKey,
        error:
          error instanceof Error
            ? error.message
            : "Delivery could not be checked. Please try again.",
      });
    } finally {
      setChecking(false);
    }
  }
  const suggested = recommendations
    .filter(
      (product) => !cartRefs.some((item) => item.productId === product.id),
    )
    .slice(0, 4);
  return (
    <div className="purchase-page bag-page">
      <div className="purchase-shell">
        <PurchaseSteps current="bag" />
        <header className="bag-heading">
          <span className="purchase-heading-icon">
            <ShoppingBag size={30} strokeWidth={1.4} aria-hidden="true" />
          </span>
          <div>
            <h1>
              Shopping Bag{" "}
              <span>
                (
                {hydrated
                  ? cartRefs.reduce((sum, item) => sum + item.quantity, 0)
                  : 0}
                )
              </span>
            </h1>
            <p>Handpicked jewellery, ready for you.</p>
          </div>
        </header>
        {!hydrated || cartStatus === "loading" ? (
          <div className="purchase-state" role="status">
            <ShoppingBag size={30} aria-hidden="true" />
            <h2>Preparing your selection</h2>
            <p>Checking your bag against the current catalogue...</p>
          </div>
        ) : !cartRefs.length ? (
          <div className="purchase-state">
            <ShoppingBag size={38} strokeWidth={1.2} aria-hidden="true" />
            <h2>A little room for something lovely.</h2>
            <p>Your bag is waiting for a piece that feels like you.</p>
            <Link className="purchase-button" href="/shop">
              Discover the collection{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        ) : cartStatus === "error" ? (
          <div className="purchase-state" role="alert">
            <h2>Your selection is safe.</h2>
            <p>{cartError}</p>
            <button className="purchase-button" onClick={refreshCart}>
              Try again
            </button>
          </div>
        ) : (
          <>
            {storageWarning && (
              <p className="shopping-warning" role="status">
                {storageWarning}
              </p>
            )}
            <div className="bag-layout">
              <div className="bag-items-panel">
                <div className="cart-lines bag-lines">
                  {cart.items.map((line) => {
                    const product = line.product;
                    const display = product ? presentProduct(product) : null;
                    const variant = product?.variants.find(
                      (item) => item.id === line.variantId,
                    );
                    const color =
                      product?.details?.colors?.length === 1
                        ? product.details.colors[0]
                        : undefined;
                    const key = cartKey(line);
                    const selectedLine =
                      selection === null || selection.includes(key);
                    const comparison =
                      product &&
                      line.unitPricePaise === product.pricePaise &&
                      product.compareAtPaise &&
                      product.compareAtPaise > product.pricePaise
                        ? product.compareAtPaise * line.quantity
                        : null;
                    return (
                      <article className="cart-line bag-line" key={key}>
                        <input
                          className="bag-select"
                          type="checkbox"
                          checked={selectedLine}
                          aria-label={`Select ${product?.name ?? "unavailable item"} for removal`}
                          onChange={() =>
                            setSelection(
                              selectedLine
                                ? selected
                                    .map((item) => cartKey(item))
                                    .filter((item) => item !== key)
                                : [
                                    ...selected.map((item) => cartKey(item)),
                                    key,
                                  ],
                            )
                          }
                        />
                        {display ? (
                          <Link
                            className="cart-line-image bag-line-image"
                            href={`/products/${product!.slug}`}
                          >
                            <ResponsiveImage
                              src={display.image}
                              alt={display.alt}
                              sizes="(max-width: 599px) 92px, 150px"
                            />
                          </Link>
                        ) : (
                          <div className="bag-line-image missing-image">
                            Unavailable
                          </div>
                        )}
                        <div className="bag-line-info">
                          <span className="bag-category">
                            {product?.collections[0]?.name ??
                              product?.category.name ??
                              "Your selection"}
                          </span>
                          <h2>
                            {product ? (
                              <Link href={`/products/${product.slug}`}>
                                {product.name}
                              </Link>
                            ) : (
                              "This piece is no longer listed"
                            )}
                          </h2>
                          {product?.details?.material && (
                            <p>
                              Material: <span>{product.details.material}</span>
                            </p>
                          )}
                          {variant && (
                            <p>
                              Option: <span>{variant.name}</span>
                            </p>
                          )}
                          {color && (
                            <p className="bag-color">
                              Colour:{" "}
                              <i
                                style={{
                                  background: color.hex,
                                }}
                              />{" "}
                              <span>{color.name}</span>
                            </p>
                          )}
                          {display?.conceptImage && (
                            <small className="bag-concept">Concept image</small>
                          )}
                          {line.status !== "ready" && (
                            <p className="shopping-warning">
                              {line.status === "adjusted"
                                ? `Only ${line.quantity} available. Review this quantity before checkout.`
                                : line.status === "variant_required"
                                  ? "Choose a size or option on the product page."
                                  : "This selection is currently unavailable and is excluded from the subtotal."}
                            </p>
                          )}
                        </div>
                        <div className="bag-line-actions">
                          {line.quantity > 0 && (
                            <QuantitySelector
                              value={line.quantity}
                              max={line.maxQuantity}
                              label={`Quantity for ${product?.name ?? "item"}`}
                              onChange={(value) => {
                                void updateQuantity(key, value);
                              }}
                            />
                          )}
                          {product && (
                            <button
                              className="bag-save"
                              aria-pressed={saved.includes(product.id)}
                              onClick={() => toggleSaved(product)}
                            >
                              <Heart
                                size={17}
                                fill={
                                  saved.includes(product.id)
                                    ? "currentColor"
                                    : "none"
                                }
                                aria-hidden="true"
                              />
                              {saved.includes(product.id)
                                ? "Saved to wishlist"
                                : "Save to wishlist"}
                            </button>
                          )}
                        </div>
                        <div className="bag-line-price">
                          <strong>
                            {line.quantity > 0
                              ? formatINR(line.lineTotalPaise)
                              : "Unavailable"}
                          </strong>
                          {comparison && <del>{formatINR(comparison)}</del>}
                        </div>
                        <button
                          className="bag-remove"
                          aria-label={`Remove ${product?.name ?? "unavailable item"} from bag`}
                          onClick={() => removeFromBag(key)}
                        >
                          <Trash2 size={19} aria-hidden="true" />
                        </button>
                      </article>
                    );
                  })}
                </div>
                <div className="bag-bulk">
                  <label>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      aria-label="Select all items for removal"
                      onChange={() =>
                        setSelection(
                          allSelected
                            ? []
                            : cart.items.map((line) => cartKey(line)),
                        )
                      }
                    />
                    Select all ({cart.items.length})
                  </label>
                  <button
                    disabled={!selected.length}
                    onClick={() => {
                      selected.forEach((line) => removeFromBag(cartKey(line)));
                      setSelection(null);
                    }}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                    Remove selected
                  </button>
                </div>
              </div>
              <aside className="bag-order-panel" aria-label="Bag order summary">
                <div className="purchase-panel-heading">
                  <h2>Order Summary</h2>
                </div>
                <div className="bag-summary-content">
                  <dl className="bag-totals">
                    <div>
                      <dt>
                        Subtotal ({count} {count === 1 ? "item" : "items"})
                      </dt>
                      <dd>{formatINR(cart.subtotalPaise)}</dd>
                    </div>
                    <div>
                      <dt>Shipping</dt>
                      <dd>
                        {quote ? (
                          quote.shippingPaise === 0 ? (
                            <span className="purchase-positive">
                              Complimentary
                            </span>
                          ) : (
                            formatINR(quote.shippingPaise)
                          )
                        ) : (
                          "Check your PIN"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        Tax {quote?.taxMode === "inclusive" ? "(included)" : ""}
                      </dt>
                      <dd>
                        {quote ? formatINR(quote.taxPaise) : "At checkout"}
                      </dd>
                    </div>
                    <div className="bag-total">
                      <dt>{quote ? "Total" : "Subtotal"}</dt>
                      <dd>
                        {formatINR(quote?.totalPaise ?? cart.subtotalPaise)}
                      </dd>
                    </div>
                  </dl>
                  {quote && (
                    <p className="bag-delivery-success" role="status">
                      <Truck size={16} aria-hidden="true" />
                      Delivery is available for {pin}.
                    </p>
                  )}
                  {!quote && (
                    <p className="bag-total-note">
                      Delivery and applicable taxes are confirmed before you
                      place your order.
                    </p>
                  )}
                  {ready ? (
                    <Link className="purchase-button" href="/checkout">
                      <ShoppingBag size={18} aria-hidden="true" />
                      Proceed to checkout
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  ) : (
                    <p className="shopping-warning">
                      Review unavailable or adjusted selections before checkout.
                    </p>
                  )}
                  <details className="bag-pin-check">
                    <summary>
                      <MapPin size={18} aria-hidden="true" />
                      Check Delivery PIN
                    </summary>
                    <form onSubmit={checkDelivery}>
                      <label htmlFor="bag-delivery-pin">
                        Delivery PIN code
                      </label>
                      <div>
                        <input
                          id="bag-delivery-pin"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          maxLength={6}
                          value={pin}
                          onChange={(event) =>
                            setPin(event.target.value.replace(/[^0-9]/g, ""))
                          }
                          placeholder="Enter 6-digit PIN"
                        />
                        <button type="submit" disabled={checking || !ready}>
                          {checking ? "Checking..." : "Check"}
                        </button>
                      </div>
                      {delivery?.key === quoteKey && delivery.error && (
                        <p role="alert" className="field-error">
                          {delivery.error}
                        </p>
                      )}
                    </form>
                  </details>
                  <Link className="bag-continue" href="/shop">
                    <ArrowLeft size={16} aria-hidden="true" />
                    Continue shopping
                  </Link>
                </div>
                <PurchaseHelp />
              </aside>
            </div>
          </>
        )}
        <PurchaseBenefits />
        {suggested.length > 0 && (
          <section
            className="bag-recommendations"
            aria-labelledby="bag-recommendations-title"
          >
            <header>
              <span className="tj-eyebrow">A little more to love</span>
              <h2 id="bag-recommendations-title">You May Also Like</h2>
              <p>Find the next piece in your jewellery story.</p>
            </header>
            <div className="bag-recommendations-grid">
              {suggested.map((product) => (
                <ProductCard
                  key={product.id}
                  product={presentProduct(product)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
