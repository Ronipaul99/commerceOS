import Link from "next/link";
import { Package, CheckCircle2, ShoppingBag, Plus } from "lucide-react";
import { adminDashboardSchema } from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminHeading, OrderTable } from "@/features/admin/common";
export default async function DashboardPage() {
  const { data } = await adminGet("/dashboard", adminDashboardSchema);
  return (
    <>
      <AdminHeading
        title="Store overview"
        description="Your catalog and accepted orders, at a glance."
        action={
          <Link href="/admin/products/new" className="admin-button">
            <Plus size={16} />
            Add product
          </Link>
        }
      />
      <div className="admin-metrics">
        {[
          { label: "Total Products", value: data.totalProducts, icon: Package },
          {
            label: "Active Products",
            value: data.activeProducts,
            icon: CheckCircle2,
          },
          { label: "New Orders", value: data.newOrders, icon: ShoppingBag },
          {
            label: "Completed Orders",
            value: data.completedOrders,
            icon: CheckCircle2,
          },
        ].map((m) => (
          <article key={m.label}>
            <m.icon size={20} />
            <p>{m.label}</p>
            <strong>{m.value}</strong>
          </article>
        ))}
      </div>
      <section className="admin-panel admin-panel-table">
        <div className="admin-section-title">
          <div>
            <h2>Recent orders</h2>
            <p>Verified online payments and valid Cash on Delivery orders.</p>
          </div>
          <Link href="/admin/orders" className="admin-link">
            View orders
          </Link>
        </div>
        <OrderTable orders={data.recentOrders} />
      </section>
    </>
  );
}
