import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Mail,
  ReceiptText,
  UserRound,
  Shapes,
} from "lucide-react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { LotusMark } from "@/components/storefront/brand-mark";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { collectionArt, type CollectionDesign } from "@/lib/collection-design";
export function CatalogHero({
  design,
  title,
  description,
}: {
  design: CollectionDesign;
  title: string;
  description?: string;
}) {
  return (
    <section
      className={`cl-hero cl-tone-${design.tone}`}
      aria-labelledby="catalog-title"
    >
      <div className="cl-hero-art">
        <ResponsiveImage
          src={collectionArt(design.slug)}
          alt={`${design.name} editorial campaign concept`}
          sizes="(max-width: 767px) 100vw, 64vw"
          position={design.heroPosition}
          preload
        />
      </div>
      <div className="cl-hero-inner">
        <div className="cl-hero-copy">
          <p className="cl-eyebrow">{design.eyebrow}</p>
          <h1 id="catalog-title">{title}</h1>
          <p>{description ?? design.description}</p>
          <a className="cl-hero-button" href="#catalog-products">
            Explore {design.slug === "all" ? "all collections" : design.name}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
export function CatalogSectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="cl-section-heading">
      <div>
        <span />
        <LotusMark />
        <h2>{title}</h2>
        <span />
      </div>
      <p>{description}</p>
    </header>
  );
}
export function CatalogEditorial({ design }: { design: CollectionDesign }) {
  return (
    <section
      className={`cl-editorial cl-tone-${design.tone}`}
      aria-label={`${design.name} editorial edit`}
    >
      <div className="cl-editorial-art">
        <ResponsiveImage
          src={collectionArt(design.slug)}
          alt=""
          sizes="(max-width: 767px) 100vw, 45vw"
        />
      </div>
      <div className="cl-editorial-copy">
        <p className="cl-eyebrow">The Tiyas edit</p>
        <h2>{design.editorialTitle}</h2>
        <p>{design.editorialDescription}</p>
        <Link href="/shop" className="cl-editorial-link">
          Explore all jewellery
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export function CatalogClosing() {
  return (
    <div className="cl-closing">
      <section className="cl-benefits" aria-label="Shopping with Tiyas">
        {[
          {
            Icon: Shapes,
            title: "Considered collections",
            detail: "Explore jewellery by form.",
          },
          {
            Icon: UserRound,
            title: "Guest checkout",
            detail: "No account required.",
          },
          {
            Icon: Heart,
            title: "Your own edit",
            detail: "Save your favourites.",
          },
          {
            Icon: ReceiptText,
            title: "Clear order totals",
            detail: "View delivery charges at checkout.",
          },
        ].map(({ Icon, title, detail }) => (
          <div key={title}>
            <Icon size={29} strokeWidth={1.3} aria-hidden="true" />
            <div>
              <h2>{title}</h2>
              <p>{detail}</p>
            </div>
          </div>
        ))}
      </section>
      <section
        className="tj-newsletter cl-newsletter"
        aria-labelledby="listing-newsletter-title"
      >
        <Mail size={30} strokeWidth={1.2} aria-hidden="true" />
        <div>
          <h2 id="listing-newsletter-title">
            Get Jewellery Updates &amp; Exclusive Offers
          </h2>
          <p>New collections and styling notes. Sign-up opens soon.</p>
        </div>
        <NewsletterForm />
      </section>
      <p className="cl-art-disclosure">
        Campaign imagery is illustrative. Product details, prices and
        availability come from the current catalog.
      </p>
    </div>
  );
}
