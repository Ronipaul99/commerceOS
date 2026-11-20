import type { Metadata } from "next";
import { ConfirmationPage } from "@/features/checkout/confirmation-page";
export const metadata: Metadata = { title: "Your private order", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <ConfirmationPage />; }
