import type { Product } from "@tiyas/shared";
import { editorialAssets as art } from "./storefront-config";
export type DisplayProduct = {
  id: string;
  slug: string;
  name: string;
  pricePaise: number;
  image: string;
  alt: string;
  conceptImage: boolean;
  source: "api" | "demo";
  available: boolean;
  raw?: Product;
  alternateImage?: string;
  compareAtPaise?: number | null;
  hasVariants?: boolean;
};
export const previewProducts: DisplayProduct[] = [
  {
    id: "demo-hoops",
    slug: "the-everyday-hoops",
    name: "The Everyday Hoops",
    pricePaise: 129000,
    image: art.hoops,
    alt: "Concept of sculptural gold hoops on pale linen",
    conceptImage: true,
    source: "demo",
    available: true,
  },
  {
    id: "demo-pendant",
    slug: "the-curve-pendant",
    name: "The Curve Pendant",
    pricePaise: 149000,
    image: art.pendant,
    alt: "Concept of a teardrop gold pendant on linen",
    conceptImage: true,
    source: "demo",
    available: true,
  },
  {
    id: "demo-ring",
    slug: "the-fine-ring",
    name: "The Fine Ring",
    pricePaise: 99000,
    image: art.rings,
    alt: "Concept of polished gold rings on limestone",
    conceptImage: true,
    source: "demo",
    available: true,
  },
  {
    id: "demo-cuff",
    slug: "the-sculpted-cuff",
    name: "The Sculpted Cuff",
    pricePaise: 169000,
    image: art.bracelet,
    alt: "Concept of an organic gold cuff",
    conceptImage: true,
    source: "demo",
    available: true,
  },
];
export function presentProduct(product: Product): DisplayProduct {
  const image = product.images[0];
  const missingImage = !image || image.url.endsWith("catalog-placeholder.svg");
  const conceptImage =
    missingImage ||
    image.concept === true ||
    image.url.startsWith("/images/editorial/");
  const concept =
    (
      {
        earrings: art.flowers,
        necklaces: art.pendant,
        rings: art.rings,
        bracelets: art.bracelet,
      } as Record<string, string>
    )[product.category.slug] ?? art.hoops;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    pricePaise: product.pricePaise,
    image: missingImage ? concept : image.url,
    raw: product,
    hasVariants: product.variants.length > 0,
    compareAtPaise: product.compareAtPaise,
    alternateImage: product.images[1]?.url,
    alt: conceptImage
      ? `Concept image; actual photography for ${product.name} pending`
      : image.alt,
    conceptImage,
    source: "api",
    available: product.available,
  };
}
export function featuredProducts(products: Product[]): DisplayProduct[] {
  const live = products.slice(0, 4).map(presentProduct);
  const slugs = new Set(live.map((product) => product.slug));
  return [
    ...live,
    ...previewProducts.filter((product) => !slugs.has(product.slug)),
  ].slice(0, 4);
}
