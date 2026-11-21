import type { Metadata } from "next";
import { PaymentFailedPage } from "@/features/checkout/payment-failed-page";
export const metadata: Metadata = {
  title: "Payment not completed",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <PaymentFailedPage />;
}
