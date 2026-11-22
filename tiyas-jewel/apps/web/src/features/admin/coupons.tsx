"use client";
import { useState } from "react";
import { z } from "zod";
import {
  couponInputSchema,
  couponResponseSchema,
  type CouponInput,
} from "@tiyas/shared";
import { AdminLink as Link, useAdminRouter } from "./activity";
import { useAdmin } from "./shell";
import { AdminHeading } from "./common";
import { formatINR } from "@/lib/money";
type Row = CouponInput & {
  id: string;
  version: number;
  reserved?: number;
  redeemed?: number;
};
export function CouponList({ rows }: { rows: Row[] }) {
  return (
    <>
      <AdminHeading
        title="Coupons"
        description="Create and manage checkout offers. Terms are always validated by the backend."
        action={
          <Link className="admin-button" href="/admin/coupons/new">
            Create coupon
          </Link>
        }
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Offer</th>
              <th>Status</th>
              <th>Usage</th>
              <th>Validity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.code}</strong>
                  <small>{r.description}</small>
                </td>
                <td>
                  {r.type === "FIXED"
                    ? formatINR(r.value)
                    : `${r.value / 100}%`}
                </td>
                <td>
                  {r.archived ? "Archived" : r.active ? "Enabled" : "Disabled"}
                </td>
                <td>
                  {r.redeemed ?? 0} redeemed · {r.reserved ?? 0} reserved
                  {r.usageLimit ? ` / ${r.usageLimit}` : ""}
                </td>
                <td>
                  {new Date(r.endsAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </td>
                <td>
                  <Link
                    className="admin-link"
                    href={`/admin/coupons/${r.id}/edit`}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="admin-empty">
            No coupons yet. Create an offer when its terms are approved.
          </p>
        )}
      </div>
    </>
  );
}
const istInput = (value: string) =>
  new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 16);
export function CouponForm({
  initial,
  options,
}: {
  initial?: Row;
  options: {
    products?: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    collections: { id: string; name: string }[];
  };
}) {
  const { request } = useAdmin(),
    router = useAdminRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = event.currentTarget,
      form = new FormData(f),
      v = Object.fromEntries(form);
    setBusy(true);
    setError("");
    try {
      const data = couponInputSchema.parse({
        code: v.code,
        description: v.description,
        type: v.type,
        value: Math.round(Number(v.value) * 100),
        minimumPaise: Math.round(Number(v.minimum) * 100),
        maximumDiscountPaise: v.maximum
          ? Math.round(Number(v.maximum) * 100)
          : null,
        usageLimit: v.usage ? Number(v.usage) : null,
        perCustomerLimit: v.perCustomer ? Number(v.perCustomer) : null,
        startsAt: new Date(`${v.startsAt}:00+05:30`).toISOString(),
        endsAt: new Date(`${v.endsAt}:00+05:30`).toISOString(),
        active: v.active === "on",
        archived: v.archived === "on",
        productIds: form.getAll("productIds"),
        categoryIds: form.getAll("categoryIds"),
        collectionIds: form.getAll("collectionIds"),
        paymentMethods: form.getAll("paymentMethods"),
        ...(initial ? { version: initial.version } : {}),
      });
      await request(
        initial ? `/coupons/${initial.id}` : "/coupons",
        couponResponseSchema,
        { method: initial ? "PATCH" : "POST", body: data },
      );
      router.push("/admin/coupons");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" ")
          : e instanceof Error
            ? e.message
            : "Could not save coupon.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AdminHeading
        title={initial ? `Edit ${initial.code}` : "Create coupon"}
        description="One coupon per order. Minimum spend and free shipping use pre-discount merchandise subtotal."
      />
      <form className="admin-card experience-admin-form" onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="experience-form-grid">
            <label>
              Coupon code
              <input
                name="code"
                required
                minLength={3}
                maxLength={32}
                defaultValue={initial?.code}
              />
            </label>
            <label>
              Description
              <input
                name="description"
                maxLength={300}
                defaultValue={initial?.description}
              />
            </label>
            <label>
              Discount type
              <select name="type" defaultValue={initial?.type ?? "FIXED"}>
                <option value="FIXED">Fixed INR amount</option>
                <option value="PERCENT">Percentage</option>
              </select>
            </label>
            <label>
              Discount value (₹ or %)
              <input
                name="value"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={initial ? initial.value / 100 : undefined}
              />
            </label>
            <label>
              Minimum eligible spend (₹)
              <input
                name="minimum"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(initial?.minimumPaise ?? 0) / 100}
              />
            </label>
            <label>
              Maximum discount (₹, optional)
              <input
                name="maximum"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={
                  initial?.maximumDiscountPaise
                    ? initial.maximumDiscountPaise / 100
                    : ""
                }
              />
            </label>
            <label>
              Total usage limit
              <input
                name="usage"
                type="number"
                min="1"
                defaultValue={initial?.usageLimit ?? ""}
              />
            </label>
            <label>
              Per email limit
              <input
                name="perCustomer"
                type="number"
                min="1"
                defaultValue={initial?.perCustomerLimit ?? ""}
              />
            </label>
            <label>
              Starts (IST)
              <input
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={initial ? istInput(initial.startsAt) : ""}
              />
            </label>
            <label>
              Ends (IST)
              <input
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={initial ? istInput(initial.endsAt) : ""}
              />
            </label>
            <label>
              Eligible products (optional)
              <select
                name="productIds"
                multiple
                defaultValue={initial?.productIds ?? []}
              >
                {options.products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categories (optional)
              <select
                name="categoryIds"
                multiple
                defaultValue={initial?.categoryIds ?? []}
              >
                {options.categories.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Collections (optional)
              <select
                name="collectionIds"
                multiple
                defaultValue={initial?.collectionIds ?? []}
              >
                {options.collections.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend>Payment methods</legend>
            {["ONLINE", "COD"].map((m) => (
              <label className="experience-check" key={m}>
                <input
                  type="checkbox"
                  name="paymentMethods"
                  value={m}
                  defaultChecked={
                    initial
                      ? initial.paymentMethods.includes(m as "ONLINE" | "COD")
                      : true
                  }
                />
                {m}
              </label>
            ))}
          </fieldset>
          <label className="experience-check">
            <input
              name="active"
              type="checkbox"
              defaultChecked={initial?.active}
            />
            Enabled
          </label>
          <label className="experience-check">
            <input
              name="archived"
              type="checkbox"
              defaultChecked={initial?.archived}
            />
            Archived (blocks new reservations)
          </label>
          <p>
            Already-used terms are protected. Clone an offer for a new campaign.
            Guest email limits are not verified customer identity.
          </p>
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <button className="admin-button" disabled={busy}>
            {busy ? "Saving…" : "Save coupon"}
          </button>
          <Link href="/admin/coupons" className="admin-link">
            Cancel
          </Link>
        </fieldset>
      </form>
    </>
  );
}
