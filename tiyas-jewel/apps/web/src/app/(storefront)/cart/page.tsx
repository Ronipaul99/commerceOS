import type { Metadata } from "next";
import { BagPage } from "@/features/shopping/bag-page";
import { serverApi } from "@/lib/api-server";
export const metadata: Metadata = {
  title: "Shopping bag",
  robots: { index: false, follow: false },
};
export default async function CartPage() {
  const products = await serverApi()
    .catalog({ limit: "8", sort: "newest", availability: "in-stock" })
    .catch(() => null);
  return <BagPage recommendations={products?.data ?? []} />;
}
