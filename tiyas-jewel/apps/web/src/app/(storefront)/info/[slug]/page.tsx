import PreviewPage from "@/features/preview/preview-page";
import type { Metadata } from "next";
import {
  publishedContent,
  publishedContentWithMedia,
} from "@/lib/content-server";
import { ResponsiveImage } from "@/components/ui/responsive-image";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await publishedContent(`page-${slug}`);
  return page?.type === "page"
    ? { title: page.content.title, description: page.content.description }
    : {};
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const published = await publishedContentWithMedia(`page-${slug}`);
  const page = published?.data;
  if (page?.type === "page")
    return (
      <article className="shell preview-page cms-static-page">
        <p className="eyebrow">Tiyas Jewel</p>
        <h1>{page.content.title}</h1>
        {page.content.image && (
          <div className="cms-static-image">
            <ResponsiveImage
              src={page.content.image}
              publicMedia={published?.media?.[page.content.image]}
              alt={page.content.alt}
              sizes="90vw"
            />
          </div>
        )}
        {page.content.body.split(/\n\s*\n/).map((paragraph, i) => (
          <p
            className="article-copy"
            key={i}
            style={{ whiteSpace: "pre-line" }}
          >
            {paragraph}
          </p>
        ))}
      </article>
    );
  return (
    <PreviewPage
      params={params.then(({ slug }) => ({ preview: ["info", slug] }))}
    />
  );
}
