"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star, ShieldCheck } from "lucide-react";
import { z } from "zod";
import {
  reviewListSchema,
  experienceSettingsSchema,
  reviewSubmitSchema,
  type PublicReview,
} from "@tiyas/shared";
import { experienceRequest } from "@/lib/experience-client";
export function RatingSummary({
  average,
  count,
}: {
  average: number | null;
  count: number;
}) {
  return count && average !== null ? (
    <span
      className="experience-rating"
      aria-label={`${average.toFixed(1)} out of 5 from ${count} ratings`}
    >
      <Star size={16} fill="currentColor" aria-hidden="true" />{" "}
      {average.toFixed(1)}{" "}
      <span>
        ({count} {count === 1 ? "rating" : "ratings"})
      </span>
    </span>
  ) : null;
}
export function ReviewCard({ review: r }: { review: PublicReview }) {
  return (
    <article className="experience-review">
      <div>
        {r.rating !== null && (
          <span
            className="experience-rating"
            aria-label={`${r.rating} out of 5`}
          >
            <Star size={16} fill="currentColor" aria-hidden="true" />
            {r.rating.toFixed(1)}
          </span>
        )}{" "}
        {r.verifiedPurchase && (
          <small>
            <ShieldCheck size={14} aria-hidden="true" /> Verified purchase
          </small>
        )}
      </div>
      {r.title && <h3>{r.title}</h3>}
      <p>{r.text}</p>
      <footer>
        <strong>{r.displayName}</strong>
        <time dateTime={r.createdAt}>
          {new Date(r.createdAt).toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}
        </time>
      </footer>
      {r.productSlug && (
        <Link href={`/products/${r.productSlug}`}>{r.productName}</Link>
      )}
    </article>
  );
}
export function ReviewForm({
  product,
}: {
  product?: { id: string; slug: string };
}) {
  const [step, setStep] = useState<"email" | "code" | "review" | "done">(
      "email",
    ),
    [challenge, setChallenge] = useState(""),
    [grant, setGrant] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [draft, setDraft] = useState({
    displayName: "",
    title: "",
    text: "",
    rating: null as number | null,
    consent: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (step !== "email")
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [step]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      v = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    try {
      if (step === "email") {
        const r = await experienceRequest(
          "/reviews/challenges",
          z.object({ data: z.object({ challengeId: z.string() }) }),
          {
            email: v.email,
            kind: product ? "PRODUCT" : "STORE",
            ...(product ? { productId: product.id } : {}),
          },
        );
        setChallenge(r.data.challengeId);
        setStep("code");
      } else if (step === "code") {
        const r = await experienceRequest(
          "/reviews/challenges/verify",
          z.object({ data: z.object({ grant: z.string() }) }),
          { challengeId: challenge, code: v.code },
        );
        setGrant(r.data.grant);
        setStep("review");
      } else {
        const data = reviewSubmitSchema.parse({
          grant,
          displayName: v.displayName,
          title: v.title ?? "",
          text: v.text,
          rating: v.rating ? Number(v.rating) : null,
          consent: v.consent === "on",
        });
        setDraft({
          displayName: data.displayName,
          title: data.title,
          text: data.text,
          rating: data.rating,
          consent: data.consent,
        });
        await experienceRequest(
          product
            ? `/products/${encodeURIComponent(product.slug)}/reviews`
            : "/store-reviews",
          z.object({ data: z.object({ status: z.literal("PENDING") }) }),
          data,
        );
        setStep("done");
      }
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? e.issues.map((x) => x.message).join(" ")
          : e instanceof Error
            ? e.message
            : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (step === "done")
    return (
      <p role="status" className="experience-notice">
        Thank you. Your feedback has been submitted for moderation.
      </p>
    );
  return (
    <form
      key={step}
      ref={formRef}
      className="experience-form"
      onSubmit={submit}
      aria-busy={busy}
    >
      <h3>{product ? "Review this piece" : "Share your Tiyas experience"}</h3>
      <p>Your email stays private. Reviews appear after moderation.</p>
      {step === "email" ? (
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            maxLength={254}
          />
        </label>
      ) : step === "code" ? (
        <>
          <label>
            Email verification code
            <input
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
            />
          </label>
          <button
            type="button"
            className="experience-text-button"
            onClick={() => {
              setStep("email");
              setError("");
            }}
          >
            Request another code
          </button>
        </>
      ) : (
        <>
          <label>
            Public display name
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={80}
              defaultValue={draft.displayName}
            />
          </label>
          <fieldset className="experience-stars">
            <legend>
              {product ? "Your rating" : "Overall rating (optional)"}
            </legend>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n}>
                <input
                  name="rating"
                  type="radio"
                  value={n}
                  required={!!product}
                  defaultChecked={draft.rating === n}
                />
                <span>
                  <Star size={19} aria-hidden="true" />
                  {n}
                </span>
              </label>
            ))}
          </fieldset>
          <label>
            Review title (optional)
            <input name="title" maxLength={120} defaultValue={draft.title} />
          </label>
          <label>
            Your experience
            <textarea
              name="text"
              required
              minLength={20}
              maxLength={3000}
              rows={4}
              defaultValue={draft.text}
            />
          </label>
          <label className="experience-check">
            <input
              name="consent"
              type="checkbox"
              required
              defaultChecked={draft.consent}
            />
            I agree to publish my display name and feedback. My email will
            remain private.
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="experience-error">
          {error}
        </p>
      )}
      {error && step === "review" && (
        <button
          type="button"
          className="experience-text-button"
          onClick={() => {
            setStep("email");
            setError("");
          }}
        >
          Verify email again (keep my review)
        </button>
      )}
      <button className="experience-primary" disabled={busy}>
        {busy
          ? "Please wait…"
          : step === "email"
            ? "Send verification code"
            : step === "code"
              ? "Verify email"
              : "Submit for review"}
      </button>
    </form>
  );
}
export function Reviews({
  product,
  initialData = null,
  initialEnabled = false,
}: {
  product?: { id: string; slug: string };
  initialData?: z.infer<typeof reviewListSchema>["data"] | null;
  initialEnabled?: boolean;
}) {
  const productSlug = product?.slug;
  const [page, setPage] = useState(1),
    [sort, setSort] = useState("newest"),
    [rating, setRating] = useState(""),
    [kind, setKind] = useState("STORE"),
    [data, setData] = useState<z.infer<typeof reviewListSchema>["data"] | null>(
      initialData,
    ),
    [enabled, setEnabled] = useState(initialEnabled),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    void experienceRequest(
      "/experience/settings",
      experienceSettingsSchema,
      undefined,
      abort.signal,
    )
      .then((r) => setEnabled(r.data.reviews))
      .catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    const path = productSlug
      ? `/products/${encodeURIComponent(productSlug)}/reviews`
      : "/store-reviews";
    void experienceRequest(
      `${path}?page=${page}&sort=${sort}${!productSlug ? `&kind=${kind}` : ""}${rating ? `&rating=${rating}` : ""}`,
      reviewListSchema,
      undefined,
      abort.signal,
    )
      .then((r) => {
        setData(r.data);
        setError("");
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [page, sort, rating, productSlug, kind]);
  return (
    <section
      className="experience-section"
      id="customer-reviews"
      aria-labelledby="reviews-heading"
    >
      <div className="experience-section-heading">
        <div>
          <p className="experience-eyebrow">Your stories, in your words</p>
          <h2 id="reviews-heading">
            {product
              ? "Customer reviews"
              : kind === "PRODUCT"
                ? "Reviews of our jewellery"
                : "Shopping with Tiyas"}
          </h2>
          {data && (
            <RatingSummary
              average={data.summary.average}
              count={data.summary.count}
            />
          )}
        </div>
        <div className="experience-filters">
          {!product && (
            <label>
              Feedback
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setPage(1);
                }}
              >
                <option value="STORE">Store experience</option>
                <option value="PRODUCT">Product reviews</option>
              </select>
            </label>
          )}
          <label>
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
            </select>
          </label>
          <label>
            Rating
            <select
              value={rating}
              onChange={(e) => {
                setRating(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option value={n} key={n}>
                  {n} stars
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {data && data.summary.count > 0 && (
        <div className="experience-distribution">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n}>
              <span>{n} stars</span>
              <progress
                max={data.summary.count}
                value={data.summary.distribution[n - 1]}
              />
              <span>{data.summary.distribution[n - 1]}</span>
            </div>
          ))}
        </div>
      )}
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <div className="experience-skeleton" aria-label="Loading reviews" />
      ) : data.items.length ? (
        <div className="experience-review-grid">
          {data.items.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      ) : (
        <p className="experience-notice">
          {data?.summary.count
            ? "No reviews match this rating."
            : "No published reviews yet. Your experience can help someone find their piece."}
        </p>
      )}
      {data && data.totalPages > 1 && (
        <nav className="experience-pagination" aria-label="Review pages">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </nav>
      )}
      {enabled && (product || kind === "STORE") && (
        <ReviewForm product={product} />
      )}
      {!product && kind === "PRODUCT" && (
        <p>
          To review a piece, open its product page.{" "}
          <Link href="/shop">Explore the shop &rarr;</Link>
        </p>
      )}
    </section>
  );
}
