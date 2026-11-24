import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@businessos/ui-web/styles.css";

export const metadata: Metadata = {
  title: "BusinessOS POS",
  description: "Online-first point-of-sale workspace",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
