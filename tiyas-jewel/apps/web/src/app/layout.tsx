import type { Metadata } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "./globals.css";
import "./shopping.css";

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
