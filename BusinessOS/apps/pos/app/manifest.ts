import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BusinessOS POS",
    short_name: "BusinessOS POS",
    start_url: "/",
    scope: "/",
    display: "standalone",
    icons: [
      { src: "/pos-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pos-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
