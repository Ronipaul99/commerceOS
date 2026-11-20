import { notFound } from "next/navigation";
import { slugSchema } from "@tiyas/shared";
import { serverApi } from "@/lib/api-server";
import { ApiClientError } from "@/lib/api-client";
import { ProductDetail } from "@/features/shopping/product-detail";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!slugSchema.safeParse(slug).success) notFound();
  const response = await serverApi()
    .product(slug)
    .catch((error) => {
      if (error instanceof ApiClientError && error.status === 404) notFound();
      throw error;
    });
  return (
    <ProductDetail
      product={response.data}
      moveFromWishlist={query.moveFromWishlist === "true"}
    />
  );
}
