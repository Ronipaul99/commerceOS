"use client";
import { useState } from "react";
import type { OrderView } from "@tiyas/shared";
import { checkoutApi } from "@/lib/checkout-client";
type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open(): void;
      on(event: string, callback: () => void): void;
    };
  }
}
let script: Promise<void> | undefined;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (!script)
    script = new Promise<void>((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = "https://checkout.razorpay.com/v1/checkout.js";
      tag.onload = () => resolve();
      tag.onerror = () => {
        tag.remove();
        script = undefined;
        reject(
          new Error(
            "The secure payment window could not load. Check your connection and retry.",
          ),
        );
      };
      document.head.append(tag);
    });
  return script;
}
export function PaymentActions({
  order,
  token,
  onChange,
}: {
  order: OrderView;
  token: string;
  onChange: (order: OrderView) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(job: () => Promise<{ data: OrderView }>) {
    setBusy(true);
    setError("");
    try {
      onChange((await job()).data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Payment status could not be checked.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function online() {
    if (!order.keyId || !order.gatewayOrderId) return;
    setBusy(true);
    setError("");
    try {
      await loadRazorpay();
      if (!window.Razorpay) throw new Error("Payment window is unavailable.");
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.totalPaise,
        currency: "INR",
        order_id: order.gatewayOrderId,
        name: "TIYAS JEWEL",
        description: "Razorpay test payment",
        prefill: {
          name: order.customer.fullName,
          email: order.customer.email,
          contact: `+91${order.customer.mobile}`,
        },
        theme: { color: "#650F2A" },
        handler: (response) => {
          void run(() => checkoutApi.verify(token, response));
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError(
              "The payment window was closed. Check payment status before starting again.",
            );
          },
        },
      });
      checkout.on("payment.failed", () => {
        void run(() => checkoutApi.reconcile(token));
      });
      checkout.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open payment.");
      setBusy(false);
    }
  }
  if (order.accepted || order.needsReview || order.paymentMethod === "COD")
    return null;
  return (
    <div className="payment-actions">
      {order.paymentStatus === "PENDING" &&
        order.paymentAdapter === "development" && (
          <div className="development-payment">
            <p className="eyebrow">Development payment simulator</p>
            <p>
              No money is collected. These controls only test the local order
              flow.
            </p>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => {
                void run(() => checkoutApi.development(token, "success"));
              }}
            >
              Simulate successful payment
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                void run(() => checkoutApi.development(token, "failure"));
              }}
            >
              Simulate failed payment
            </button>
          </div>
        )}
      {order.paymentStatus === "PENDING" &&
        order.paymentAdapter === "razorpay" && (
          <>
            <p className="shopping-warning">
              Razorpay test mode. No real payment will be collected.
            </p>
            <button
              className="button button-primary"
              disabled={busy || !order.gatewayOrderId}
              onClick={() => {
                void online();
              }}
            >
              Continue to secure test payment
            </button>
          </>
        )}
      <button
        className="button button-secondary"
        disabled={busy}
        onClick={() => {
          void run(() => checkoutApi.reconcile(token));
        }}
      >
        {busy ? "Checking payment..." : "Check payment status"}
      </button>
      {order.reservationExpiresAt && (
        <p>
          Pieces are held until{" "}
          {new Date(order.reservationExpiresAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          . Payment is confirmed only after server verification.
        </p>
      )}
      {error && (
        <p className="shopping-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
