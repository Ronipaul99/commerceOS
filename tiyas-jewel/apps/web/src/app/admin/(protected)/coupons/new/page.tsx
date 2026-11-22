import { adminOptionsSchema, adminProductsResponseSchema } from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { CouponForm } from "@/features/admin/coupons";
export default async function NewCoupon() {
  const [options, products] = await Promise.all([
    adminGet("/options", adminOptionsSchema),
    adminGet("/products?limit=50", adminProductsResponseSchema),
  ]);
  return <CouponForm options={{ ...options.data, products: products.data }} />;
}
