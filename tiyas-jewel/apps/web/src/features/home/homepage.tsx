import Link from "next/link";
import { Truck, RotateCcw, ShieldCheck, Gift, ArrowDown } from "lucide-react";
import {
  editorialAssets as art,
  journal,
  storefrontConfig as config,
} from "@/lib/storefront-config";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { PrimaryButton, EditorialTextLink } from "@/components/ui/actions";
import { SectionHeading } from "@/components/ui/section-heading";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { EditorialBanner } from "@/components/storefront/editorial-banner";
import { CategoryGallery } from "./category-gallery";
import { FeaturedEdit } from "./featured-edit";
export function Homepage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <ResponsiveImage
          src={art.hero}
          alt="Concept campaign: sculptural gold hoops resting on sunlit travertine"
          preload
          sizes="100vw"
        />
        <div className="shell hero-inner">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">
              Sculptural forms. Personal stories.
            </p>
            <h1 id="hero-title">
              The art <br />
              of being <br />
              <em>noticed.</em>
            </h1>
            <p>
              Sculptural jewellery <br />
              for everyday expression.
            </p>
            <PrimaryButton href="/collections/everyday-edit">
              Explore collection
            </PrimaryButton>
          </div>
          <div className="hero-bottom">
            <span className="hero-index">
              01 <span>/</span> 04
            </span>
            <span className="hero-caption">
              Sculptural forms <br />
              Meaningful details <br />
              Everyday luxury
            </span>
            <a href="#shop-by-form" className="hero-scroll">
              Discover <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
      <section
        className="shell section-space shop-by-form"
        id="shop-by-form"
        aria-labelledby="form-title"
      >
        <div className="category-intro">
          <SectionHeading number="02" label="Shop by form" id="form-title">
            Discover <br />
            your signature.
          </SectionHeading>
          <p>
            Different forms. Same feeling. <br />
            Unmistakably you.
          </p>
          <EditorialTextLink href="/shop">Shop all</EditorialTextLink>
        </div>
        <CategoryGallery />
      </section>
      <section
        className="shell section-space everyday-section"
        id="everyday"
        aria-labelledby="everyday-title"
      >
        <div className="section-topline">
          <SectionHeading
            number="03"
            label="Everyday edit"
            id="everyday-title"
            description="Minimal pieces. Maximum impact."
          >
            Beautifully ordinary. <br />
            Anything but basic.
          </SectionHeading>
          <EditorialTextLink href="/collections/everyday-edit">
            View the edit
          </EditorialTextLink>
        </div>
        <FeaturedEdit />
      </section>
      <div id="celebration">
        <EditorialBanner
          image={art.celebration}
          alt="Concept campaign portrait of a woman wearing gold occasion jewellery"
          eyebrow="04 / The celebration edit"
          heading="For moments that stay."
          description="Statement pieces. Festive stories. Unforgettable details."
          href="/collections/celebration"
          cta="Explore occasion jewellery"
        />
      </div>
      <section
        className="statement-section"
        id="statement"
        aria-labelledby="statement-title"
      >
        <div className="statement-image">
          <ResponsiveImage
            src={art.flowers}
            alt="Concept gold flower earrings arranged on raw limestone"
            sizes="(max-width: 599px) 100vw, 55vw"
          />
        </div>
        <div className="statement-copy">
          <SectionHeading
            number="05"
            label="The statement pieces"
            id="statement-title"
            description="Bold forms for your most expressive moments."
          >
            Designed <br />
            to stand apart.
          </SectionHeading>
          <EditorialTextLink href="/collections/statement">
            Shop statement jewellery
          </EditorialTextLink>
          <span className="sculptural-arch" aria-hidden="true" />
        </div>
      </section>
      <section
        className="story-section"
        id="our-story"
        aria-labelledby="story-title"
      >
        <div className="story-copy">
          <SectionHeading
            number="06"
            label="Our story"
            id="story-title"
            description="A modern jewellery house inspired by individuality, created for real moments."
          >
            More than <br />
            jewellery.
          </SectionHeading>
          <EditorialTextLink href="/info/our-story">
            Our story
          </EditorialTextLink>
        </div>
        <div className="story-image">
          <ResponsiveImage
            src={art.story}
            alt="Editorial concept of delicate gold rings and layered necklaces with ivory silk"
            sizes="(max-width: 599px) 43vw, 50vw"
          />
        </div>
      </section>
      <section
        className="shell section-space style-section"
        id="style"
        aria-labelledby="style-title"
      >
        <div className="section-topline">
          <SectionHeading
            number="07"
            label="Own your way"
            id="style-title"
            description="Your pieces. Your moments. Your way."
          >
            Style it your way.
          </SectionHeading>
          <EditorialTextLink href="/journal/the-art-of-layering">
            View the styling notes
          </EditorialTextLink>
        </div>
        <div className="style-grid">
          <Link href="/collections/celebration" className="style-image">
            <ResponsiveImage
              src={art.celebration}
              alt="An occasion jewellery styling concept"
              sizes="(max-width: 599px) 45vw, 24vw"
            />
          </Link>
          <Link href="/journal/the-art-of-layering" className="style-image">
            <ResponsiveImage
              src={art.portrait}
              alt="Layered gold necklaces with a linen jacket, editorial concept"
              sizes="(max-width: 599px) 45vw, 24vw"
            />
          </Link>
          <Link href="/shop/rings" className="style-image">
            <ResponsiveImage
              src={art.story}
              alt="A personal edit of gold rings, editorial concept"
              sizes="(max-width: 599px) 45vw, 24vw"
            />
          </Link>
          <Link href="/collections/statement" className="style-image">
            <ResponsiveImage
              src={art.flowers}
              alt="Sculptural flower earrings, editorial concept"
              sizes="(max-width: 599px) 45vw, 24vw"
            />
          </Link>
        </div>
      </section>
      <section className="shell service-benefits" aria-label="Client care">
        {[
          { Icon: Truck, ...config.shipping },
          { Icon: RotateCcw, ...config.returns },
          { Icon: ShieldCheck, ...config.payments },
          { Icon: Gift, ...config.packaging },
        ].map(({ Icon, title, detail }) => (
          <div className="benefit" key={title}>
            <Icon aria-hidden="true" />
            <div>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
          </div>
        ))}
      </section>
      <section
        className="shell section-space journal-section"
        id="journal"
        aria-labelledby="journal-title"
      >
        <div className="journal-intro">
          <SectionHeading
            number="08"
            label="The journal"
            id="journal-title"
            description="Explore jewellery, styling ideas and the world of Tiyas."
          >
            Stories, styles <br />
            and inspiration.
          </SectionHeading>
          <EditorialTextLink href="/journal/the-art-of-layering">
            Explore the journal
          </EditorialTextLink>
        </div>
        <div className="journal-grid">
          {journal.map((article) => (
            <article className="journal-card" key={article.slug}>
              <Link href={`/journal/${article.slug}`}>
                <div className="journal-image">
                  <ResponsiveImage
                    src={article.image}
                    alt={article.title}
                    sizes="(max-width: 599px) 46vw, 25vw"
                  />
                </div>
                <p className="eyebrow">{article.category}</p>
                <h3>{article.title}</h3>
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section
        className="newsletter-section"
        aria-labelledby="newsletter-title"
      >
        <div className="shell newsletter-inner">
          <div>
            <h2 id="newsletter-title">Join the Tiyas Circle.</h2>
            <p>New collections, considered notes, and a little inspiration.</p>
            <span className="newsletter-disclosure">
              Signup preview. Subscriptions opening soon.
            </span>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
