"use client";
import { useId, useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
export function NewsletterForm() {
  const id = useId();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <form
      className="newsletter-form"
      noValidate
      onSubmit={(event) => {
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
          placeholder="Your email address"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-feedback`}
          maxLength={254}
        />
        <button type="submit" aria-label="Preview newsletter signup">
          Join the circle <ArrowRight size={14} aria-hidden="true" />
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
