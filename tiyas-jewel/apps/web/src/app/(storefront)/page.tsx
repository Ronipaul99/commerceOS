import { Homepage } from "@/features/home/homepage";
import { ContentHomepage } from "@/features/home/content-homepage";
import { publishedContentWithMedia } from "@/lib/content-server";
import { PublicMediaProvider } from "@/components/ui/responsive-image";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const published = await publishedContentWithMedia("homepage");
  if (published?.data?.type !== "homepage") return <Homepage />;
  return (
    <PublicMediaProvider value={published.media ?? {}}>
      <ContentHomepage content={published.data.content} />
    </PublicMediaProvider>
  );
}
