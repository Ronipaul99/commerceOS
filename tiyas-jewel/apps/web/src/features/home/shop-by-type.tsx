import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { serverApi } from "@/lib/api-server";
import { occasions } from "@/lib/homepage-config";

export function categoryHref(href: string) {
  return /^\/collections\/[a-z0-9-]+$/.test(href) ? `${href}?match=catalog` : href;
}

export function occasionHref(title: string, href: string) {
  if (/^\/shop\?(?:tag|category)=/.test(href) || href.startsWith("/shop/")) return href;
  return occasions.find((item) => item.name.toLowerCase() === title.trim().toLowerCase())?.href ?? href;
}

export async function ShopByType() {
  const categories = await serverApi().categories().catch(() => null);
  if (!categories?.data.length) return null;
  return (
    <nav className="tj-type-links" aria-label="Jewellery types">
      {categories.data.map(({ id, name, slug }) => (
        <Link key={id} href={`/shop/${slug}`}>
          {name}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      ))}
    </nav>
  );
}
