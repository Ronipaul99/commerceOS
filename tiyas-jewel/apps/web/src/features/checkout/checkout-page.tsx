"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  checkoutRequestSchema,
  indianStates,
  pinCodeSchema,
  type CheckoutQuote,
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
export function CheckoutPage() {
  const { cartRefs, cart, cartStatus, hydrated } = useStorefront();
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
  const attempt = useRef<ReturnType<typeof newCheckoutAttempt> | null>(null);
  const key = JSON.stringify({ cartRefs, pin });
  const quote = resolved?.key === key ? resolved.data : undefined;
  useEffect(() => {
    const saved = readPendingCheckout();
    attempt.current = saved;
    if (saved)
      checkoutApi
        .confirmation(saved.token)
        .then(() => router.replace(`/order-confirmation#${saved.token}`))
        .catch(() => setPendingToken(saved.token));
  }, [router]);
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
    return (
      <label className="checkout-field" key={name}>
        {label}
        <input
          name={name}
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
  if (!hydrated)
    return (
      <section className="checkout-page page-shell">
        <p role="status">Preparing your checkout...</p>
      </section>
    );
  if (!cartRefs.length)
    return (
      <section className="checkout-page page-shell">
        <p className="eyebrow">Guest checkout</p>
        <h1>Your bag is waiting.</h1>
        <p>Choose a piece before continuing to checkout.</p>
        <Link className="button button-primary" href="/shop">
          Explore the collection
        </Link>
      </section>
    );
  return (
    <section className="checkout-page page-shell">
      <header className="checkout-heading">
        <p className="eyebrow">The final details / Guest checkout</p>
        <h1>Make it yours.</h1>
        <p>A few details, and a piece to call your own.</p>
        <Link className="editorial-link" href="/cart">
          Back to your bag
        </Link>
      </header>
      <div className="checkout-grid">
        <form
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
            if (error === "Please check the highlighted details.") setError("");
          }}
        >
          <fieldset disabled={busy}>
            <legend>
              <span>01</span> Your details
            </legend>
            <div className="checkout-fields">
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
          </fieldset>
          <fieldset disabled={busy}>
            <legend>
              <span>02</span> Delivery address
            </legend>
            <div className="checkout-fields">
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
              <div className="checkout-field-pair">
                {field("city", "City", {
                  autoComplete: "address-level2",
                  maxLength: 80,
                })}
                <label className="checkout-field">
                  State or union territory
                  <select
                    name="state"
                    autoComplete="address-level1"
                    required
                    aria-invalid={!!issues["address.state"]}
                  >
                    <option value="">Select state</option>
                    {indianStates.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  {issues["address.state"] && (
                    <span className="field-error">
                      Select a state or union territory.
                    </span>
                  )}
                </label>
              </div>
              <div className="checkout-field-pair">
                <label className="checkout-field">
                  PIN code
                  <input
                    name="pinCode"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    required
                    aria-invalid={!!issues["address.pinCode"]}
                  />
                  {issues["address.pinCode"] && (
                    <span className="field-error">
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
          {quote && (
            <OrderSummary order={quote} className="checkout-mobile-summary" />
          )}
          <fieldset disabled={busy}>
            <legend>
              <span>03</span> Payment
            </legend>
            {quote?.paymentAdapter === "development" && (
              <p className="development-notice">
                Development checkout preview. Online payments are simulated; no
                money is collected.
              </p>
            )}
            {quote?.paymentAdapter === "razorpay" && (
              <p className="development-notice">
                Razorpay test mode. Use test payment details only.
              </p>
            )}
            <label className="payment-choice">
              <input
                type="radio"
                name="paymentMethod"
                value="ONLINE"
                checked={method === "ONLINE"}
                onChange={() => setMethod("ONLINE")}
                disabled={quote?.paymentAdapter === "disabled"}
              />
              <span>
                <strong>
                  {quote?.paymentAdapter === "development"
                    ? "Online payment - development simulator"
                    : "Razorpay online payment"}
                </strong>
                <small>
                  {quote?.paymentAdapter === "disabled"
                    ? "Currently unavailable"
                    : "Continue to the payment step after reviewing your order."}
                </small>
              </span>
            </label>
            {quote?.codEnabled && (
              <label className="payment-choice">
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
              </label>
            )}
          </fieldset>
          {error && (
            <p className="shopping-warning" role="alert" tabIndex={-1}>
              {error}
            </p>
          )}
          {resolved?.key === key && resolved.error && (
            <p className="shopping-warning" role="alert">
              {resolved.error}
            </p>
          )}
          <button
            className="button button-primary checkout-submit"
            disabled={
              busy ||
              !quote ||
              (method === "ONLINE" && quote.paymentAdapter === "disabled")
            }
            type="submit"
          >
            {busy
              ? "Securing your selection..."
              : method === "COD"
                ? "Place cash on delivery order"
                : "Continue to payment"}
          </button>
          <p className="checkout-note">
            Guest checkout. Delivery is arranged by Tiyas Jewel. Your total is
            verified again before your selection is secured.
          </p>
          {pendingToken && (
            <Link
              className="editorial-link"
              href={`/order-confirmation#${pendingToken}`}
            >
              Check an existing payment attempt
            </Link>
          )}
        </form>
        {quote ? (
          <OrderSummary order={quote} className="checkout-desktop-summary" />
        ) : (
          <aside className="checkout-summary checkout-desktop-summary">
            <p className="eyebrow">Your considered selection</p>
            <h2>Order summary</h2>
            <p>
              {cartRefs.reduce((n, i) => n + i.quantity, 0)} piece(s) in your
              bag.
            </p>
            {cartStatus === "ready" && (
              <p>Merchandise subtotal: {formatINR(cart.subtotalPaise)}</p>
            )}
            <p role="status">
              Enter a valid delivery PIN code to confirm availability, shipping
              and the final total.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
}
