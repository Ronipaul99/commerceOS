import { Suspense } from "react";
import { notFound } from "next/navigation";
import { slugSchema } from "@tiyas/shared";
import { ApiClientError } from "@/lib/api-client";
import { serverApi } from "@/lib/api-server";
import { CatalogPage } from "@/features/shopping/catalog-page";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) notFound();
  const response = await serverApi()
    .collection(slug)
    .catch((error) => {
      if (error instanceof ApiClientError && error.status === 404) notFound();
      throw error;
    });
  return (
    <Suspense
      fallback={
        <p className="shell shopping-loading">Preparing the collection...</p>
      }
    >
      <CatalogPage collection={response.data} />
    </Suspense>
  );
}
