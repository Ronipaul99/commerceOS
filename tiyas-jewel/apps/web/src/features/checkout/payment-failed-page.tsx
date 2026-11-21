"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";
import { checkoutApi } from "@/lib/checkout-client";
import { OrderSummary } from "./order-summary";
import {
  OrderAccessState,
  OrderHelp,
  StatusIllustration,
} from "./order-presentation";
import { orderDestination, usePrivateOrder } from "./use-private-order";

export function PaymentFailedPage() {
  const { order, token, setOrder, loading, error, retry } =
    usePrivateOrder("failure");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const lock = useRef(false);
  const router = useRouter();
  async function recover(chooseMethod = false, checkOnly = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    setStatusMessage("");
    try {
      const { data } = await checkoutApi.reconcile(token);
      setOrder(data);
      if (orderDestination(data) !== "/payment-failed") {
        router.replace(`/order-confirmation#${token}`);
        return;
      }
      if (checkOnly) {
        setStatusMessage(
          "Payment is still not completed. Your order has not been confirmed.",
        );
        lock.current = false;
        setBusy(false);
        return;
      }
      router.push(
        `/checkout#retry=${token}${chooseMethod ? "&method=choose" : ""}`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "We could not check your last payment. Please try again.",
      );
      lock.current = false;
      setBusy(false);
    }
  }
  if (loading || !order)
    return <OrderAccessState loading={loading} error={error} retry={retry} />;
  return (
    <section className="purchase-page order-result-page payment-failed-page">
      <div className="purchase-shell order-result-shell">
        {order.paymentAdapter === "development" && (
          <p className="order-mode-notice">
            <ShieldCheck size={17} aria-hidden="true" />
            Development payment · No money collected.
          </p>
        )}
        <div className="payment-failed-grid">
          <div className="payment-failed-message">
            <StatusIllustration failed />
            <h1>Payment Failed</h1>
            <p className="payment-failed-subtitle">
              We couldn’t complete your payment.
            </p>
            <p className="payment-failed-explanation">
              Your order hasn’t been confirmed. If your bank shows a debit,
              check your payment status before trying again.
            </p>
            <div className="payment-failed-actions">
              <button
                className="purchase-button"
                disabled={busy}
                onClick={() => void recover()}
              >
                <RotateCcw size={20} aria-hidden="true" />
                {busy ? "Checking payment…" : "Retry Payment"}
              </button>
              <button
                className="purchase-button order-button-secondary"
                disabled={busy}
                onClick={() => void recover(true)}
              >
                <CreditCard size={20} aria-hidden="true" />
                Choose another payment method
              </button>
            </div>
            <Link className="order-text-link" href="/cart">
              <ArrowLeft size={20} aria-hidden="true" />
              Back to bag
            </Link>
            <div>
              <button
                className="order-text-link order-refresh"
                disabled={busy}
                onClick={() => void recover(false, true)}
              >
                Check payment status
              </button>
            </div>
            {statusMessage && (
              <p className="order-fine-print" role="status">
                {statusMessage}
              </p>
            )}
            {(actionError || error) && (
              <p className="shopping-warning" role="alert">
                {actionError || error}
              </p>
            )}
            <p className="order-fine-print">
              We check your latest payment status before preparing a fresh
              checkout. Prices and availability are checked again.
            </p>
          </div>
          <div className="failed-order-summary">
            <div className="failed-order-id">
              <span>Payment attempt</span>
              <strong>{order.orderNumber}</strong>
            </div>
            <OrderSummary order={order} />
          </div>
        </div>
        <OrderHelp />
        <p className="order-privacy-note">
          This is a private payment link. Keep it safe when requesting
          assistance.
        </p>
      </div>
    </section>
  );
}
