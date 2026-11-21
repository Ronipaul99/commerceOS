import type { Metadata } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-sans/400-italic.css";
import "@fontsource/dm-sans/500-italic.css";
import "./globals.css";
import "./shopping.css";
import "./checkout.css";
import "./homepage.css";
import "./collections.css";
import "./product-card.css";
import "./purchase.css";
import "./wishlist.css";
import "./order-result.css";
import "./density.css";

export const metadata: Metadata = {
  title: {
    default: "TIYAS JEWEL | Jewellery, thoughtfully chosen",
    template: "%s | TIYAS JEWEL",
  },
  description: "A new home for jewellery and the moments that make it yours.",
  robots: { index: false, follow: false }, // Preview stages; revisit before launch.
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
