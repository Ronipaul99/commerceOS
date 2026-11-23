import type { Metadata } from "next";
import { experienceSettingsSchema } from "@tiyas/shared";
import { apiOrigin } from "@/lib/api-server";
import { CheckoutPage } from "@/features/checkout/checkout-page";
export const metadata: Metadata = { title: "Guest checkout", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page() {
  const settings = await fetch(`${apiOrigin()}/api/v1/experience/settings`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  }).then(async (response) => response.ok ? experienceSettingsSchema.parse(await response.json()) : null)
    .catch(() => null);
  return <CheckoutPage couponsEnabled={settings?.data.coupons === true} />;
}
