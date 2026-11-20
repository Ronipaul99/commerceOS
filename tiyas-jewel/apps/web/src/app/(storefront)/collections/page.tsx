import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogPage } from "@/features/shopping/catalog-page";
export const metadata: Metadata = {
  title: "All Collections",
  description:
    "Explore Tiyas Jewel collections and discover jewellery for every occasion.",
};
export default function CollectionsPage() {
  return (
    <Suspense
      fallback={
        <p className="shell shopping-loading">Preparing the collections...</p>
      }
    >
      <CatalogPage />
    </Suspense>
  );
}
