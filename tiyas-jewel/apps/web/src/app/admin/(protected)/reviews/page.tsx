import {
  adminReviewsSchema,
  adminStoriesSchema,
  reviewQuerySchema,
} from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminCustomerReviews } from "@/features/admin/customer-reviews";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const input = reviewQuerySchema.safeParse(await searchParams),
    q = input.success
      ? input.data
      : reviewQuerySchema.parse({ status: "PENDING" }),
    query = new URLSearchParams({
      page: String(q.page),
      limit: String(q.limit),
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.status ? { status: q.status } : {}),
    });
  const [reviews, stories] = await Promise.all([
    adminGet(`/reviews?${query}`, adminReviewsSchema),
    adminGet("/customer-stories", adminStoriesSchema),
  ]);
  return <AdminCustomerReviews reviews={reviews.data} stories={stories.data} />;
}
