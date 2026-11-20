/** Approved campaign presentation. Product membership/prices always come from Fastify. */
export const campaignArt = {
  tyohar: "/images/campaign/tyohar.webp",
  mobile: "/images/campaign/tyohar-mobile.webp",
  diamond: "/images/campaign/diamond.webp",
  temple: "/images/campaign/temple.webp",
  brace: "/images/campaign/brace.webp",
  pearl: "/images/campaign/pearl.webp",
  silver: "/images/campaign/silver.webp",
  bride: "/images/campaign/bride.webp",
  story: "/images/editorial/flowers.webp",
};
export const campaignCollections = [
  {
    name: "Premium Kundan",
    slug: "premium-kundan",
    image: campaignArt.tyohar,
    position: "76% 56%",
    label: "The royal edit",
    description:
      "An expression of tradition, reimagined for your celebrations.",
  },
  {
    name: "American Diamond",
    slug: "american-diamond",
    image: campaignArt.diamond,
    position: "75% 55%",
    label: "Everyday sparkle",
    description: "Light-catching forms for moments in the spotlight.",
  },
  {
    name: "CZ",
    slug: "cz",
    image: campaignArt.diamond,
    position: "69% 32%",
    label: "A little brilliance",
    description: "Discover a new perspective on sparkle.",
  },
  {
    name: "1 Gram Gold",
    slug: "1-gram-gold",
    image: campaignArt.brace,
    position: "80% 55%",
    label: "Golden expressions",
    description: "Golden tones, thoughtfully styled.",
  },
  {
    name: "Temple Jewellery",
    slug: "temple-jewellery",
    image: campaignArt.temple,
    position: "76% 56%",
    label: "Heritage craft",
    description: "Traditional forms, full of character.",
  },
  {
    name: "Brace Kundan",
    slug: "brace-kundan",
    image: campaignArt.brace,
    position: "76% 55%",
    label: "The signature range",
    description: "A contemporary take on classic Kundan.",
  },
  {
    name: "Silver Replica",
    slug: "silver-replica",
    image: campaignArt.silver,
    position: "50% 50%",
    label: "A different shine",
    description: "Distinctive silhouettes in silver tones.",
  },
  {
    name: "Pearl Jewellery",
    slug: "pearl-jewellery",
    image: "/images/campaign/occasion-gifting.webp",
    position: "50% 50%",
    label: "Quietly luminous",
    description: "The timeless appeal of pearls.",
  },
] as const;
export const showcaseSlugs = [
  "premium-kundan",
  "american-diamond",
  "temple-jewellery",
  "brace-kundan",
] as const;
export const heroSlides = [
  {
    title: "Tyohar",
    secondLine: "Collection",
    eyebrow: "The festive edit",
    description: "Tradition meets celebration.",
    cta: "Explore the collection",
    href: "/collections/premium-kundan",
    image: campaignArt.tyohar,
    mobileImage: campaignArt.mobile,
  },
  {
    title: "A little",
    secondLine: "brilliance.",
    eyebrow: "The American Diamond edit",
    description: "For your moments in the spotlight.",
    cta: "Discover American Diamond",
    href: "/collections/american-diamond",
    image: campaignArt.diamond,
    mobileImage: campaignArt.diamond,
  },
  {
    title: "Rooted in",
    secondLine: "tradition.",
    eyebrow: "The heritage edit",
    description: "An ode to timeless Indian elegance.",
    cta: "Explore temple jewellery",
    href: "/collections/temple-jewellery",
    image: campaignArt.temple,
    mobileImage: campaignArt.temple,
  },
] as const;
export const occasions = [
  {
    name: "Bridal Collection",
    href: "/collections/premium-kundan",
    image: campaignArt.bride,
    position: "50% 42%",
  },
  {
    name: "Festive Collection",
    href: "/collections/celebration",
    image: "/images/campaign/occasion-festive.webp",
    position: "50% 40%",
  },
  {
    name: "Everyday Wear",
    href: "/collections/everyday-edit",
    image: "/images/campaign/occasion-everyday.webp",
    position: "50% 40%",
  },
  {
    name: "Party Collection",
    href: "/collections/american-diamond",
    image: "/images/campaign/occasion-party.webp",
    position: "50% 40%",
  },
  {
    name: "Gifting Collection",
    href: "/shop",
    image: "/images/campaign/occasion-gifting.webp",
    position: "50% 50%",
  },
  {
    name: "Wedding Essentials",
    href: "/collections/premium-kundan",
    image: "/images/campaign/occasion-wedding.webp",
    position: "50% 50%",
  },
  {
    name: "Office Elegance",
    href: "/collections/everyday-edit",
    image: "/images/editorial/portrait.webp",
    position: "50% 32%",
  },
  {
    name: "Traditional Heritage",
    href: "/collections/temple-jewellery",
    image: "/images/campaign/occasion-heritage.webp",
    position: "50% 50%",
  },
] as const;
export type ApprovedPromotion = {
  id: string;
  active: boolean;
  title: string;
  detail: string;
  conditions: string;
  href: string;
  image: string;
};
export type ApprovedReview = {
  id: string;
  approved: boolean;
  text: string;
  name: string;
  rating?: number;
  product?: { name: string; href: string };
};
export const homepageConfig = {
  announcements: [
    { label: "Discover your next favourite", href: "/shop", icon: "sparkles" },
    {
      label: "Delivery charges shown at checkout",
      href: "/info/shipping-returns",
      icon: "truck",
    },
    {
      label: "Shop as a guest. No account needed.",
      href: "/shop",
      icon: "shield",
    },
  ],
  collectionPromotion: {
    title: "Silver Replica",
    subtitle: "Collection",
    description: "Timeless designs with a classic appeal.",
    image: "/images/campaign/silver-promotion.webp",
    href: "/collections/silver-replica",
  },
  contact: null as { label: string; href: string } | null,
  promotions: [] as ApprovedPromotion[],
  reviews: [] as ApprovedReview[],
};
export const collectionHref = (slug: string) => `/collections/${slug}`;
