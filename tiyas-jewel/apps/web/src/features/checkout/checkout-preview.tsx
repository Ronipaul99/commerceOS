import type { ReactNode } from "react";
import type { CartQuote } from "@tiyas/shared";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { presentProduct } from "@/lib/catalog-presentation";
import { formatINR } from "@/lib/money";
export function CheckoutPreview({
  cart,
  count,
  status,
  children,
}: {
  cart: CartQuote;
  count: number;
  status: "loading" | "ready" | "error";
  children: ReactNode;
}) {
  return (
    <aside className="checkout-summary" aria-label="Order summary">
      <div className="purchase-panel-heading checkout-summary-heading">
        <h2>Order summary</h2>
        <span>
          ({count} {count === 1 ? "item" : "items"})
        </span>
      </div>
      <div className="checkout-summary-body">
        <div className="checkout-items">
          {cart.items.map((line) => {
            const display = line.product ? presentProduct(line.product) : null;
            const variant = line.product?.variants.find(
              (item) => item.id === line.variantId,
            );
            return (
              <article
                className="checkout-item"
                key={`${line.productId}:${line.variantId}`}
              >
                <div className="checkout-item-image">
                  <ResponsiveImage
                    src={display?.image ?? "/images/catalog-placeholder.svg"}
                    alt={display?.alt ?? "Product image unavailable"}
                    sizes="72px"
                  />
                </div>
                <div>
                  <h3>{line.product?.name ?? "Unavailable selection"}</h3>
                  <p>
                    {variant ? `${variant.name} · ` : ""}Qty: {line.quantity}
                  </p>
                  {display?.conceptImage && <small>Concept image</small>}
                </div>
                <strong>{formatINR(line.lineTotalPaise)}</strong>
              </article>
            );
          })}
        </div>
        {status === "ready" ? (
          <dl className="checkout-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatINR(cart.subtotalPaise)}</dd>
            </div>
            <div>
              <dt>Shipping & tax</dt>
              <dd>Confirmed with PIN</dd>
            </div>
          </dl>
        ) : (
          <p className="checkout-quote-note" role="status">
            {status === "loading"
              ? "Checking your current selection..."
              : "Your bag could not be verified. Return to your bag to try again."}
          </p>
        )}
        <p className="checkout-quote-note" role="status">
          Enter a valid delivery PIN code to confirm availability, shipping and
          the final total.
        </p>
        {children}
      </div>
    </aside>
  );
}
