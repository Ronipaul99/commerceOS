"use client";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Download,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type { Product } from "@tiyas/shared";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductRail } from "@/features/home/product-rail";
import { presentProduct } from "@/lib/catalog-presentation";
import { formatINR } from "@/lib/money";
import { createOrderReceipt } from "@/lib/order-receipt";
import { PaymentActions } from "./payment-actions";
import { OrderSummary } from "./order-summary";
import { usePrivateOrder } from "./use-private-order";
import {
  OrderAccessState,
  OrderHelp,
  ConfirmationHelp,
  OrderProgress,
  OrderTotals,
  StatusIllustration,
  orderDate,
  paymentLabel,
} from "./order-presentation";

export function ConfirmationPage({
  recommendations = [],
}: {
  recommendations?: Product[];
}) {
  const { order, token, setOrder, loading, error, retry } =
    usePrivateOrder("confirmation");
  if (loading || !order)
    return <OrderAccessState loading={loading} error={error} retry={retry} />;
  const accepted = order.accepted;
  const suggested = recommendations
    .filter(
      (product) => !order.items.some((item) => item.productId === product.id),
    )
    .slice(0, 6);
  function downloadReceipt() {
    if (!order?.accepted) return;
    const url = URL.createObjectURL(
      new Blob([createOrderReceipt(order)], {
        type: "text/html;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Tiyas-Jewel-${order.orderNumber.replace(/[^a-z0-9-]/gi, "")}-receipt.html`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="purchase-page order-result-page order-confirmation-page">
      <div className="purchase-shell order-result-shell">
        <header className="order-result-hero" data-accepted={accepted}>
          <StatusIllustration pending={!accepted} />
          <div>
            <p className="order-eyebrow">
              {accepted ? "A little joy, on its way" : "Your private selection"}
            </p>
            <h1>
              {accepted
                ? "Order Confirmed!"
                : order.needsReview
                  ? "Your payment needs a review."
                  : "Your selection is reserved."}
            </h1>
            <p className="order-hero-subtitle">
              {accepted
                ? "Thank you for shopping with Tiyas Jewel."
                : order.needsReview
                  ? "Our team needs to resolve your payment before accepting this order."
                  : "One more step to make it yours."}
            </p>
            <p>
              {accepted
                ? order.paymentMethod === "COD"
                  ? "Your cash on delivery order has been placed successfully."
                  : "Your payment is verified and your order has been accepted."
                : order.needsReview
                  ? "Payment was received after the stock hold ended. Please contact the store for resolution; do not pay again."
                  : "Complete your payment below. Your order is confirmed only after verification."}
            </p>
            {order.paymentAdapter === "development" && (
              <p className="order-mode-notice">
                <ShieldCheck size={15} aria-hidden="true" />
                Development order · No money collected.
              </p>
            )}
          </div>
        </header>
        {error && (
          <p className="shopping-warning" role="alert">
            {error}
          </p>
        )}
        {accepted ? (
          <div className="order-confirmed-grid">
            <section
              className="order-panel order-details-panel"
              aria-labelledby="order-details-title"
            >
              <h2 id="order-details-title">
                <ShoppingBag size={26} strokeWidth={1.4} aria-hidden="true" />
                Order details
              </h2>
              <dl className="order-facts">
                <div>
                  <dt>
                    <ClipboardList aria-hidden="true" />
                    Order ID
                  </dt>
                  <dd className="order-id">{order.orderNumber}</dd>
                </div>
                {order.createdAt && (
                  <div>
                    <dt>
                      <CalendarDays aria-hidden="true" />
                      Order date · IST
                    </dt>
                    <dd>
                      <time dateTime={order.createdAt}>
                        {orderDate(order.createdAt)}
                      </time>
                    </dd>
                  </div>
                )}
                <div>
                  <dt>
                    <CreditCard aria-hidden="true" />
                    Payment
                  </dt>
                  <dd>
                    <span
                      className="order-payment-badge"
                      data-status={order.paymentStatus}
                    >
                      {paymentLabel(order)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>
                    <span className="order-rupee" aria-hidden="true">
                      ₹
                    </span>
                    {order.paymentMethod === "COD"
                      ? "Due on delivery"
                      : order.paymentAdapter === "development"
                        ? "Order total"
                        : "Total paid"}
                  </dt>
                  <dd className="order-fact-total">
                    {formatINR(order.totalPaise)}
                  </dd>
                </div>
              </dl>
              <section
                className="order-delivery confirmation-address"
                aria-labelledby="delivery-address-title"
              >
                <MapPin size={26} strokeWidth={1.4} aria-hidden="true" />
                <div className="order-delivery-copy">
                  <h3 id="delivery-address-title">Delivery address</h3>
                  <div className="order-delivery-content">
                    <div>
                      <strong>{order.customer.fullName}</strong>
                      <address>
                        {[order.address.line1, order.address.line2]
                          .filter(Boolean)
                          .join(", ")}
                        <br />
                        {order.address.landmark && (
                          <>
                            {order.address.landmark}
                            <br />
                          </>
                        )}
                        {order.address.city}, {order.address.state} –{" "}
                        {order.address.pinCode}
                        {" · India"}
                      </address>
                    </div>
                    <div className="order-delivery-contact">
                      <a
                        className="order-phone"
                        href={`tel:+91${order.customer.mobile}`}
                      >
                        <Phone size={15} aria-hidden="true" />
                        +91 {order.customer.mobile}
                      </a>
                      <p className="order-customer-email">
                        {order.customer.email}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              <section
                className="order-confirmed-items"
                aria-labelledby="order-items-title"
              >
                <h3 id="order-items-title">
                  <ShoppingBag size={24} aria-hidden="true" />
                  Order items (
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)})
                </h3>
                <ul>
                  {order.items.map((item) => (
                    <li key={`${item.productId}:${item.variantId}`}>
                      <div className="order-line-image">
                        <ResponsiveImage
                          src={item.image ?? "/images/catalog-placeholder.svg"}
                          alt={item.name}
                          sizes="100px"
                        />
                      </div>
                      <div>
                        <h4>{item.name}</h4>
                        <p>
                          {item.variant && (
                            <>
                              {item.variant}
                              <span aria-hidden="true"> · </span>
                            </>
                          )}
                          Qty: {item.quantity}
                        </p>
                        <p>
                          {formatINR(item.unitPricePaise)} each
                          {item.sku && (
                            <span className="order-line-sku">
                              {" "}
                              · {item.sku}
                            </span>
                          )}
                        </p>
                        {item.concept && <small>Concept image</small>}
                        {order.operationalStatus === "COMPLETED" && (
                          <Link className="experience-text-button" href={`/products/${item.slug}#write-product-review`}>
                            Review this piece
                          </Link>
                        )}
                      </div>
                      <strong>{formatINR(item.lineTotalPaise)}</strong>
                    </li>
                  ))}
                </ul>
              </section>
              <section
                className="order-confirmed-summary"
                aria-label="Order summary"
              >
                <h3>Order summary</h3>
                <OrderTotals order={order} />
              </section>
            </section>
            <div className="order-side-column">
              <OrderProgress order={order} onRefresh={retry} />
              <ConfirmationHelp />
              <div className="order-followup-actions">
                <Link className="purchase-button" href="/shop">
                  Continue shopping
                  <ArrowRight size={19} aria-hidden="true" />
                </Link>
                <button
                  className="purchase-button order-button-secondary"
                  onClick={downloadReceipt}
                >
                  <Download size={19} aria-hidden="true" />
                  Download order receipt
                </button>
                <p className="order-fine-print">
                  A record of your order, not a tax invoice. You can print or
                  save it as PDF after opening.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="order-awaiting-grid">
            <section
              className="order-panel order-awaiting-payment"
              aria-labelledby="payment-title"
            >
              <h2 id="payment-title">
                <CreditCard size={25} aria-hidden="true" />
                {order.needsReview
                  ? "Payment received · review needed"
                  : "Complete your payment"}
              </h2>
              <PaymentActions order={order} token={token} onChange={setOrder} />
              <OrderHelp />
              <Link className="order-text-link" href="/cart">
                Back to bag
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </section>
            <OrderSummary order={order} />
          </div>
        )}
        {accepted && suggested.length > 0 && (
          <section
            className="order-panel order-recommendations"
            aria-labelledby="order-recommendations-title"
          >
            <h2 id="order-recommendations-title">
              <Sparkles size={24} aria-hidden="true" />
              You may also like
            </h2>
            <ProductRail label="Order recommendations">
              {suggested.map((product) => (
                <ProductCard
                  key={product.id}
                  product={presentProduct(product)}
                />
              ))}
            </ProductRail>
          </section>
        )}
        <p className="order-privacy-note">
          Keep this private link safe. Anyone with the link can view your order
          details.
        </p>
      </div>
    </section>
  );
}
