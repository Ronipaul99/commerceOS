import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { contentDocumentResponseSchema, contentKeySchema } from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { ContentHomepage } from "@/features/home/content-homepage";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { previewSections } from "@/lib/content-preview";
import { PreviewFocus } from "@/features/admin/preview-focus";
export const metadata: Metadata = {
  title: "Private content preview",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; section?: string }>;
}) {
  const params = await searchParams;
  const parsedKey = contentKeySchema.safeParse(params.key ?? "homepage");
  if (!parsedKey.success) notFound();
  const key = parsedKey.data;
  const { data } = await adminGet(
    `/content/${key}`,
    contentDocumentResponseSchema,
  );
  const sectionId = params.section;
  if (
    sectionId &&
    (data?.draft.type !== "homepage" ||
      !previewSections(data.draft.content, sectionId))
  )
    notFound();
  const selected =
    data?.draft.type === "homepage"
      ? data.draft.content.sections.find((s) => s.id === sectionId)
      : undefined;
  return (
    <>
      <div className="content-preview-toolbar">
        <div>
          <strong>
            {selected
              ? `Section preview: ${selected.title}`
              : "Private draft preview"}
          </strong>
          {selected && (
            <p>
              The complete section with the previous and next visible sections.{" "}
              {selected.enabled
                ? ""
                : "This section is hidden on the live page."}
            </p>
          )}
        </div>
        <div>
          {sectionId && (
            <Link href={`/admin-preview?key=${key}`}>Preview entire page</Link>
          )}
          <Link
            href={`/admin/content?tab=${data?.draft.type === "page" ? `pages&key=${key}` : "homepage"}`}
          >
            Back to editor
          </Link>
        </div>
      </div>
      {data?.draft.type === "homepage" ? (
        <>
          <ContentHomepage
            content={data.draft.content}
            previewSectionId={sectionId}
          />
          {sectionId && <PreviewFocus sectionId={sectionId} />}
        </>
      ) : data?.draft.type === "page" ? (
        <article className="shell preview-page">
          <h1>{data.draft.content.title}</h1>
          {data.draft.content.image && (
            <div
              style={{
                position: "relative",
                aspectRatio: 2.5,
                marginBlock: 24,
              }}
            >
              <ResponsiveImage
                src={data.draft.content.image}
                alt={data.draft.content.alt}
              />
            </div>
          )}
          {data.draft.content.body.split(/\n\s*\n/).map((p, i) => (
            <p
              className="article-copy"
              style={{ whiteSpace: "pre-line" }}
              key={i}
            >
              {p}
            </p>
          ))}
        </article>
      ) : (
        <p>No saved draft to preview.</p>
      )}
    </>
  );
}
