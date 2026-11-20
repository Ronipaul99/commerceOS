import Link from "next/link";
import {
  adminOrderQuerySchema,
  adminOrdersResponseSchema,
} from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminHeading, OrderTable, Pagination } from "@/features/admin/common";
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = adminOrderQuerySchema.parse({
    page: raw.page ?? "1",
    status: raw.status ?? "NEW",
    limit: 20,
  });
  const { data, pagination } = await adminGet(
    `/orders?${new URLSearchParams({ page: String(query.page), limit: "20", status: query.status })}`,
    adminOrdersResponseSchema,
  );
  return (
    <>
      <AdminHeading
        title="Orders"
        description="Review accepted orders and record manual fulfillment."
      />
      <nav className="admin-tabs" aria-label="Order status">
        {[
          { label: "New", value: "NEW" },
          { label: "Completed", value: "COMPLETED" },
          { label: "All accepted orders", value: "ALL" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/orders?status=${tab.value}`}
            aria-current={query.status === tab.value ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <section className="admin-panel admin-panel-table">
        <OrderTable orders={data} />
      </section>
      <Pagination
        pagination={pagination}
        path="/admin/orders"
        query={{ status: query.status }}
      />
    </>
  );
}
