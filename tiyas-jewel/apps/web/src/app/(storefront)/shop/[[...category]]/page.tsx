import { Suspense } from "react";
import { notFound } from "next/navigation";
import { slugSchema } from "@tiyas/shared";
import { CatalogPage } from "@/features/shopping/catalog-page";
export default async function Page({
  params,
}: {
  params: Promise<{ category?: string[] }>;
}) {
  const { category } = await params;
  if (
    category &&
    (category.length > 1 || !slugSchema.safeParse(category[0]).success)
  )
    notFound();
  return (
    <Suspense
      fallback={<p className="shell shopping-loading">Preparing the edit...</p>}
    >
      <CatalogPage categorySlug={category?.[0]} />
    </Suspense>
  );
}
