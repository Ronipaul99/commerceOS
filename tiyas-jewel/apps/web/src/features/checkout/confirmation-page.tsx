"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmationTokenSchema, type OrderView } from "@tiyas/shared";
import {
  checkoutApi,
  readPendingCheckout,
  pendingCheckoutKey,
} from "@/lib/checkout-client";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { PaymentActions } from "./payment-actions";
import { OrderSummary } from "./order-summary";
export function ConfirmationPage() {
  const [token, setToken] = useState("");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { completePurchase, hydrated } = useStorefront();
  const complete = useRef(completePurchase);
  const router = useRouter();
  useEffect(() => {
    complete.current = completePurchase;
  }, [completePurchase]);
  useEffect(() => {
    let active = true;
    const value =
      window.location.hash.slice(1) || readPendingCheckout()?.token || "";
    const parsed = confirmationTokenSchema.safeParse(value);
    if (!parsed.success) {
      queueMicrotask(() => {
        if (active) {
          setError("This private order link is missing or invalid.");
          setLoading(false);
        }
      });
      return;
    }
    checkoutApi
      .confirmation(parsed.data)
      .then((response) => {
        if (active) {
          setToken(parsed.data);
          setOrder(response.data);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Your order could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydrated || !order?.accepted || readPendingCheckout()?.token !== token)
      return;
    complete.current(
      order.items.map((i) => ({
        productId: i.productId,
        slug: i.slug,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      order.orderNumber,
    );
    try {
      sessionStorage.removeItem(pendingCheckoutKey);
    } catch {
      /* Purchase is recorded; local storage may be unavailable. */
    }
  }, [order, token, hydrated]);
  useEffect(() => {
    if (
      !order ||
      order.paymentStatus !== "PENDING" ||
      order.paymentAdapter !== "razorpay"
    )
      return;
    let active = true;
    let busy = false;
    const interval = setInterval(() => {
      if (!busy) {
        busy = true;
        checkoutApi
          .reconcile(token)
          .then((r) => {
            if (active) {
              setOrder(r.data);
              setError("");
            }
          })
          .catch(() => {
            if (active)
              setError(
                "Automatic status checking is delayed. You can check again below.",
              );
          })
          .finally(() => {
            busy = false;
          });
      }
    }, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [order?.paymentStatus, order?.paymentAdapter, token, order]);
  if (loading)
    return (
      <section className="checkout-page page-shell">
        <p role="status">Retrieving your private order...</p>
      </section>
    );
  if (!order)
    return (
      <section className="checkout-page page-shell">
        <h1>Your private order.</h1>
        <p role="alert">{error}</p>
        <Link className="button button-primary" href="/shop">
          Return to the collection
        </Link>
      </section>
    );
  return (
    <section className="checkout-page confirmation-page page-shell">
      <header className="checkout-heading">
        <p className="eyebrow">
          {order.paymentAdapter === "development"
            ? "Development order / No money collected"
            : "Your Tiyas Jewel order"}
        </p>
        <h1>
          {order.accepted
            ? "A lovely choice."
            : order.needsReview
              ? "We are reviewing your payment."
              : order.paymentStatus === "FAILED"
                ? "Payment was not completed."
                : "Your selection is reserved."}
        </h1>
        <p>
          {order.accepted
            ? order.paymentMethod === "COD"
              ? "Your cash on delivery order has been placed."
              : "Your payment has been verified and your order is confirmed."
            : order.needsReview
              ? "Payment was received after the stock hold ended. Your order is not accepted for fulfilment; the store must arrange resolution or a refund."
              : order.paymentStatus === "FAILED"
                ? "Your stock hold has been released. No order is ready for fulfilment."
                : "Complete payment to confirm your order. Pending attempts are not orders ready for fulfilment."}
        </p>
        <p className="order-number">{order.orderNumber}</p>
      </header>
      <div className="checkout-grid">
        <div className="confirmation-details">
          <div className="confirmation-status">
            <p className="eyebrow">Payment status</p>
            <h2>{order.paymentStatus.replaceAll("_", " ")}</h2>
            <p>
              {order.paymentMethod === "COD"
                ? "Cash on delivery"
                : order.paymentAdapter === "development"
                  ? "Development online payment simulator"
                  : "Razorpay test payment"}
            </p>
          </div>
          <PaymentActions order={order} token={token} onChange={setOrder} />
          {error && (
            <p className="shopping-warning" role="alert">
              {error}
            </p>
          )}
          <div className="confirmation-address">
            <p className="eyebrow">Delivering to</p>
            <h2>{order.customer.fullName}</h2>
            <address>
              {order.address.line1}
              <br />
              {order.address.line2 && (
                <>
                  {order.address.line2}
                  <br />
                </>
              )}
              {order.address.landmark && (
                <>
                  {order.address.landmark}
                  <br />
                </>
              )}
              {order.address.city}, {order.address.state}{" "}
              {order.address.pinCode}
              <br />
              India
            </address>
            <p>
              {order.customer.email}
              <br />
              +91 {order.customer.mobile}
            </p>
          </div>
          {order.paymentStatus === "FAILED" && (
            <button
              className="button button-primary"
              onClick={() => {
                try {
                  sessionStorage.removeItem(pendingCheckoutKey);
                } catch {}
                router.push("/checkout");
              }}
            >
              Start a new checkout
            </button>
          )}
          <Link className="editorial-link" href="/shop">
            Continue discovering
          </Link>
          <p className="checkout-note">
            Keep this private link to view your order. Anyone with the link can
            access these details.
          </p>
        </div>
        <OrderSummary order={order} />
      </div>
    </section>
  );
}
