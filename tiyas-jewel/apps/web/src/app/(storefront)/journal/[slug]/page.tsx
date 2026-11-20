import PreviewPage from "@/features/preview/preview-page";
export default function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <PreviewPage
      params={params.then(({ slug }) => ({ preview: ["journal", slug] }))}
    />
  );
}
