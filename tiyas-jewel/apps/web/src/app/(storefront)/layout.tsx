import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { StorefrontProvider } from "@/components/storefront/storefront-provider";
import { StorefrontPanels } from "@/components/storefront/panels";
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StorefrontProvider>
      <Header />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <StorefrontPanels />
    </StorefrontProvider>
  );
}
