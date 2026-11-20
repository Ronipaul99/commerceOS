import Link from "next/link";
import { FooterGroup } from "./footer-group";
import { ScrollToTop } from "./panels";
import { storefrontConfig } from "@/lib/storefront-config";
const groups = [
  {
    title: "Shop",
    links: [
      ["Earrings", "/shop/earrings"],
      ["Necklaces", "/shop/necklaces"],
      ["Rings", "/shop/rings"],
      ["Bracelets", "/shop/bracelets"],
    ],
  },
  {
    title: "Collections",
    links: [
      ["The Everyday Edit", "/collections/everyday-edit"],
      ["The Celebration Edit", "/collections/celebration"],
      ["Statement Pieces", "/collections/statement"],
    ],
  },
  {
    title: "About Tiyas",
    links: [
      ["Our story", "/#our-story"],
      ["The Journal", "/#journal"],
      ["Contact us", "/info/contact"],
    ],
  },
  {
    title: "Client care",
    links: [
      ["Shipping & returns", "/info/shipping-returns"],
      ["Privacy policy", "/info/privacy"],
      ["Terms & conditions", "/info/terms"],
    ],
  },
];
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-main">
        <div className="footer-identity">
          <Link className="footer-wordmark" href="/">
            TIYAS JEWEL
          </Link>
          <p className="eyebrow">The art of adornment</p>
          <p>
            Considered forms.
            <br />
            Unmistakably you.
          </p>
          <div className="social-links">
            {storefrontConfig.socials.length ? (
              storefrontConfig.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {social.label}
                </a>
              ))
            ) : (
              <Link href="/info/social">
                Follow our story <span aria-hidden="true">&#8599;</span>
              </Link>
            )}
          </div>
        </div>
        <div className="footer-groups">
          {groups.map((group) => (
            <FooterGroup key={group.title} {...group} />
          ))}
        </div>
        <ScrollToTop />
      </div>
      <div className="shell footer-bottom">
        <span>
          &copy; {new Date().getFullYear()} Tiyas Jewel. All rights reserved.
        </span>
        <span>India &middot; INR</span>
        <span>Design preview &middot; Concept campaign imagery</span>
      </div>
    </footer>
  );
}
