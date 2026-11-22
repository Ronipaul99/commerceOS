import Link from "next/link";
import { reviewListSchema, experienceSettingsSchema } from "@tiyas/shared";
import { apiOrigin } from "@/lib/api-server";
import { ReviewCard } from "./reviews";
import { ProductRail } from "@/features/home/product-rail";
export async function HomeReviews({
  title = "Our Customers Love Us",
  ids = [],
}: {
  title?: string;
  ids?: string[];
}) {
  const items = await Promise.all([
    fetch(`${apiOrigin()}/api/v1/experience/settings`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }),
    fetch(
      `${apiOrigin()}/api/v1/store-reviews?limit=24${ids.length ? `&ids=${encodeURIComponent(ids.join(","))}` : ""}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    ),
  ])
    .then(async ([settings, response]) => {
      if (
        !settings.ok ||
        !response.ok ||
        !experienceSettingsSchema.parse(await settings.json()).data
          .homepageReviews
      )
        return [];
      const all = reviewListSchema.parse(await response.json()).data.items;
      return ids.length
        ? ids.flatMap((id) => all.filter((r) => r.id === id))
        : all.slice(0, 6);
    })
    .catch(() => []);
  if (!items.length) return null;
  return (
    <section className="tj-shell tj-home-section experience-home-reviews">
      <div className="experience-section-heading">
        <h2>{title}</h2>
        <Link href="/happy-customers">Meet our happy customers &rarr;</Link>
      </div>
      <ProductRail label="Customer experiences">
        {items.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </ProductRail>
    </section>
  );
}
