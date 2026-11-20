"use client";
import { useId, useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
export function NewsletterForm({
  endpoint = null,
}: {
  endpoint?: string | null;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <form
      className="newsletter-form"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setNotice("");
        const email = new FormData(event.currentTarget).get("email");
        if (
          !z.email().safeParse(typeof email === "string" ? email.trim() : email)
            .success
        ) {
          setError("Please enter a valid email address.");
          document.getElementById(id)?.focus();
          return;
        }
        setError("");
        if (endpoint) {
          setBusy(true);
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: String(email).trim() }),
              signal: AbortSignal.timeout(10000),
            });
            const payload: unknown = await response.json();
            if (
              !response.ok ||
              !z.object({ subscribed: z.literal(true) }).safeParse(payload)
                .success
            )
              throw new Error("Subscription was not confirmed.");
            setNotice("You are subscribed to jewellery updates.");
          } catch {
            setError(
              "We could not confirm your subscription. Please try again.",
            );
          } finally {
            setBusy(false);
          }
          return;
        }
        setNotice(
          "Thank you for your interest. Subscriptions are not open yet; your email has not been sent or saved.",
        );
      }}
    >
      <label className="sr-only" htmlFor={id}>
        Your email address
      </label>
      <div className="newsletter-input">
        <input
          id={id}
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="Your email address"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-feedback`}
          maxLength={254}
        />
        <button
          type="submit"
          disabled={busy}
          aria-label={
            endpoint
              ? "Subscribe to jewellery updates"
              : "Preview newsletter signup"
          }
        >
          {busy ? "Subscribing..." : "Subscribe"}{" "}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div id={`${id}-feedback`}>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="newsletter-feedback" role="status">
            {notice}
          </p>
        ) : null}
      </div>
    </form>
  );
}
