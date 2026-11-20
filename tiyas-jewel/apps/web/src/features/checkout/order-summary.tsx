import { type CheckoutQuote, type OrderView } from "@tiyas/shared";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { formatINR } from "@/lib/money";
export function OrderSummary({
  order,
  className = "",
}: {
  order: CheckoutQuote | OrderView;
  className?: string;
}) {
  return (
    <aside
      className={`checkout-summary ${className}`}
      aria-label="Order summary"
    >
      <p className="eyebrow">Your considered selection</p>
      <h2>Order summary</h2>
      <div className="checkout-items">
        {order.items.map((i) => (
          <article
            className="checkout-item"
            key={`${i.productId}:${i.variantId}`}
          >
            <div className="checkout-item-image">
              <ResponsiveImage
                src={i.image ?? "/images/catalog-placeholder.svg"}
                alt={i.name}
                sizes="80px"
              />
            </div>
            <div>
              <h3>{i.name}</h3>
              {i.variant && <p>{i.variant}</p>}
              <p>
                {i.quantity} &times; {formatINR(i.unitPricePaise)}
              </p>
              {i.concept && <small>Concept image</small>}
            </div>
            <strong>{formatINR(i.lineTotalPaise)}</strong>
          </article>
        ))}
      </div>
      <dl className="checkout-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatINR(order.subtotalPaise)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>
            {order.shippingPaise === 0
              ? "Complimentary"
              : formatINR(order.shippingPaise)}
          </dd>
        </div>
        <div>
          <dt>Tax {order.taxMode === "inclusive" ? "(included)" : ""}</dt>
          <dd>{formatINR(order.taxPaise)}</dd>
        </div>
        <div className="checkout-total">
          <dt>
            Total <small>INR</small>
          </dt>
          <dd>{formatINR(order.totalPaise)}</dd>
        </div>
      </dl>
    </aside>
  );
}
