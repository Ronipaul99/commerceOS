"use client";
import { useState } from "react";
import { z } from "zod";
import {
  adminReelsSchema,
  adminAssetSchema,
  reelInputSchema,
} from "@tiyas/shared";
import { useAdmin } from "./shell";
import { useAdminRouter, AdminLink as Link } from "./activity";
import { AdminHeading } from "./common";
type Reel = z.infer<typeof adminReelsSchema>["data"][number];
export function ReelsEditor({
  rows,
  products,
}: {
  rows: Reel[];
  products: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<Reel | null>(null),
    [epoch, setEpoch] = useState(0);
  return (
    <>
      <AdminHeading
        title="Shop Our Reels"
        description="Add Instagram Reel links and tag the jewellery featured in each look."
        action={
          <Link
            href="/admin/content?tab=homepage"
            className="admin-button admin-button-light"
          >
            Homepage sections
          </Link>
        }
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reel</th>
              <th>Published</th>
              <th>Record ID</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.published ? "Yes" : "No"}</td>
                <td>
                  <code>{r.id}</code>
                </td>
                <td>
                  <button className="admin-link" onClick={() => setSelected(r)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="admin-button"
        onClick={() => {
          setSelected(null);
          setEpoch((n) => n + 1);
        }}
      >
        New reel
      </button>
      <ReelForm
        key={`${selected?.id ?? "new"}-${epoch}`}
        initial={selected}
        products={products}
      />
    </>
  );
}
function ReelForm({
  initial,
  products,
}: {
  initial: Reel | null;
  products: { id: string; name: string }[];
}) {
  const { request } = useAdmin(),
    router = useAdminRouter(),
    [poster, setPoster] = useState(initial?.posterId ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function uploadPoster(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const result = await request(
        "/images",
        z.object({ data: adminAssetSchema }),
        { method: "POST", file },
      );
      setPoster(result.data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget),
      v = Object.fromEntries(f);
    setBusy(true);
    setError("");
    try {
      const body = reelInputSchema.parse({
        title: v.title,
        caption: v.caption,
        transcript: v.transcript,
        posterId: poster,
        instagramUrl: v.instagramUrl,
        productIds: f.getAll("productIds"),
        position: Number(v.position),
        rightsConfirmed: v.rightsConfirmed === "on",
        published: v.published === "on",
        ...(initial ? { version: initial.version } : {}),
      });
      await request(
        initial ? `/content/reels/${initial.id}` : "/content/reels",
        z.object({ data: z.object({ id: z.string() }) }),
        { method: initial ? "PATCH" : "POST", body },
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? e.issues.map((i) => i.message).join(" ")
          : e instanceof Error
            ? e.message
            : "Could not save reel",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-card experience-admin-form" onSubmit={save}>
      <h2>{initial ? "Edit reel" : "Create a reel"}</h2>
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
            Display order
            <input
              name="position"
              type="number"
              min="0"
              defaultValue={initial?.position ?? 0}
            />
          </label>
          <label>
            Instagram Reel link
            <input
              name="instagramUrl"
              type="url"
              required
              maxLength={500}
              placeholder="https://www.instagram.com/reel/?/"
              defaultValue={initial?.instagramUrl}
            />
          </label>
          <label>
            Caption
            <textarea
              name="caption"
              maxLength={2000}
              defaultValue={initial?.caption}
            />
          </label>
          <label>
            Transcript / visual description
            <textarea
              name="transcript"
              maxLength={5000}
              defaultValue={initial?.transcript}
            />
          </label>
          <label>
            Portrait poster
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void uploadPoster(e.target.files?.[0])}
            />
            <small>
              {poster
                ? `Uploaded ${poster}`
                : "WebP output, maximum source 5 MB"}
            </small>
          </label>
          <label>
            Tagged products
            <select
              name="productIds"
              multiple
              defaultValue={initial?.productIds ?? []}
            >
              {products.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <small>
              Hold Ctrl / Command for multiple selections; at most eight
              products.
            </small>
          </label>
        </div>
        <label className="experience-check">
          <input
            type="checkbox"
            name="rightsConfirmed"
            defaultChecked={initial?.rightsConfirmed}
          />
          I have permission to feature this reel and its poster.
        </label>
        <label className="experience-check">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial?.published}
          />
          Published
        </label>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        <button className="admin-button" disabled={busy}>
          {busy ? "Saving…" : "Save reel"}
        </button>
      </fieldset>
    </form>
  );
}
