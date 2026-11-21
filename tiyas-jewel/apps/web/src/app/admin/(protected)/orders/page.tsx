import { AdminLink as Link } from "@/features/admin/activity";
import {
  adminOrderQuerySchema,
  adminOrdersResponseSchema,
  adminDashboardSchema,
} from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminHeading, OrderTable, Pagination } from "@/features/admin/common";
import { ShoppingCart, Package, CheckCircle2, Search } from "lucide-react";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/features/admin/loading-ui";
import { AdminFilterForm, AdminFilterButton } from "@/features/admin/activity";
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  return (
    <Suspense
      key={JSON.stringify(raw)}
      fallback={<AdminPageSkeleton kind="list" />}
    >
      <OrdersContent raw={raw} />
    </Suspense>
  );
}
async function OrdersContent({
  raw,
}: {
  raw: Record<string, string | string[] | undefined>;
}) {
  const query = adminOrderQuerySchema.parse({
    page: raw.page ?? "1",
    status: raw.status ?? "NEW",
    limit: 20,
    q: raw.q || "",
    payment: raw.payment || "ALL",
  });
  const [{ data, pagination }, { data: metrics }] = await Promise.all([
    adminGet(
      `/orders?${new URLSearchParams({ page: String(query.page), limit: "20", status: query.status, q: query.q, payment: query.payment })}`,
      adminOrdersResponseSchema,
    ),
    adminGet("/dashboard", adminDashboardSchema),
  ]);
  return (
    <>
      <AdminHeading
        title="Orders"
        description="Review accepted orders and record manual fulfillment."
      />
      <div className="admin-metrics admin-order-metrics">
        {[
          {
            label: "Accepted Orders",
            value: metrics.newOrders + metrics.completedOrders,
            Icon: ShoppingCart,
          },
          { label: "To Fulfill", value: metrics.newOrders, Icon: Package },
          {
            label: "Completed",
            value: metrics.completedOrders,
            Icon: CheckCircle2,
          },
        ].map(({ label, value, Icon }) => (
          <article key={label}>
            <Icon size={29} />
            <strong>{value}</strong>
            <p>{label}</p>
          </article>
        ))}
      </div>
      <nav className="admin-tabs" aria-label="Order status">
        {[
          { label: "New", value: "NEW" },
          { label: "Completed", value: "COMPLETED" },
          { label: "All accepted orders", value: "ALL" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/orders?${new URLSearchParams({ status: tab.value, q: query.q, payment: query.payment })}`}
            aria-current={query.status === tab.value ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <AdminFilterForm action="/admin/orders" className="admin-filter-form">
        <input type="hidden" name="status" value={query.status} />
        <label>
          Search orders
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Search by order ID, customer, phone or email…"
            maxLength={100}
          />
        </label>
        <label>
          Payment
          <select name="payment" defaultValue={query.payment}>
            <option value="ALL">All payment methods</option>
            <option value="ONLINE">Online</option>
            <option value="COD">Cash on Delivery</option>
          </select>
        </label>
        <AdminFilterButton>
          <Search size={17} />
          Apply filters
        </AdminFilterButton>
      </AdminFilterForm>
      <section className="admin-panel admin-panel-table">
        <OrderTable orders={data} />
      </section>
      <Pagination
        pagination={pagination}
        path="/admin/orders"
        query={{ status: query.status, q: query.q, payment: query.payment }}
      />
    </>
  );
}
