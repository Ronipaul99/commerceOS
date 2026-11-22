import {
  contentDocumentResponseSchema,
  contentDocumentsResponseSchema,
  contentKeySchema,
  adminReelsSchema,
} from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { ContentEditor } from "@/features/admin/content-editor";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/features/admin/loading-ui";
import { ReelsEditor } from "@/features/admin/reels-editor";
import { z } from "zod";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return (
    <Suspense
      key={JSON.stringify(query)}
      fallback={<AdminPageSkeleton kind="cms" />}
    >
      <ContentPage query={query} />
    </Suspense>
  );
}
async function ContentPage({
  query,
}: {
  query: Record<string, string | undefined>;
}) {
  if (query.tab === "reels") {
    const [reels, products] = await Promise.all([
      adminGet("/content/reels", adminReelsSchema),
      adminGet(
        "/content/reels/options",
        z.object({
          data: z.array(z.object({ id: z.string(), name: z.string() })),
        }),
      ),
    ]);
    return <ReelsEditor rows={reels.data} products={products.data} />;
  }
  const tab = ["homepage", "banners", "pages", "menus"].includes(
    query.tab ?? "",
  )
    ? query.tab!
    : "homepage";
  const candidate =
    tab === "menus"
      ? "navigation"
      : tab === "pages"
        ? (query.key ?? "page-new")
        : "homepage";
  const parsed = contentKeySchema.safeParse(candidate),
    key = parsed.success ? parsed.data : "page-new";
  const [{ data }, { data: documents }] = await Promise.all([
    tab === "pages" && !query.key
      ? Promise.resolve({ data: null })
      : adminGet(`/content/${key}`, contentDocumentResponseSchema),
    adminGet("/content", contentDocumentsResponseSchema),
  ]);
  return (
    <ContentEditor
      key={`${key}-${tab}-${tab === "pages" && !query.key ? "new" : "saved"}`}
      document={data}
      documents={documents}
      tab={tab}
      documentKey={key}
    />
  );
}
