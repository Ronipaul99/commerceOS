import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Gem,
  Heart,
  UserRound,
  ReceiptText,
  Mail,
} from "lucide-react";
import type { ContentSection, HomepageContent } from "@tiyas/shared";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { LotusMark } from "@/components/storefront/brand-mark";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { ProductCard } from "@/components/storefront/product-card";
import { serverApi } from "@/lib/api-server";
import { presentProduct } from "@/lib/catalog-presentation";
import { HeroCarousel } from "./hero-carousel";
import { ProductRail } from "./product-rail";
import { HomeMotion } from "./home-motion";
import { HomeProductSkeleton } from "./home-catalog";
import { previewSections } from "@/lib/content-preview";
function Heading({ section: s }: { section: ContentSection }) {
  return (
    <header className="tj-section-heading">
      <div>
        <span className="tj-heading-line" />
        <LotusMark />
        <h2 id={`cms-${s.id}`}>{s.title}</h2>
        <span className="tj-heading-line" />
      </div>
      <p>{s.description}</p>
    </header>
  );
}
async function Products({
  collection,
  count = 6,
}: {
  collection?: string;
  count?: number;
}) {
  const products = await serverApi()
    .catalog({
      sort: "newest",
      limit: String(count),
      ...(collection ? { collection } : {}),
    })
    .catch(() => null);
  if (!products?.data.length)
    return (
      <p className="tj-catalog-message">
        This edit is on its way. <Link href="/shop">Explore all jewellery</Link>
      </p>
    );
  return (
    <ProductRail label={collection ? `${collection} products` : "New arrivals"}>
      {products.data.map((p) => (
        <ProductCard
          key={p.id}
          product={presentProduct(p)}
          variant="campaign"
        />
      ))}
    </ProductRail>
  );
}
async function Showcases({ section: s }: { section: ContentSection }) {
  const api = serverApi();
  const [fallback, ...groups] = await Promise.all([
    api.catalog({ sort: "newest", limit: "6" }).catch(() => null),
    ...s.items
      .filter((i) => i.enabled)
      .map((i) =>
        api
          .catalog({
            collection: i.collection ?? i.id,
            sort: "newest",
            limit: "3",
          })
          .catch(() => null),
      ),
  ]);
  return (
    <div className="tj-showcases tj-shell">
      {s.items
        .filter((i) => i.enabled)
        .map((item, index) => {
          const assigned = groups[index]?.data ?? [],
            products = assigned.length
              ? assigned
              : (fallback?.data ?? []).slice(0, 3);
          return (
            <section
              key={item.id}
              className={`tj-showcase ${index % 2 ? "tj-showcase-reverse" : ""}`}
            >
              <Link className="tj-showcase-banner" href={item.href}>
                {item.image && (
                  <ResponsiveImage
                    src={item.image}
                    alt={item.alt}
                    sizes="(max-width:767px) 100vw,48vw"
                  />
                )}
                <div className="tj-banner-shade" />
                <div className="tj-showcase-copy">
                  <p className="tj-eyebrow">{item.eyebrow}</p>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <span className="tj-button tj-button-cream">
                    {item.buttonText}
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
              <div className="tj-showcase-products">
                <h3>
                  {assigned.length
                    ? `Discover ${item.title}`
                    : "More from Tiyas"}
                </h3>
                {!assigned.length && (
                  <p className="tj-curation-note">
                    This collection is on its way. Explore our current edit.
                  </p>
                )}
                <ProductRail label={`${item.title} supporting products`}>
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={presentProduct(p)}
                      variant="campaign"
                    />
                  ))}
                </ProductRail>
              </div>
            </section>
          );
        })}
    </div>
  );
}
function Section({ section: s }: { section: ContentSection }) {
  const items = s.items.filter((i) => i.enabled);
  if (s.kind === "hero") {
    const slides = items
      .filter((i) => i.image && i.title)
      .map((i) => ({
        title: i.title,
        secondLine: i.subtitle,
        eyebrow: i.eyebrow,
        description: i.description,
        cta: i.buttonText,
        href: i.href,
        image: i.image,
        mobileImage: i.mobileImage || i.image,
        alt: i.alt,
      }));
    return slides.length ? <HeroCarousel slides={slides} /> : null;
  }
  if (s.kind === "showcases")
    return (
      <Suspense fallback={<HomeProductSkeleton count={3} />}>
        <Showcases section={s} />
      </Suspense>
    );
  if (s.kind === "campaign")
    return (
      <section className="tj-brace-campaign" aria-labelledby={`cms-${s.id}`}>
        <div className="tj-brace-image">
          {s.image && (
            <ResponsiveImage src={s.image} alt={s.alt} sizes="100vw" />
          )}
        </div>
        <div className="tj-banner-shade" />
        <div className="tj-shell tj-brace-inner">
          <div>
            <p className="tj-eyebrow">{s.eyebrow}</p>
            <h2 id={`cms-${s.id}`}>
              {s.title}
              <br />
              <em>{s.subtitle}</em>
            </h2>
            <p>{s.description}</p>
            <Link className="tj-button tj-button-cream" href={s.href}>
              {s.buttonText}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    );
  if (s.kind === "story")
    return (
      <section className="tj-shell tj-story-wrap">
        <div className="tj-story">
          <div className="tj-story-image">
            {s.image && (
              <ResponsiveImage
                src={s.image}
                alt={s.alt}
                sizes="(max-width:767px) 100vw,65vw"
              />
            )}
          </div>
          <div className="tj-story-copy">
            <p className="tj-eyebrow">{s.eyebrow}</p>
            <h2>{s.title}</h2>
            <p>{s.description}</p>
            <Link className="tj-button tj-button-burgundy" href={s.href}>
              {s.buttonText}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    );
  if (s.kind === "promotion")
    return (
      <section className="tj-shell tj-replica-promotion-wrap">
        <Link className="tj-replica-promotion" href={s.href}>
          <div className="tj-replica-promotion-art">
            {s.image && (
              <ResponsiveImage src={s.image} alt={s.alt} sizes="100vw" />
            )}
          </div>
          <div className="tj-replica-promotion-wash" />
          <div className="tj-replica-promotion-copy">
            <h2>
              {s.title}
              <br />
              {s.subtitle}
            </h2>
            <p>{s.description}</p>
            <span className="tj-replica-promotion-arrow">
              <ArrowRight size={18} />
            </span>
          </div>
        </Link>
      </section>
    );
  if (s.kind === "newsletter")
    return (
      <section className="tj-shell tj-newsletter-wrap">
        <div className="tj-newsletter">
          <Mail size={38} />
          <div>
            <h2>{s.title}</h2>
            <p>{s.description}</p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    );
  if (s.kind === "trust")
    return (
      <section className="tj-shell tj-home-section tj-trust">
        <h2>{s.title}</h2>
        <div className="tj-trust-grid">
          {items.map((item, index) => {
            const Icon = [Gem, UserRound, Heart, ReceiptText][index % 4]!;
            return (
              <div key={item.id}>
                <Icon size={32} strokeWidth={1.2} aria-hidden="true" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  if (s.kind === "categories")
    return (
      <section className="tj-shell tj-quick-collections" aria-label={s.title}>
        <ProductRail label={s.title} className="tj-category-rail">
          {items.map((i) => (
            <Link key={i.id} href={i.href} className="tj-quick-category">
              <div>
                {i.image && (
                  <ResponsiveImage
                    src={i.image}
                    alt={i.alt}
                    sizes="(max-width:767px) 96px,150px"
                  />
                )}
              </div>
              <span>{i.title}</span>
            </Link>
          ))}
        </ProductRail>
      </section>
    );
  return (
    <section
      className="tj-shell tj-home-section"
      aria-labelledby={`cms-${s.id}`}
    >
      <Heading section={s} />
      {s.kind === "arrivals" ? (
        <>
          <Suspense fallback={<HomeProductSkeleton />}>
            <Products collection={s.collection} />
          </Suspense>
          <Link className="tj-text-link" href={s.href}>
            {s.buttonText}
            <ArrowRight size={16} />
          </Link>
        </>
      ) : s.kind === "occasions" ? (
        <div className="tj-occasion-grid">
          {items.map((i) => (
            <Link key={i.id} className="tj-occasion-card" href={i.href}>
              <div className="tj-occasion-image">
                {i.image && (
                  <ResponsiveImage
                    src={i.image}
                    alt={i.alt}
                    sizes="(max-width:767px) 30vw,18vw"
                  />
                )}
              </div>
              <div>
                <h3>{i.title}</h3>
                <span className="tj-circle-link">
                  <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="tj-editorial-collections">
          {items.map((i, index) => (
            <Link
              key={i.id}
              href={i.href}
              className={`tj-collection-card tj-collection-card-${index}`}
            >
              {i.image && (
                <ResponsiveImage
                  src={i.image}
                  alt={i.alt}
                  sizes="(max-width:767px) 82vw,33vw"
                />
              )}
              <div className="tj-banner-shade" />
              <div className="tj-collection-card-copy">
                <p className="tj-eyebrow">{i.eyebrow}</p>
                <h3>{i.title}</h3>
                <span>
                  {i.buttonText}
                  <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
export function ContentHomepage({
  content,
  previewSectionId,
}: {
  content: HomepageContent;
  previewSectionId?: string;
}) {
  const sections = previewSections(content, previewSectionId) ?? [];
  return (
    <div className="festival-home">
      <HomeMotion />
      {!sections.some((s) => s.kind === "hero") && (
        <h1 className="sr-only">Tiyas Jewel Collections</h1>
      )}
      {sections.map((s) =>
        previewSectionId ? (
          <div
            key={s.id}
            id={`preview-section-${s.id}`}
            data-preview-selected={s.id === previewSectionId}
            aria-label={
              s.id === previewSectionId ? `Preview: ${s.title}` : undefined
            }
            role={s.id === previewSectionId ? "region" : undefined}
          >
            <Section section={s} />
          </div>
        ) : (
          <Section key={s.id} section={s} />
        ),
      )}
      <p className="tj-campaign-disclosure tj-shell">
        Campaign imagery is illustrative concept art. Purchasable pieces, prices
        and availability are shown in the product cards.
      </p>
    </div>
  );
}
