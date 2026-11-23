import {
  contentSectionSchema,
  type ContentValue,
  type ContentItem,
} from "@tiyas/shared";
import {
  campaignCollections,
  heroSlides,
  occasions,
  campaignArt,
  homepageConfig,
} from "./homepage-config";
const item = (id: string, values: Partial<ContentItem>) => ({
  id,
  title: "",
  subtitle: "",
  description: "",
  eyebrow: "",
  image: "",
  mobileImage: "",
  alt: "",
  href: "/shop",
  buttonText: "Explore collection",
  enabled: true,
  ...values,
});
export function defaultHomepage(): ContentValue {
  const section = (id: string, kind: string, values: object) =>
    contentSectionSchema.parse({ ...item(id, {}), kind, items: [], ...values });
  return {
    type: "homepage",
    content: {
      sections: [
        section("hero", "hero", {
          title: "Hero Slider",
          items: heroSlides
            .map((s, i) =>
              item(`slide-${i + 1}`, {
                ...s,
                subtitle: s.secondLine,
                buttonText: s.cta,
                alt: `Concept campaign for ${s.eyebrow}`,
              }),
            )
            .map(({ ...s }) => ({
              id: s.id,
              title: s.title,
              subtitle: s.subtitle,
              description: s.description,
              eyebrow: s.eyebrow,
              image: s.image,
              mobileImage: s.mobileImage,
              alt: s.alt,
              href: s.href,
              buttonText: s.buttonText,
              enabled: s.enabled,
            })),
        }),
        section("categories", "categories", {
          title: "Shop by Category",
          items: campaignCollections.map((c) =>
            item(c.slug, {
              title: c.name,
              image: c.image,
              alt: `Concept campaign for ${c.name}`,
              href: `/collections/${c.slug}`,
            }),
          ),
        }),
        section("collections", "collections", {
          title: "The Tiyas Collections",
          description:
            "Curated jewellery stories for every mood, occasion and style.",
          items: [
            campaignCollections[0],
            campaignCollections[1],
            campaignCollections[4],
          ].map((c) =>
            item(c.slug, {
              title: c.name,
              eyebrow: c.label,
              image: c.image,
              alt: `Concept campaign for ${c.name}`,
              href: `/collections/${c.slug}`,
            }),
          ),
        }),
        section("arrivals", "arrivals", {
          title: "New Arrivals",
          description: "Fresh designs, first at Tiyas Jewel.",
          buttonText: "View all new arrivals",
          href: "/shop?sort=newest",
        }),
        section("brace-kundan", "campaign", {
          title: "Brace Kundan",
          subtitle: "Collection",
          eyebrow: "The signature range",
          description: "Timeless forms with a modern touch.",
          image: campaignArt.brace,
          alt: "Concept campaign: Kundan bangles on burgundy silk",
          href: "/collections/brace-kundan",
          buttonText: "Shop Brace Kundan",
        }),
        section("occasions", "occasions", {
          title: "Shop by Occasion",
          description: "Jewellery for every moment that matters.",
          items: occasions.map((c, i) =>
            item(`occasion-${i + 1}`, {
              title: c.name,
              image: c.image,
              alt: `Editorial concept for ${c.name}`,
              href: c.href,
            }),
          ),
        }),
        section("types", "types", { title: "Shop by Type" }),
        section("showcases", "showcases", {
          title: "Collection Showcases",
          items: [0, 1, 4, 5].map((i) => {
            const c = campaignCollections[i]!;
            return item(c.slug, {
              title: c.name,
              eyebrow: c.label,
              description: c.description,
              image: c.image,
              alt: `Concept campaign for ${c.name}`,
              href: `/collections/${c.slug}`,
              collection: c.slug,
              buttonText: `Shop ${c.name}`,
            });
          }),
        }),
        section("promotion", "promotion", {
          ...homepageConfig.collectionPromotion,
          title: homepageConfig.collectionPromotion.title,
          description: homepageConfig.collectionPromotion.description,
          alt: "Concept campaign: silver replica jewellery",
          buttonText: "Explore the edit",
        }),
        section("trust", "trust", {
          title: "Why Shop at Tiyas Jewel",
          items: [
            item("collections", {
              title: "Considered collections",
              description: "Explore jewellery by mood and occasion.",
            }),
            item("guest", {
              title: "Easy guest checkout",
              description: "Find your piece. No account required.",
            }),
            item("wishlist", {
              title: "Your own edit",
              description: "Save favourites to your wishlist.",
            }),
            item("totals", {
              title: "Clear order totals",
              description: "View prices and delivery before placing an order.",
            }),
          ],
        }),
        section("story", "story", {
          title: "The Tiyas Story",
          eyebrow: "For every side of you",
          description:
            "From everyday expressions to moments of celebration. Discover jewellery that lets you bring a little more of yourself to every occasion.",
          image: campaignArt.story,
          alt: "Concept of sculptural gold flower earrings",
          href: "/info/our-story",
          buttonText: "Read our story",
        }),
        section("newsletter", "newsletter", {
          title: "Get Jewellery Updates & Exclusive Offers",
          description:
            "New collections, styling notes and a little inspiration. Sign-up opens soon.",
        }),
        section("reels", "reels", {
          title: "Shop Our Reels",
          description: "Watch & shop the latest saree looks",
          enabled: false,
        }),
        section("reviews", "reviews", {
          title: "Our Customers Love Us",
          description: "Experiences shared in our customers’ own words.",
          href: "/happy-customers",
          enabled: false,
        }),
      ],
    },
  };
}
export function defaultNavigation(): ContentValue {
  return {
    type: "navigation",
    content: {
      mobile: [
        { label: "Shop all", href: "/shop" },
        ...campaignCollections.map((c) => ({
          label: c.name,
          href: `/collections/${c.slug}`,
        })),
        { label: "Your wishlist", href: "/wishlist" },
        { label: "Your bag", href: "/cart" },
        { label: "Our story", href: "/info/our-story" },
        { label: "Happy customers", href: "/happy-customers" },
      ],
      footer: [
        {
          title: "Shop",
          links: [
            { label: "All jewellery", href: "/shop" },
            { label: "New arrivals", href: "/shop?sort=newest" },
            { label: "Earrings", href: "/shop/earrings" },
            { label: "Necklaces", href: "/shop/necklaces" },
            { label: "Your wishlist", href: "/wishlist" },
          ],
        },
        {
          title: "Collections",
          links: [0, 1, 4, 5].map((i) => ({
            label: campaignCollections[i]!.name,
            href: `/collections/${campaignCollections[i]!.slug}`,
          })),
        },
        {
          title: "Help",
          links: [
            { label: "Delivery & returns", href: "/info/shipping-returns" },
            { label: "Contact information", href: "/info/contact" },
            { label: "Your bag", href: "/cart" },
          ],
        },
        {
          title: "About Tiyas",
          links: [
            { label: "Our story", href: "/info/our-story" },
            { label: "Privacy policy", href: "/info/privacy" },
            { label: "Terms & conditions", href: "/info/terms" },
          ],
        },
      ],
    },
  };
}
