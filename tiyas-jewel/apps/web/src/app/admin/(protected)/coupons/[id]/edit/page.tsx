import {
  adminOptionsSchema,
  couponResponseSchema,
  adminProductsResponseSchema,
} from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { CouponForm } from "@/features/admin/coupons";
export default async function EditCoupon({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [options, result, products] = await Promise.all([
    adminGet("/options", adminOptionsSchema),
    adminGet(`/coupons/${encodeURIComponent(id)}`, couponResponseSchema),
    adminGet("/products?limit=50", adminProductsResponseSchema),
  ]);
  return (
    <CouponForm
      initial={result.data}
      options={{ ...options.data, products: products.data }}
    />
  );
}
