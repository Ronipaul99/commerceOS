"use client";
import { useState } from "react";
import { AdminImage as Image } from "@/features/admin/image";
import { useAdminRouter as useRouter } from "@/features/admin/activity";
import { adminOrderResponseSchema, type AdminOrder } from "@tiyas/shared";
import { formatINR } from "@/lib/money";
import { useAdmin } from "./shell";
import { AdminConfirm } from "./confirm";
export function AdminOrderDetail({ order }: { order: AdminOrder }) {
  const [confirm, setConfirm] = useState(false),
    [notice, setNotice] = useState("");
  const { request } = useAdmin(),
    router = useRouter();
  const address = order.address;
  return (
    <>
      <div className="admin-order-top">
        <span className="admin-status">
          {order.operationalStatus === "NEW" ? "New order" : "Completed"}
        </span>
        <p>
          {new Intl.DateTimeFormat("en-IN", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "Asia/Kolkata",
          }).format(new Date(order.createdAt))}{" "}
          IST
        </p>
        {order.operationalStatus === "NEW" && (
          <button className="admin-button" onClick={() => setConfirm(true)}>
            Mark as Completed
          </button>
        )}
      </div>
      {notice && (
        <p role="status" className="admin-notice">
          {notice}
        </p>
      )}
      <div className="admin-order-grid">
        <div>
          <section className="admin-panel">
            <h2>Ordered items</h2>
            {order.items.map((item, index) => (
              <div className="admin-order-line" key={index}>
                {item.image && (
                  <Image
                    src={item.image}
                    alt=""
                    width={72}
                    height={86}
                    unoptimized
                  />
                )}
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.variant ?? "Standard"} · SKU {item.sku ?? "—"}
                  </p>
                  <small>
                    {item.quantity} × {formatINR(item.unitPricePaise)}
                  </small>
                </div>
                <strong>{formatINR(item.lineTotalPaise)}</strong>
              </div>
            ))}
          </section>
          <section className="admin-panel">
            <h2>Order totals</h2>
            <dl className="admin-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatINR(order.totals.subtotalPaise)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{formatINR(order.totals.shippingPaise)}</dd>
              </div>
              <div>
                <dt>
                  Tax {order.totals.taxMode === "inclusive" ? "(included)" : ""}
                </dt>
                <dd>{formatINR(order.totals.taxPaise)}</dd>
              </div>
              <div>
                <dt>Discount</dt>
                <dd>{formatINR(order.totals.discountPaise)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatINR(order.totalPaise)}</dd>
              </div>
            </dl>
            <p>
              {order.paymentMethod === "COD"
                ? "Cash on Delivery"
                : "Online payment"}{" "}
              ·{" "}
              {order.paymentStatus === "PAID" ? "Paid" : "COD payment pending"}
            </p>
          </section>
        </div>
        <div>
          <section className="admin-panel">
            <h2>Customer & delivery</h2>
            <p>
              <strong>{order.customerName}</strong>
            </p>
            <a className="admin-phone" href={`tel:+91${order.customerMobile}`}>
              +91 {order.customerMobile}
            </a>
            <a
              className="admin-link admin-email"
              href={`mailto:${order.customerEmail}`}
            >
              {order.customerEmail}
            </a>
            <hr />
            <address>
              {address.line1}
              <br />
              {address.line2 && (
                <>
                  {address.line2}
                  <br />
                </>
              )}
              {address.landmark && (
                <>
                  Landmark: {address.landmark}
                  <br />
                </>
              )}
              {address.city}, {address.state}
              <br />
              <strong>{address.pinCode}</strong>
              <br />
              India
            </address>
          </section>
          <section className="admin-panel admin-fulfillment-note">
            <h2>Manual fulfillment</h2>
            <p>
              Arrange shipment outside the platform. Mark the order completed
              after you finish fulfillment.
            </p>
            <p>
              Completed records your fulfillment action; it does not verify
              courier delivery.
            </p>
            {order.completedAt && (
              <p>
                <strong>Completed:</strong>{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Kolkata",
                }).format(new Date(order.completedAt))}{" "}
                IST
              </p>
            )}
          </section>
        </div>
      </div>
      <AdminConfirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Mark this order completed?"
        description="Confirm that you have finished manual fulfillment. This does not indicate verified courier delivery."
        label="Mark as Completed"
        onConfirm={async () => {
          await request(
            `/orders/${order.id}/complete`,
            adminOrderResponseSchema,
            { method: "POST", body: {} },
          );
          setNotice("Order marked completed.");
          router.refresh();
        }}
      />
    </>
  );
}
