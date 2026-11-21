"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  checkoutRequestSchema,
  indianStates,
  pinCodeSchema,
  type CheckoutQuote,
  type OrderView,
  confirmationTokenSchema,
} from "@tiyas/shared";
import { useStorefront } from "@/components/storefront/storefront-provider";
import {
  checkoutApi,
  CheckoutClientError,
  readPendingCheckout,
  newCheckoutAttempt,
  pendingCheckoutKey,
} from "@/lib/checkout-client";
import { OrderSummary } from "./order-summary";
import { formatINR } from "@/lib/money";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  PurchaseBenefits,
  PurchaseHelp,
  PurchaseSteps,
} from "@/components/storefront/purchase-ui";
import { CheckoutPreview } from "./checkout-preview";
export function CheckoutPage() {
  const { cartRefs, cart, cartStatus, hydrated, restoreCartItems } =
    useStorefront();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [method, setMethod] = useState<"ONLINE" | "COD">("ONLINE");
  const [resolved, setResolved] = useState<{
    key: string;
    data?: CheckoutQuote;
    error?: string;
  } | null>(null);
  const [pendingToken, setPendingToken] = useState("");
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(true);
  const [recoveryOrder, setRecoveryOrder] = useState<OrderView | null>(null);
  const [recoveryError, setRecoveryError] = useState("");
  const restore = useRef(restoreCartItems);
  useEffect(() => {
    restore.current = restoreCartItems;
  }, [restoreCartItems]);
  const attempt = useRef<ReturnType<typeof newCheckoutAttempt> | null>(null);
  const key = JSON.stringify({ cartRefs, pin });
  const quote = resolved?.key === key ? resolved.data : undefined;
  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const saved = readPendingCheckout();
    attempt.current = saved;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const retryToken = fragment.get("retry");
    void (async () => {
      if (saved && (!retryToken || saved.token !== retryToken)) {
        try {
          await checkoutApi.confirmation(saved.token);
          if (active) router.replace(`/order-confirmation#${saved.token}`);
        } catch {
          if (active) setPendingToken(saved.token);
        }
        return;
      }
      if (!retryToken) return;
      if (!confirmationTokenSchema.safeParse(retryToken).success)
        throw new Error(
          "This private retry link is invalid. Please return to your bag.",
        );
      const { data } = await checkoutApi.reconcile(retryToken);
      if (!active) return;
      if (
        data.accepted ||
        data.needsReview ||
        data.paymentStatus !== "FAILED"
      ) {
        router.replace(`/order-confirmation#${retryToken}`);
        return;
      }
      const restored = await restore.current(
        data.items.map(({ productId, slug, variantId, quantity }) => ({
          productId,
          slug,
          variantId,
          quantity,
        })),
      );
      if (!active) return;
      if (!restored)
        throw new Error(
          "Your selection could not be restored. Please review your bag and try again.",
        );
      attempt.current = null;
      if (readPendingCheckout()?.token === retryToken)
        sessionStorage.removeItem(pendingCheckoutKey);
      setPendingToken("");
      setRecoveryOrder(data);
      setPin(data.address.pinCode);
      setMethod("ONLINE");
    })()
      .catch((error) => {
        if (active)
          setRecoveryError(
            error instanceof Error
              ? error.message
              : "Your checkout could not be restored.",
          );
      })
      .finally(() => {
        if (active) setRecovering(false);
      });
    return () => {
      active = false;
    };
  }, [router, hydrated]);
  useEffect(() => {
    if (
      !recoveryOrder ||
      recovering ||
      new URLSearchParams(window.location.hash.slice(1)).get("method") !==
        "choose"
    )
      return;
    const frame = requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>(
        ".checkout-payment-panel",
      );
      panel?.scrollIntoView({ block: "center", behavior: "instant" });
      panel
        ?.querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [recoveryOrder, recovering]);
  useEffect(() => {
    if (!hydrated || !cartRefs.length || !pinCodeSchema.safeParse(pin).success)
      return;
    const abort = new AbortController();
    checkoutApi
      .quote(cartRefs, pin, abort.signal)
      .then((response) => setResolved({ key, data: response.data }))
      .catch((e) => {
        if (!abort.signal.aborted)
          setResolved({
            key,
            error:
              e instanceof Error
                ? e.message
                : "Delivery and totals could not be checked.",
          });
      });
    return () => abort.abort();
  }, [cartRefs, pin, key, hydrated]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIssues({});
    if (!quote) {
      setError(
        "Enter a serviceable PIN code and wait for your current total before placing an order.",
      );
      return;
    }
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!attempt.current) attempt.current = newCheckoutAttempt();
    const pending = attempt.current;
    const parsed = checkoutRequestSchema.safeParse({
      items: cartRefs,
      pinCode: pin,
      customer: {
        fullName: values.fullName,
        email: values.email,
        mobile: values.mobile,
      },
      address: {
        line1: values.line1,
        line2: values.line2,
        landmark: values.landmark,
        city: values.city,
        state: values.state,
        pinCode: pin,
        country: "IN",
      },
      paymentMethod: method,
      expectedTotalPaise: quote.totalPaise,
      quoteFingerprint: quote.fingerprint,
      idempotencyKey: pending.idempotencyKey,
      confirmationToken: pending.token,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        next[issue.path.join(".")] = issue.message;
      setIssues(next);
      setError("Please check the highlighted details.");
      const first = parsed.error.issues[0]?.path.at(-1);
      if (typeof first === "string")
        event.currentTarget
          .querySelector<HTMLInputElement>(`[name="${first}"]`)
          ?.focus();
      return;
    }
    setBusy(true);
    try {
      // Save only the access token and retry key, never the customer's address/contact details.
      sessionStorage.setItem(pendingCheckoutKey, JSON.stringify(pending));
      setPendingToken(pending.token);
      await checkoutApi.place(parsed.data);
      router.push(`/order-confirmation#${pending.token}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your checkout could not be completed. Retry safely with the same details.",
      );
      if (e instanceof CheckoutClientError && e.code === "QUOTE_CHANGED") {
        const fresh = await checkoutApi.quote(cartRefs, pin).catch(() => null);
        if (fresh) setResolved({ key, data: fresh.data });
        attempt.current = null;
        sessionStorage.removeItem(pendingCheckoutKey);
      }
    } finally {
      setBusy(false);
    }
  }
  function field(
    name: string,
    label: string,
    options: {
      autoComplete: string;
      type?: string;
      required?: boolean;
      maxLength?: number;
      path?: string;
      inputMode?: "email" | "tel" | "numeric";
    },
  ) {
    const path = options.path ?? `address.${name}`;
    const issue = issues[path];
    const recovered: Record<string, string> = {
      ...recoveryOrder?.customer,
      ...recoveryOrder?.address,
    };
    return (
      <label className={`checkout-field checkout-field-${name}`} key={name}>
        {label}
        <input
          name={name}
          defaultValue={recovered[name] ?? ""}
          aria-label={label}
          autoComplete={options.autoComplete}
          type={options.type ?? "text"}
          required={options.required !== false}
          maxLength={options.maxLength ?? 160}
          inputMode={options.inputMode}
          disabled={busy}
          aria-invalid={!!issue}
          aria-describedby={issue ? `${name}-error` : undefined}
        />
        {issue && (
          <span id={`${name}-error`} className="field-error">
            {issue}
          </span>
        )}
      </label>
    );
  }
  if (recoveryError)
    return (
      <section className="purchase-page">
        <div className="purchase-shell purchase-state">
          <h1>Let’s review your checkout.</h1>
          <p role="alert">{recoveryError}</p>
          <Link className="purchase-button" href="/cart">
            Return to bag
          </Link>
        </div>
      </section>
    );
  if (!hydrated || recovering || !cartRefs.length)
    return (
      <section className="purchase-page checkout-redesign">
        <div className="purchase-shell">
          <PurchaseSteps current="checkout" />
          <div className="purchase-state">
            <ShoppingBag size={38} strokeWidth={1.3} aria-hidden="true" />
            <h1>
              {hydrated && !recovering
                ? "Your bag is waiting."
                : "Preparing your checkout..."}
            </h1>
            <p>
              {hydrated && !recovering
                ? "Choose a piece before continuing to checkout."
                : "A moment while we prepare your selection."}
            </p>
            {hydrated && !recovering && (
              <Link className="purchase-button" href="/shop">
                Explore the collection{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  const submitAction = (
    <>
      <button
        className="purchase-button checkout-submit"
        form="guest-checkout-form"
        disabled={
          busy ||
          !quote ||
          (method === "ONLINE" && quote.paymentAdapter === "disabled")
        }
        type="submit"
      >
        <ShoppingBag size={19} aria-hidden="true" />
        <span>
          {busy
            ? "Securing your selection..."
            : method === "COD"
              ? "Place cash on delivery order"
              : "Continue to payment"}
        </span>
        <ArrowRight size={19} aria-hidden="true" />
      </button>
      <p className="checkout-note">
        Your total is verified again before your selection is secured.
      </p>
    </>
  );
  return (
    <section className="purchase-page checkout-page checkout-redesign">
      <div className="purchase-shell">
        <div className="checkout-topline">
          <Link className="purchase-back" href="/cart">
            <ArrowLeft size={19} aria-hidden="true" />
            Back to bag
          </Link>
          <PurchaseSteps current="checkout" />
        </div>
        <header className="checkout-intro">
          <span className="purchase-heading-icon">
            <ShieldCheck size={36} strokeWidth={1.4} aria-hidden="true" />
          </span>
          <div>
            <h1>Secure Checkout</h1>
            <p>A few final details for your considered selection.</p>
          </div>
          <div className="checkout-guest-label">
            <UserRound size={26} strokeWidth={1.4} aria-hidden="true" />
            <span>
              <strong>Checkout as a guest</strong>
              <small>No account needed</small>
            </span>
          </div>
        </header>
        {recoveryOrder && (
          <p className="checkout-recovery-note" role="status">
            Your previous selection and delivery details are ready. Review your
            current total and payment method before placing a new order.
          </p>
        )}
        <div className="checkout-grid">
          <form
            id="guest-checkout-form"
            className="checkout-form"
            onSubmit={submit}
            noValidate
            onChange={(event) => {
              const target: EventTarget = event.target;
              if (!(
                target instanceof HTMLInputElement ||
                target instanceof HTMLSelectElement
              ))
                return;
              const name = target.name;
              const path = `${["fullName", "email", "mobile"].includes(name) ? "customer" : "address"}.${name}`;
              setIssues((current) => {
                const next = { ...current };
                delete next[path];
                return next;
              });
              if (error === "Please check the highlighted details.")
                setError("");
            }}
          >
            <fieldset
              className="purchase-panel checkout-address-panel"
              disabled={busy}
            >
              <legend>
                <span className="purchase-icon">
                  <MapPin size={23} aria-hidden="true" />
                </span>
                Delivery Address
              </legend>
              <div className="checkout-panel-content">
                <p className="checkout-form-caption">
                  Where should we send your jewellery?
                </p>
                <div className="checkout-fields checkout-contact-fields">
                  {field("fullName", "Full name", {
                    autoComplete: "name",
                    path: "customer.fullName",
                    maxLength: 100,
                  })}
                  {field("email", "Email address", {
                    autoComplete: "email",
                    type: "email",
                    inputMode: "email",
                    path: "customer.email",
                    maxLength: 254,
                  })}
                  {field("mobile", "Indian mobile number", {
                    autoComplete: "tel-national",
                    type: "tel",
                    inputMode: "tel",
                    path: "customer.mobile",
                    maxLength: 14,
                  })}
                </div>
                <div className="checkout-address-divider">
                  <span>Your delivery details</span>
                </div>
                <div className="checkout-fields checkout-address-fields">
                  {field("line1", "Address line 1", {
                    autoComplete: "address-line1",
                  })}
                  {field("line2", "Address line 2 (optional)", {
                    autoComplete: "address-line2",
                    required: false,
                  })}
                  {field("landmark", "Landmark (optional)", {
                    autoComplete: "off",
                    required: false,
                    maxLength: 120,
                  })}
                  {field("city", "City", {
                    autoComplete: "address-level2",
                    maxLength: 80,
                  })}
                  <label className="checkout-field">
                    State or union territory
                    <select
                      name="state"
                      defaultValue={recoveryOrder?.address.state ?? ""}
                      autoComplete="address-level1"
                      required
                      aria-invalid={!!issues["address.state"]}
                      aria-describedby={
                        issues["address.state"] ? "state-error" : undefined
                      }
                    >
                      <option value="">Select state</option>
                      {indianStates.map((state) => (
                        <option key={state}>{state}</option>
                      ))}
                    </select>
                    {issues["address.state"] && (
                      <span id="state-error" className="field-error">
                        Select a state or union territory.
                      </span>
                    )}
                  </label>
                  <label className="checkout-field">
                    PIN code
                    <input
                      name="pinCode"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(event) =>
                        setPin(event.target.value.replace(/[^0-9]/g, ""))
                      }
                      required
                      aria-invalid={!!issues["address.pinCode"]}
                      aria-describedby={
                        issues["address.pinCode"] ? "pinCode-error" : undefined
                      }
                    />
                    {issues["address.pinCode"] && (
                      <span id="pinCode-error" className="field-error">
                        {issues["address.pinCode"]}
                      </span>
                    )}
                  </label>
                  <label className="checkout-field">
                    Country
                    <input value="India" readOnly autoComplete="country-name" />
                  </label>
                </div>
              </div>
            </fieldset>
            <fieldset
              className="purchase-panel checkout-delivery-panel"
              disabled={busy}
            >
              <legend>
                <span className="purchase-icon">
                  <Truck size={23} aria-hidden="true" />
                </span>
                Delivery Options
              </legend>
              <div className="checkout-panel-content">
                <div
                  className="checkout-delivery-option"
                  data-confirmed={!!quote}
                >
                  <CheckCircle2 size={21} aria-hidden="true" />
                  <div>
                    <strong>Standard delivery</strong>
                    <p>
                      {quote
                        ? "Delivery arranged by Tiyas Jewel."
                        : "Enter your PIN to check delivery and shipping."}
                    </p>
                  </div>
                  <strong>
                    {quote
                      ? quote.shippingPaise === 0
                        ? "Complimentary"
                        : formatINR(quote.shippingPaise)
                      : "To confirm"}
                  </strong>
                </div>
                {quote?.freeShippingThresholdPaise !== null &&
                  quote?.freeShippingThresholdPaise !== undefined && (
                    <p className="checkout-shipping-note">
                      Complimentary shipping on orders from{" "}
                      {formatINR(quote.freeShippingThresholdPaise)}.
                    </p>
                  )}
                {resolved?.key === key && resolved.error && (
                  <p className="shopping-warning" role="alert">
                    {resolved.error}
                  </p>
                )}
              </div>
            </fieldset>
            <fieldset
              className="purchase-panel checkout-payment-panel"
              disabled={busy}
            >
              <legend>
                <span className="purchase-icon">
                  <CreditCard size={23} aria-hidden="true" />
                </span>
                Payment Method
              </legend>
              <div className="checkout-panel-content">
                <div className="checkout-payment-layout">
                  <div className="checkout-payment-options">
                    <label
                      className="payment-choice"
                      data-selected={method === "ONLINE"}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="ONLINE"
                        checked={method === "ONLINE"}
                        onChange={() => setMethod("ONLINE")}
                        disabled={quote?.paymentAdapter === "disabled"}
                      />
                      <span>
                        <strong>Online payment</strong>
                        <small>
                          {quote?.paymentAdapter === "disabled"
                            ? "Currently unavailable"
                            : "Continue to payment"}
                        </small>
                      </span>
                      <CreditCard size={19} aria-hidden="true" />
                    </label>
                    {quote?.codEnabled && (
                      <label
                        className="payment-choice"
                        data-selected={method === "COD"}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="COD"
                          checked={method === "COD"}
                          onChange={() => setMethod("COD")}
                        />
                        <span>
                          <strong>Cash on delivery</strong>
                          <small>Pay when your jewellery arrives.</small>
                        </span>
                        <Wallet size={19} aria-hidden="true" />
                      </label>
                    )}
                  </div>
                  <div className="checkout-payment-detail">
                    <ShieldCheck
                      size={30}
                      strokeWidth={1.3}
                      aria-hidden="true"
                    />
                    <h2>
                      {method === "COD"
                        ? "Pay on arrival"
                        : "Your preferred way to pay"}
                    </h2>
                    <p>
                      {method === "COD"
                        ? "Your order will be confirmed with payment due on delivery."
                        : quote?.paymentAdapter === "development"
                          ? "Preview the online payment flow using the development simulator."
                          : quote?.paymentAdapter === "razorpay"
                            ? "Choose an available payment option in the Razorpay test checkout."
                            : "Review your total before continuing to the payment step."}
                    </p>
                  </div>
                </div>
                {quote?.paymentAdapter === "development" && (
                  <p className="development-notice">
                    Development checkout preview. Online payments are simulated;
                    no money is collected.
                  </p>
                )}
                {quote?.paymentAdapter === "razorpay" && (
                  <p className="development-notice">
                    Razorpay test mode. Use test payment details only.
                  </p>
                )}
              </div>
            </fieldset>
            {error && (
              <p
                className="shopping-warning checkout-error"
                role="alert"
                tabIndex={-1}
              >
                {error}
              </p>
            )}
            {pendingToken && (
              <Link
                className="editorial-link"
                href={`/order-confirmation#${pendingToken}`}
              >
                Check an existing payment attempt
              </Link>
            )}
          </form>
          <div className="checkout-order-column">
            {quote ? (
              <OrderSummary order={quote} purchaseLayout>
                {submitAction}
              </OrderSummary>
            ) : (
              <CheckoutPreview
                cart={cart}
                status={cartStatus}
                count={cartRefs.reduce((sum, item) => sum + item.quantity, 0)}
              >
                {submitAction}
              </CheckoutPreview>
            )}
            <PurchaseHelp />
            <p className="checkout-arrangement-note">
              <Truck size={16} aria-hidden="true" />
              Shipping is arranged manually by Tiyas Jewel.
            </p>
          </div>
        </div>
        <PurchaseBenefits />
      </div>
    </section>
  );
}
