import { AdminLink as Link } from "@/features/admin/activity";
import { formatINR as formatMoney } from "@/lib/money";
import type { AdminOrderSummary } from "@tiyas/shared";
import { Eye, CheckCircle2, Clock } from "lucide-react";
import { OrderCompleteAction } from "./order-actions";
export function AdminHeading({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`admin-page-heading ${className}`}>
      <div>
        <p className="admin-eyebrow">TIYAS JEWEL / ADMIN CONSOLE</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Status({ children }: { children: React.ReactNode }) {
  return <span className="admin-status">{children}</span>;
}
export function OrderTable({ orders }: { orders: AdminOrderSummary[] }) {
  return orders.length ? (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Link className="admin-link" href={`/admin/orders/${o.id}`}>
                  {o.orderNumber}
                </Link>
                <small>
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeZone: "Asia/Kolkata",
                  }).format(new Date(o.createdAt))}
                </small>
              </td>
              <td>
                {o.customerName}
                <small>
                  <a href={`tel:+91${o.customerMobile}`}>{o.customerMobile}</a>
                </small>
              </td>
              <td>{formatMoney(o.totalPaise)}</td>
              <td>
                {o.paymentMethod === "COD" ? "Cash on Delivery" : "Online"}
                <small>
                  {o.paymentStatus === "PAID" ? "Paid" : "COD payment pending"}
                </small>
              </td>
              <td>
                <span
                  className={`admin-status ${o.operationalStatus === "COMPLETED" ? "admin-status-green" : "admin-status-amber"}`}
                >
                  {o.operationalStatus === "COMPLETED" ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <Clock size={15} />
                  )}
                  {o.operationalStatus === "NEW" ? "New" : "Completed"}
                </span>
              </td>
              <td>
                <div className="admin-row-actions">
                  <Link
                    className="admin-icon-button"
                    href={`/admin/orders/${o.id}`}
                    aria-label={`View order ${o.orderNumber}`}
                  >
                    <Eye size={18} />
                  </Link>
                  {o.operationalStatus === "NEW" && (
                    <OrderCompleteAction id={o.id} />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="admin-empty">
      <h2>No orders in this view</h2>
      <p>Accepted online payments and valid COD orders appear here.</p>
    </div>
  );
}
export function Pagination({
  pagination,
  path,
  query,
}: {
  pagination: { page: number; totalPages: number; total: number };
  path: string;
  query: Record<string, string>;
}) {
  const href = (page: number) =>
    `${path}?${new URLSearchParams({ ...query, page: String(page) })}`;
  return (
    <div className="admin-pagination">
      <p>
        {pagination.total} results · Page {pagination.page} of{" "}
        {Math.max(1, pagination.totalPages)}
      </p>
      <div>
        {pagination.page > 1 && (
          <Link
            className="admin-button admin-button-light"
            href={href(pagination.page - 1)}
          >
            Previous
          </Link>
        )}
        {pagination.page < pagination.totalPages && (
          <Link
            className="admin-button admin-button-light"
            href={href(pagination.page + 1)}
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
