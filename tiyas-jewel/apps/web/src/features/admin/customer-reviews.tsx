"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  adminReviewsSchema,
  adminStoriesSchema,
  customerStoryInputSchema,
  adminAssetSchema,
} from "@tiyas/shared";
import { useAdmin } from "./shell";
import { useAdminRouter, AdminLink as Link } from "./activity";
import { AdminHeading } from "./common";
import { AdminConfirm } from "./confirm";
import { adminOkSchema } from "@/lib/admin-client";
type ReviewRows = z.infer<typeof adminReviewsSchema>["data"];
type Story = z.infer<typeof adminStoriesSchema>["data"][number];
export function AdminCustomerReviews({
  reviews,
  stories,
}: {
  reviews: ReviewRows;
  stories: Story[];
}) {
  const search = useSearchParams();
  function filterHref(values: Record<string, string>) {
    const query = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(values)) query.set(key, value);
    return `/admin/reviews?${query}`;
  }
  const { request } = useAdmin(),
    router = useAdminRouter(),
    [action, setAction] = useState<{
      id: string;
      status: "PUBLISHED" | "PENDING" | "REJECTED";
    } | null>(null),
    [reason, setReason] = useState(""),
    [edit, setEdit] = useState<Story | null>(null),
    [epoch, setEpoch] = useState(0);
  return (
    <>
      <AdminHeading
        title="Customer Reviews"
        description="Moderate genuine feedback fairly. Only approved feedback appears publicly."
      />
      <nav className="experience-admin-tabs" aria-label="Review filters">
        {["PENDING", "PUBLISHED", "REJECTED"].map((s) => (
          <Link key={s} href={filterHref({ status: s, page: "1" })}>
            {s}
          </Link>
        ))}
        <Link href={filterHref({ kind: "PRODUCT", page: "1" })}>
          Product reviews
        </Link>
        <Link href={filterHref({ kind: "STORE", page: "1" })}>
          Store experience
        </Link>
        <Link href="/admin/reviews">All feedback</Link>
      </nav>
      <div className="experience-review-grid">
        {reviews.items.map((r) => (
          <article className="experience-review" key={r.id}>
            <small>
              {r.kind} · {r.status} · {r.rating ? `${r.rating}/5` : "No rating"}
              {r.verifiedPurchase ? " · Verified purchase" : ""}
            </small>
            <h3>{r.title || r.displayName}</h3>
            <p>{r.text}</p>
            <strong>{r.displayName}</strong>
            {r.productName && <p>{r.productName}</p>}
            <small>Record ID: {r.id}</small>
            <div className="admin-actions">
              {["PUBLISHED", "PENDING", "REJECTED"].map((s) => (
                <button
                  className="admin-button admin-button-light"
                  key={s}
                  onClick={() => {
                    setAction({
                      id: r.id,
                      status: s as "PUBLISHED" | "PENDING" | "REJECTED",
                    });
                    setReason("");
                  }}
                >
                  {s === "PUBLISHED"
                    ? "Publish"
                    : s === "PENDING"
                      ? "Unpublish"
                      : "Reject"}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      {!reviews.items.length && (
        <p className="admin-empty">No feedback matches this filter.</p>
      )}
      {reviews.totalPages > 1 && (
        <nav className="experience-pagination">
          <Link
            href={filterHref({ page: String(Math.max(1, reviews.page - 1)) })}
          >
            Previous
          </Link>
          <span>
            {reviews.page} / {reviews.totalPages}
          </span>
          <Link
            href={filterHref({
              page: String(Math.min(reviews.totalPages, reviews.page + 1)),
            })}
          >
            Next
          </Link>
        </nav>
      )}
      <label>
        Moderation reason (internal)
        <input
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <AdminConfirm
        open={!!action}
        onClose={() => setAction(null)}
        title="Update review publication?"
        description="Publish genuine feedback regardless of whether its rating is positive or negative. Unpublishing also hides linked customer stories."
        label="Confirm moderation"
        onConfirm={async () => {
          if (action)
            await request(`/reviews/${action.id}`, adminOkSchema, {
              method: "PATCH",
              body: { status: action.status, reason },
            });
          router.refresh();
        }}
      />
      <section className="experience-section">
        <div className="experience-section-heading">
          <h2>Happy customer stories</h2>
          <button
            className="admin-button"
            onClick={() => {
              setEdit(null);
              setEpoch((n) => n + 1);
            }}
          >
            New story
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Story</th>
                <th>Customer</th>
                <th>Published</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {stories.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.displayName}</td>
                  <td>{s.published ? "Yes" : "No"}</td>
                  <td>
                    <button className="admin-link" onClick={() => setEdit(s)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <StoryForm key={`${edit?.id ?? "new"}-${epoch}`} initial={edit} />
      </section>
    </>
  );
}
function StoryForm({ initial }: { initial: Story | null }) {
  const { request } = useAdmin(),
    router = useAdminRouter(),
    [image, setImage] = useState(initial?.imageAssetId ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const result = await request(
        "/images",
        z.object({ data: adminAssetSchema }),
        { method: "POST", file },
      );
      setImage(result.data.id);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const body = customerStoryInputSchema.parse({
        title: v.title,
        caption: v.caption,
        displayName: v.displayName,
        reviewId: v.reviewId || null,
        imageAssetId: image || null,
        alt: v.alt,
        productIds: String(v.productIds)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        consentEvidence: v.consentEvidence,
        consentAt: new Date(String(v.consentAt)).toISOString(),
        published: v.published === "on",
        position: Number(v.position),
      });
      await request(
        initial ? `/customer-stories/${initial.id}` : "/customer-stories",
        z.object({ data: z.object({ id: z.string() }) }),
        { method: initial ? "PATCH" : "POST", body },
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof z.ZodError
          ? err.issues.map((i) => i.message).join(" ")
          : err instanceof Error
            ? err.message
            : "Save failed",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-card experience-admin-form" onSubmit={save}>
      <h3>
        {initial ? "Edit customer story" : "Add a consented customer story"}
      </h3>
      <fieldset disabled={busy}>
        <div className="experience-form-grid">
          <label>
            Title
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={initial?.title}
            />
          </label>
          <label>
            Approved display name
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={80}
              defaultValue={initial?.displayName}
            />
          </label>
          <label>
            Approved review ID (optional)
            <input name="reviewId" defaultValue={initial?.reviewId ?? ""} />
          </label>
          <label>
            Product IDs (comma separated)
            <input
              name="productIds"
              defaultValue={initial?.productIds.join(", ")}
            />
          </label>
          <label>
            Caption
            <textarea
              name="caption"
              required
              maxLength={2000}
              defaultValue={initial?.caption}
            />
          </label>
          <label>
            Permission evidence (private)
            <textarea
              name="consentEvidence"
              required
              minLength={10}
              maxLength={2000}
              defaultValue={initial?.consentEvidence}
            />
          </label>
          <label>
            Permission date
            <input
              name="consentAt"
              type="date"
              required
              defaultValue={initial?.consentAt.slice(0, 10)}
            />
          </label>
          <label>
            Display order
            <input
              name="position"
              type="number"
              min="0"
              defaultValue={initial?.position ?? 0}
            />
          </label>
          <label>
            Customer image (optional)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </label>
          <label>
            Image description
            <input name="alt" maxLength={300} defaultValue={initial?.alt} />
          </label>
        </div>
        {image && (
          <p>
            Uploaded image: {image}{" "}
            <button type="button" onClick={() => setImage("")}>
              Remove from story
            </button>
          </p>
        )}
        <label className="experience-check">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial?.published}
          />
          Publish with recorded permission
        </label>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <button className="admin-button" disabled={busy}>
          {busy ? "Saving…" : "Save story"}
        </button>
      </fieldset>
    </form>
  );
}
