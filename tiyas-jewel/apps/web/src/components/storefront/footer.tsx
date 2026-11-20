import Link from "next/link";
import { FooterGroup } from "./footer-group";
import { ScrollToTop } from "./panels";
import { storefrontConfig } from "@/lib/storefront-config";
import { campaignCollections } from "@/lib/homepage-config";
import { BrandIdentity } from "./brand-mark";
const groups = [
  {
    title: "Shop",
    links: [
      ["All jewellery", "/shop"],
      ["New arrivals", "/shop?sort=newest"],
      ["Earrings", "/shop/earrings"],
      ["Necklaces", "/shop/necklaces"],
      ["Your wishlist", "/wishlist"],
    ],
  },
  {
    title: "Collections",
    links: campaignCollections
      .filter((_, i) => [0, 1, 4, 5].includes(i))
      .map((c) => [c.name, `/collections/${c.slug}`]),
  },
  {
    title: "Help",
    links: [
      ["Delivery & returns", "/info/shipping-returns"],
      ["Styling notes", "/journal/a-little-more-statement"],
      ["Contact information", "/info/contact"],
      ["Your bag", "/cart"],
    ],
  },
  {
    title: "About Tiyas",
    links: [
      ["Our story", "/info/our-story"],
      ["The journal", "/journal/the-art-of-layering"],
      ["Privacy policy", "/info/privacy"],
      ["Terms & conditions", "/info/terms"],
    ],
  },
];
export function Footer() {
  return (
    <footer className="site-footer tj-footer">
      <div className="tj-shell tj-footer-main">
        <div className="tj-footer-identity">
          <Link href="/" aria-label="Tiyas Jewel home">
            <BrandIdentity />
          </Link>
          <p>
            Jewellery for every side of you.
            <br />
            From everyday expressions
            <br />
            to moments of celebration.
          </p>
          {storefrontConfig.contact && (
            <a href={`mailto:${storefrontConfig.contact}`}>
              {storefrontConfig.contact}
            </a>
          )}
          <div className="tj-socials">
            {storefrontConfig.socials.map((s) => (
              <a key={s.href} href={s.href} rel="noreferrer" target="_blank">
                {s.label}
              </a>
            ))}
          </div>
        </div>
        <div className="tj-footer-groups">
          {groups.map((g) => (
            <FooterGroup key={g.title} {...g} />
          ))}
        </div>
        <ScrollToTop />
      </div>
      <div className="tj-shell tj-footer-bottom">
        <span>
          &copy; {new Date().getFullYear()} Tiyas Jewel. All rights reserved.
        </span>
        <span>India &middot; INR</span>
        <span>
          Campaign concepts &middot; Product imagery marked individually
        </span>
      </div>
    </footer>
  );
}
