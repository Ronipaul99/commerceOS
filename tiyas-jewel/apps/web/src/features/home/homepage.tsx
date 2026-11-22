import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  UserRound,
  ReceiptText,
  Gem,
  Mail,
} from "lucide-react";
import {
  campaignArt as art,
  campaignCollections,
  homepageConfig,
  occasions,
} from "@/lib/homepage-config";
import { LotusMark } from "@/components/storefront/brand-mark";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { HomeReviews } from "@/features/reviews/home-reviews";
import { HomeReels } from "@/features/reels/home-reels";
import { HeroCarousel } from "./hero-carousel";
import { ProductRail } from "./product-rail";
import {
  CollectionShowcases,
  HomeProductSkeleton,
  NewArrivals,
} from "./home-catalog";
import { HomeMotion } from "./home-motion";
function HomeSectionHeading({
  title,
  description,
  id,
  italic = false,
}: {
  title: string;
  description: string;
  id: string;
  italic?: boolean;
}) {
  return (
    <header
      className={`tj-section-heading ${italic ? "tj-heading-italic" : ""}`}
    >
      <div>
        <span className="tj-heading-line" />
        <LotusMark />
        <h2 id={id}>{title}</h2>
        <span className="tj-heading-line" />
      </div>
      <p>{description}</p>
    </header>
  );
}
function FestiveOffers() {
  const offers = homepageConfig.promotions.filter((p) => p.active);
  if (!offers.length) return null;
  return (
    <section className="tj-shell tj-offers" aria-label="Festive offers">
      <ProductRail label="Festive offers">
        {offers.map((p) => (
          <article key={p.id} className="tj-offer">
            <ResponsiveImage src={p.image} alt="" sizes="100vw" />
            <div>
              <h2>{p.title}</h2>
              <p>{p.detail}</p>
              <small>{p.conditions}</small>
              <Link className="tj-button tj-button-burgundy" href={p.href}>
                Explore the offer
                <ArrowRight size={15} />
              </Link>
            </div>
          </article>
        ))}
      </ProductRail>
    </section>
  );
}
function CollectionPromotion() {
  const promotion = homepageConfig.collectionPromotion;
  return (
    <section
      className="tj-shell tj-replica-promotion-wrap"
      id="collection-promotion"
      aria-label="Silver Replica collection promotion"
    >
      <Link
        className="tj-replica-promotion"
        href={promotion.href}
        aria-label="Explore the Silver Replica collection"
      >
        <div className="tj-replica-promotion-art">
          <ResponsiveImage
            src={promotion.image}
            alt="Concept campaign: ornate silver replica jhumkas on warm natural stone"
            sizes="(max-width: 767px) 65vw, 100vw"
          />
        </div>
        <div className="tj-replica-promotion-wash" />
        <div className="tj-replica-promotion-copy">
          <h2>
            {promotion.title}
            <br />
            {promotion.subtitle}
          </h2>
          <p>{promotion.description}</p>
          <span className="tj-replica-promotion-arrow" aria-hidden="true">
            <ArrowRight size={18} />
          </span>
        </div>
        <span className="tj-replica-promotion-badge" aria-hidden="true">
          <small>Explore</small>
          <span>The Edit</span>
          <ArrowRight size={16} />
        </span>
      </Link>
    </section>
  );
}
export function Homepage() {
  return (
    <div className="festival-home">
      <HomeMotion />
      <HeroCarousel />
      <section
        className="tj-shell tj-quick-collections"
        id="quick-collections"
        aria-label="Explore eight jewellery collections"
      >
        <ProductRail
          label="Jewellery collection thumbnails"
          className="tj-category-rail"
        >
          {campaignCollections.map((c) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="tj-quick-category"
            >
              <div>
                <ResponsiveImage
                  src={c.image}
                  alt={`Concept: ${c.name}`}
                  sizes="(max-width: 767px) 96px, 150px"
                  className={`tj-category-img tj-category-${c.slug}`}
                />
              </div>
              <span>{c.name}</span>
            </Link>
          ))}
        </ProductRail>
      </section>
      <section
        className="tj-shell tj-home-section"
        id="tiyas-collections"
        aria-labelledby="collections-title"
      >
        <HomeSectionHeading
          id="collections-title"
          title="The Tiyas Collections"
          description="Curated jewellery stories for every mood, occasion and style."
        />
        <div className="tj-editorial-collections">
          {[
            campaignCollections[0],
            campaignCollections[1],
            campaignCollections[4],
          ].map((c, index) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className={`tj-collection-card tj-collection-card-${index}`}
              data-reveal
            >
              <ResponsiveImage
                src={index === 0 ? art.bride : c.image}
                alt={`Concept campaign: ${c.name}`}
                sizes="(max-width: 767px) 82vw, 33vw"
              />
              <div className="tj-banner-shade" />
              <div className="tj-collection-card-copy">
                <p className="tj-eyebrow">{c.label}</p>
                <h3>{c.name}</h3>
                <span>
                  Explore collection
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section
        className="tj-shell tj-home-section tj-new-arrivals"
        id="new-arrivals"
        aria-labelledby="arrivals-title"
      >
        <div className="tj-heading-with-link">
          <HomeSectionHeading
            id="arrivals-title"
            title="New Arrivals"
            description="Fresh designs, first at Tiyas Jewel."
            italic
          />
          <Link className="tj-text-link" href="/shop?sort=newest">
            View all new arrivals
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <Suspense fallback={<HomeProductSkeleton />}>
          <NewArrivals />
        </Suspense>
      </section>
      <section
        className="tj-brace-campaign"
        id="brace-kundan"
        aria-labelledby="brace-title"
        data-reveal
      >
        <div className="tj-brace-image">
          <ResponsiveImage
            src={art.brace}
            alt="Concept campaign: ornate Kundan bangles on rich burgundy silk"
            sizes="100vw"
          />
        </div>
        <div className="tj-banner-shade" />
        <div className="tj-shell tj-brace-inner">
          <div>
            <p className="tj-eyebrow">The signature range</p>
            <h2 id="brace-title">
              Brace Kundan
              <br />
              <em>Collection</em>
            </h2>
            <p>Timeless forms with a modern touch.</p>
            <Link
              className="tj-button tj-button-cream"
              href="/collections/brace-kundan"
            >
              Shop Brace Kundan
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <section
        className="tj-shell tj-home-section"
        id="shop-by-occasion"
        aria-labelledby="occasions-title"
      >
        <HomeSectionHeading
          id="occasions-title"
          title="Shop by Occasion"
          description="Jewellery for every moment that matters."
        />
        <div className="tj-occasion-grid">
          {occasions.map((o) => (
            <Link
              className="tj-occasion-card"
              key={o.name}
              href={o.href}
              data-reveal
            >
              <div className="tj-occasion-image">
                <ResponsiveImage
                  src={o.image}
                  alt={`Editorial concept for ${o.name.toLowerCase()}`}
                  sizes="(max-width: 767px) 30vw, 18vw"
                  className={`tj-occasion-${o.name.split(" ")[0]?.toLowerCase()}`}
                  position={o.position}
                />
              </div>
              <div>
                <h3>{o.name}</h3>
                <span className="tj-circle-link" aria-hidden="true">
                  <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div id="collection-showcases">
        <Suspense
          fallback={
            <div className="tj-shell tj-home-section">
              <HomeProductSkeleton count={3} />
            </div>
          }
        >
          <CollectionShowcases />
        </Suspense>
      </div>
      <CollectionPromotion />
      <FestiveOffers />
      <section
        className="tj-shell tj-home-section tj-trust"
        id="why-tiyas"
        aria-labelledby="trust-title"
      >
        <h2 id="trust-title">Why Shop at Tiyas Jewel</h2>
        <div className="tj-trust-grid">
          {[
            {
              Icon: Gem,
              title: "Considered collections",
              detail: "Explore jewellery by mood and occasion.",
            },
            {
              Icon: UserRound,
              title: "Easy guest checkout",
              detail: "Find your piece. No account required.",
            },
            {
              Icon: Heart,
              title: "Your own edit",
              detail: "Save favourites to your wishlist.",
            },
            {
              Icon: ReceiptText,
              title: "Clear order totals",
              detail: "View prices and delivery before placing an order.",
            },
          ].map(({ Icon, title, detail }) => (
            <div key={title}>
              <Icon size={32} strokeWidth={1.2} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section
        className="tj-shell tj-story-wrap"
        id="our-story"
        aria-labelledby="story-title"
      >
        <div className="tj-story" data-reveal>
          <div className="tj-story-image">
            <ResponsiveImage
              src="/images/editorial/flowers.webp"
              alt="Concept of sculptural gold flower earrings in warm natural light"
              sizes="(max-width: 767px) 100vw, 65vw"
            />
          </div>
          <div className="tj-story-copy">
            <p className="tj-eyebrow">For every side of you</p>
            <h2 id="story-title">The Tiyas Story</h2>
            <p>
              From everyday expressions to moments of celebration. Discover
              jewellery that lets you bring a little more of yourself to every
              occasion.
            </p>
            <Link
              className="tj-button tj-button-burgundy"
              href="/info/our-story"
            >
              Read our story
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <Suspense fallback={null}>
        <HomeReels />
        <HomeReviews />
      </Suspense>
      <section
        className="tj-shell tj-newsletter-wrap"
        id="newsletter"
        aria-labelledby="newsletter-title"
      >
        <div className="tj-newsletter">
          <Mail size={38} strokeWidth={1} aria-hidden="true" />
          <div>
            <h2 id="newsletter-title">
              Get Jewellery Updates &amp; Exclusive Offers
            </h2>
            <p>
              New collections, styling notes and a little inspiration. Sign-up
              opens soon.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>
      <p className="tj-campaign-disclosure tj-shell">
        Campaign imagery is illustrative concept art. Purchasable pieces, prices
        and availability are shown in the product cards.
      </p>
    </div>
  );
}
