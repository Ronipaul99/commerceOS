import type { Metadata } from "next";
import { CheckoutPage } from "@/features/checkout/checkout-page";
export const metadata: Metadata = { title: "Guest checkout", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <CheckoutPage />; }
