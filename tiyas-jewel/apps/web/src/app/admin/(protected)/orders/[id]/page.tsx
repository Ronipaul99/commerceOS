import { adminOrderResponseSchema } from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminHeading } from "@/features/admin/common";
import { AdminOrderDetail } from "@/features/admin/order-detail";
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await adminGet(
    `/orders/${encodeURIComponent(id)}`,
    adminOrderResponseSchema,
  );
  return (
    <>
      <AdminHeading
        className="admin-order-heading"
        title={data.orderNumber}
        description="Order details and customer delivery information."
      />
      <AdminOrderDetail order={data} />
    </>
  );
}
