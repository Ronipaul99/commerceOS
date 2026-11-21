import type { Metadata } from "next";
import { WishlistPage } from "@/features/shopping/wishlist-page";
export const metadata: Metadata = {
  title: "Your favourites",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <WishlistPage />;
}
