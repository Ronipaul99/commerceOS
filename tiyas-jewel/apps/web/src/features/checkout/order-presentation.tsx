import Link from "next/link";
import {
  Check,
  Clock3,
  CreditCard,
  Headphones,
  Mail,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  X,
} from "lucide-react";
import type { OrderView } from "@tiyas/shared";
import { homepageConfig } from "@/lib/homepage-config";
import { formatINR } from "@/lib/money";

export function StatusIllustration({
  failed = false,
  pending = false,
}: {
  failed?: boolean;
  pending?: boolean;
}) {
  return (
    <div
      className={`order-illustration ${failed ? "is-failed" : "is-confirmed"}`}
      aria-hidden="true"
    >
      {failed ? (
        <>
          <div className="order-credit-card">
            <CreditCard />
          </div>
          <span className="order-failure-mark">
            <X />
          </span>
          <i />
          <i />
          <i />
        </>
      ) : (
        <div className="order-seal">{pending ? <Clock3 /> : <Check />}</div>
      )}
    </div>
  );
}
export function OrderAccessState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  return (
    <section className="purchase-page order-result-page">
      <div className="purchase-shell order-access-state">
        <ShieldCheck size={42} strokeWidth={1.3} aria-hidden="true" />
        <h1>
          {loading ? "Retrieving your private order…" : "Your private order."}
        </h1>
        {loading ? (
          <p role="status">A moment while we check your order securely.</p>
        ) : (
          <>
            <p role="alert">{error || "Your order could not be loaded."}</p>
            <button className="purchase-button" onClick={retry}>
              Try again
            </button>
            <Link className="order-text-link" href="/shop">
              Return to the collection
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
export function OrderHelp() {
  return (
    <section
      className="order-help order-panel"
      aria-labelledby="order-help-title"
    >
      <div className="order-help-heading">
        <Headphones size={30} strokeWidth={1.4} aria-hidden="true" />
        <div>
          <h2 id="order-help-title">Need a little help?</h2>
          <p>We’re here to help with your order.</p>
        </div>
      </div>
      <div className="order-help-links">
        <Link href="/info/contact">
          <Mail size={19} aria-hidden="true" />
          Contact Tiyas Jewel
        </Link>
        {homepageConfig.contact && (
          <a href={homepageConfig.contact.href}>
            {homepageConfig.contact.label}
          </a>
        )}
        <Link href="/info/shipping-returns">
          Delivery &amp; returns information
        </Link>
      </div>
    </section>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      className="order-whatsapp-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 1.5a10 10 0 0 0-8.65 15.02L2 22l5.65-1.3A10 10 0 1 0 12 1.5Z"
      />
      <path
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.2 6.8 1.7 3-1.1 1.1c.9 1.7 2.2 3 4 3.9l1.1-1.1 3 1.7c-.2 1.6-1.3 2.2-2.7 1.8-4.7-1.2-7.6-4.2-8.3-7.9-.3-1.3.5-2.4 2.3-2.5Z"
      />
    </svg>
  );
}

export function ConfirmationHelp() {
  const { whatsapp, email } = homepageConfig.orderSupport;
  return (
    <section
      className="order-help order-panel confirmation-help"
      aria-labelledby="confirmation-help-title"
    >
      <h2 id="confirmation-help-title">Need a little help?</h2>
      <div className="confirmation-support-links">
        <a
          href={
            whatsapp
              ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
              : "/info/contact"
          }
        >
          <WhatsAppIcon />
          <span>
            <strong>WhatsApp support</strong>
            <small>{whatsapp ?? "Contact coming soon"}</small>
          </span>
        </a>
        <a href={email ? `mailto:${email}` : "/info/contact"}>
          <Mail size={22} strokeWidth={1.5} aria-hidden="true" />
          <span>
            <strong>Email support</strong>
            <small>{email ?? "Contact coming soon"}</small>
          </span>
        </a>
      </div>
      <Link
        className="confirmation-delivery-link"
        href="/info/shipping-returns"
      >
        Delivery &amp; returns information
      </Link>
    </section>
  );
}
export function OrderTotals({ order }: { order: OrderView }) {
  const paid = order.accepted && order.paymentStatus === "PAID";
  return (
    <dl className="order-totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatINR(order.subtotalPaise)}</dd>
      </div>
      {order.discountPaise > 0 && (
        <div>
          <dt>Discount</dt>
          <dd>−{formatINR(order.discountPaise)}</dd>
        </div>
      )}
      <div>
        <dt>Shipping</dt>
        <dd>
          {order.shippingPaise === 0
            ? "Complimentary"
            : formatINR(order.shippingPaise)}
        </dd>
      </div>
      <div>
        <dt>Tax{order.taxMode === "inclusive" ? " (included)" : ""}</dt>
        <dd>{formatINR(order.taxPaise)}</dd>
      </div>
      <div className="order-grand-total">
        <dt>
          {paid
            ? "Order total"
            : order.paymentMethod === "COD"
              ? "Pay on delivery"
              : "Total payable"}
        </dt>
        <dd>{formatINR(order.totalPaise)}</dd>
      </div>
    </dl>
  );
}
export function paymentLabel(order: OrderView) {
  return order.paymentStatus === "COD_PENDING"
    ? "Pay on delivery"
    : order.paymentStatus === "PAID"
      ? "Paid"
      : order.paymentStatus === "FAILED"
        ? "Failed"
        : "Pending";
}
export function orderDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : "";
}
export function OrderProgress({
  order,
  onRefresh,
}: {
  order: OrderView;
  onRefresh: () => void;
}) {
  const completed = order.operationalStatus === "COMPLETED";
  return (
    <section
      className="order-panel order-progress"
      aria-labelledby="order-status-title"
    >
      <h2 id="order-status-title">
        <PackageCheck size={26} strokeWidth={1.4} aria-hidden="true" />
        Order status
      </h2>
      <ol>
        <li data-done="true">
          <span>
            <Check size={17} aria-hidden="true" />
          </span>
          <strong>Order confirmed</strong>
          {order.createdAt && (
            <time dateTime={order.createdAt}>{orderDate(order.createdAt)}</time>
          )}
        </li>
        <li data-done="true" aria-current={completed ? undefined : "step"}>
          <span>
            <PackageCheck size={17} aria-hidden="true" />
          </span>
          <strong>With Tiyas Jewel</strong>
          <p>
            {completed
              ? "Manually fulfilled by the store."
              : "Your order is awaiting manual fulfillment."}
          </p>
        </li>
        <li data-done={completed} aria-current={completed ? "step" : undefined}>
          <span>
            <ReceiptText size={17} aria-hidden="true" />
          </span>
          <strong>Fulfillment completed</strong>
          {completed && order.completedAt ? (
            <time dateTime={order.completedAt}>
              {orderDate(order.completedAt)}
            </time>
          ) : (
            <p>Updated by the store after fulfillment.</p>
          )}
        </li>
      </ol>
      <p className="order-fine-print">
        Fulfillment completion is a store update, not a courier delivery
        confirmation.
      </p>
      <button className="order-text-link order-refresh" onClick={onRefresh}>
        Refresh order status
      </button>
    </section>
  );
}
