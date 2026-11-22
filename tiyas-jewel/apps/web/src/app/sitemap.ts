import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  // No guessed production hostname. Preview noindex remains unchanged until launch.
  const origin = process.env.SITE_PUBLIC_URL;
  if (!origin) return [];
  return [
    "/",
    "/shop",
    "/collections",
    "/happy-customers",
    "/info/our-story",
    "/info/contact",
    "/info/privacy",
    "/info/terms",
    "/info/shipping-returns",
  ].map((path) => ({ url: new URL(path, origin).href }));
}
