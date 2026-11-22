import { couponListSchema } from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { CouponList } from "@/features/admin/coupons";
export default async function Coupons() {
  const result = await adminGet("/coupons", couponListSchema);
  return <CouponList rows={result.data} />;
}
