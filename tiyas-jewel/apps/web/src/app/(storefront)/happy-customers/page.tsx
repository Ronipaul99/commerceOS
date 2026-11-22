import Link from "next/link";
import { z } from "zod";
import {
  storiesResponseSchema,
  reviewListSchema,
  experienceSettingsSchema,
} from "@tiyas/shared";
import { apiOrigin } from "@/lib/api-server";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Reviews } from "@/features/reviews/reviews";
export const metadata = {
  title: "Our Happy Customers",
  description:
    "Real customer stories and shopping experiences with Tiyas Jewel.",
  alternates: { canonical: "/happy-customers" },
};
export const dynamic = "force-dynamic";
async function load<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  return fetch(`${apiOrigin()}/api/v1${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  })
    .then(async (r) => (r.ok ? schema.parse(await r.json()) : null))
    .catch(() => null);
}
function Stories({
  page,
  data,
}: {
  page: number;
  data: z.infer<typeof storiesResponseSchema> | null;
}) {
  if (!data) return <p>Customer stories are temporarily unavailable.</p>;
  return data.data.length ? (
    <>
      <section className="experience-stories" aria-label="Customer stories">
        {data.data.map((s) => (
          <article className="experience-story" key={s.id}>
            {s.image && (
              <div className="experience-story-image">
                <ResponsiveImage
                  src={s.image}
                  alt={s.alt}
                  sizes="(max-width:767px) 50vw,33vw"
                />
              </div>
            )}
            <div>
              <h2>{s.title}</h2>
              <p>{s.caption}</p>
              <strong>{s.displayName}</strong>
              <div>
                {s.products.map((p) => (
                  <p key={p.slug}>
                    <Link href={`/products/${p.slug}`}>{p.name} &rarr;</Link>
                  </p>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
      {data.pagination && data.pagination.total > 12 && (
        <nav
          className="experience-pagination"
          aria-label="Customer story pages"
        >
          {page > 1 && (
            <Link href={`/happy-customers?page=${page - 1}`}>
              Previous stories
            </Link>
          )}
          <span>Page {page}</span>
          {page * 12 < data.pagination.total && (
            <Link href={`/happy-customers?page=${page + 1}`}>More stories</Link>
          )}
        </nav>
      )}
    </>
  ) : null;
}
export default async function HappyCustomers({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const page = /^[1-9][0-9]{0,3}$/.test(query.page ?? "")
    ? Number(query.page)
    : 1;
  // Resolve independent first-paint content together so stories and feedback do not shift the page after hydration.
  const [stories, reviews, settings] = await Promise.all([
    load(`/customer-stories?page=${page}&limit=12`, storiesResponseSchema),
    load("/store-reviews?page=1&sort=newest&kind=STORE", reviewListSchema),
    load("/experience/settings", experienceSettingsSchema),
  ]);
  return (
    <div className="tj-shell experience-page">
      <header>
        <p className="experience-eyebrow">The Tiyas community</p>
        <h1>Our Happy Customers</h1>
        <p>
          Real pieces. Personal expressions. Experiences shared in our
          customers’ own words.
        </p>
        <Link href="/info/contact">Request a correction or removal →</Link>
      </header>
      <Stories page={page} data={stories} />
      <Reviews
        initialData={reviews?.data}
        initialEnabled={settings?.data.reviews}
      />
    </div>
  );
}
