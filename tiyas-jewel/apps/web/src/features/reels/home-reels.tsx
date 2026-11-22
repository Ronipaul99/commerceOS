import { reelsResponseSchema } from "@tiyas/shared";
import { apiOrigin } from "@/lib/api-server";
import { ReelGallery } from "./reels";
export async function HomeReels({
  title = "Shop Our Reels",
  description = "Watch & shop the latest saree looks",
  ids = [],
}: {
  title?: string;
  description?: string;
  ids?: string[];
}) {
  const all = await fetch(`${apiOrigin()}/api/v1/reels`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  })
    .then(async (r) =>
      r.ok ? reelsResponseSchema.parse(await r.json()).data : [],
    )
    .catch(() => []);
  const items = ids.length
    ? ids.flatMap((id) => all.filter((r) => r.id === id))
    : all.slice(0, 8);
  return <ReelGallery items={items} title={title} description={description} />;
}
