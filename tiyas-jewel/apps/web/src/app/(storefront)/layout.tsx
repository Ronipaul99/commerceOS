import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { StorefrontProvider } from "@/components/storefront/storefront-provider";
import { StorefrontPanels } from "@/components/storefront/panels";
import { publishedContent } from "@/lib/content-server";
import { ContentNavigation } from "@/components/storefront/content-navigation";
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigation=await publishedContent("navigation");
  return (
    <ContentNavigation value={navigation?.type === "navigation" ? navigation.content : null}>
    <StorefrontProvider>
      <Header />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer menus={navigation?.type === "navigation" ? navigation.content : undefined} />
      <StorefrontPanels />
    </StorefrontProvider>
    </ContentNavigation>
  );
}
