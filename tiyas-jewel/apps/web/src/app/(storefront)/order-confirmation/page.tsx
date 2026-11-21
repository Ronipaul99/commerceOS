import type { Metadata } from "next";
import { ConfirmationPage } from "@/features/checkout/confirmation-page";
import { serverApi } from "@/lib/api-server";
export const metadata: Metadata = {
  title: "Your private order",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page() {
  const products = await serverApi()
    .catalog({ limit: "10", sort: "newest", availability: "in-stock" })
    .catch(() => null);
  return <ConfirmationPage recommendations={products?.data ?? []} />;
}
