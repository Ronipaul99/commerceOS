/** Presentation only. Merchandise, prices, membership and counts come from Fastify. */
export type CollectionDesign = {
  slug: string;
  name: string;
  eyebrow: string;
  headline: string;
  description: string;
  sectionTitle: string;
  sectionDescription: string;
  editorialTitle: string;
  editorialDescription: string;
  tone: "wine" | "gold" | "silver" | "pearl";
  columns: 3 | 4;
  heroPosition: string;
};
const designs: CollectionDesign[] = [
  {
    slug: "all",
    name: "All Collections",
    eyebrow: "All collections",
    headline: "Tiyas Collections",
    description: "Jewellery for every mood, occasion and expression.",
    sectionTitle: "Explore Our Collections",
    sectionDescription:
      "From celebratory statement pieces to your everyday favourites.",
    editorialTitle: "Find your own signature.",
    editorialDescription:
      "Discover the Tiyas edit, one considered detail at a time.",
    tone: "wine",
    columns: 3,
    heroPosition: "55% 50%",
  },
  {
    slug: "premium-kundan",
    name: "Premium Kundan",
    eyebrow: "The signature collection",
    headline: "Premium Kundan",
    description: "A royal perspective on your most special occasions.",
    sectionTitle: "Premium Kundan Collection",
    sectionDescription: "Heritage-inspired forms. A celebratory point of view.",
    editorialTitle: "Complete your occasion look.",
    editorialDescription:
      "Explore necklaces, earrings and finishing touches for your next celebration.",
    tone: "wine",
    columns: 3,
    heroPosition: "55% 50%",
  },
  {
    slug: "american-diamond",
    name: "American Diamond",
    eyebrow: "The sparkle edit",
    headline: "American Diamond Collection",
    description: "A little brilliance for every occasion.",
    sectionTitle: "American Diamond Collection",
    sectionDescription:
      "Discover a modern perspective on sparkle and evening style.",
    editorialTitle: "The modern elegance edit.",
    editorialDescription:
      "Light-catching details for the moments you make your own.",
    tone: "wine",
    columns: 3,
    heroPosition: "50% 50%",
  },
  {
    slug: "cz",
    name: "CZ",
    eyebrow: "The CZ collection",
    headline: "CZ Collection",
    description: "Modern sparkle. Everyday elegance.",
    sectionTitle: "CZ Collection",
    sectionDescription:
      "A fresh perspective on light, form and everyday expression.",
    editorialTitle: "Modern CZ brilliance.",
    editorialDescription:
      "Discover the edit, from understated accents to statement silhouettes.",
    tone: "wine",
    columns: 4,
    heroPosition: "50% 50%",
  },
  {
    slug: "1-gram-gold",
    name: "1 Gram Gold",
    eyebrow: "The signature collection",
    headline: "1 Gram Gold Collection",
    description: "Golden inspiration, from everyday to festive.",
    sectionTitle: "1 Gram Gold Collection",
    sectionDescription:
      "Explore a collection inspired by traditional forms and contemporary styling.",
    editorialTitle: "Everyday to festive.",
    editorialDescription:
      "Discover your next finishing touch in the Tiyas edit.",
    tone: "gold",
    columns: 3,
    heroPosition: "50% 50%",
  },
  {
    slug: "temple-jewellery",
    name: "Temple Jewellery",
    eyebrow: "The heritage collection",
    headline: "Temple Jewellery",
    description: "Heritage-inspired artistry. A timeless perspective.",
    sectionTitle: "Temple Jewellery Collection",
    sectionDescription:
      "Explore the collection by form and find your next statement.",
    editorialTitle: "A story in every detail.",
    editorialDescription:
      "Discover heritage-inspired silhouettes, from necklaces to earrings.",
    tone: "gold",
    columns: 3,
    heroPosition: "50% 50%",
  },
  {
    slug: "brace-kundan",
    name: "Brace Kundan",
    eyebrow: "The signature collection",
    headline: "Brace Kundan Collection",
    description: "A new perspective on celebratory wristwear.",
    sectionTitle: "Brace Kundan Collection",
    sectionDescription:
      "Explore the edit, with details that bring an occasion look together.",
    editorialTitle: "Celebrate your signature.",
    editorialDescription: "Explore jewellery for your most expressive moments.",
    tone: "wine",
    columns: 3,
    heroPosition: "50% 50%",
  },
  {
    slug: "silver-replica",
    name: "Silver Replica",
    eyebrow: "The silver replica edit",
    headline: "Silver Replica Collection",
    description: "Distinctive forms. A timeless point of view.",
    sectionTitle: "Silver Replica Collection",
    sectionDescription:
      "Discover the collection, inspired by heritage forms and contemporary styling.",
    editorialTitle: "The beauty of detail.",
    editorialDescription: "Find the silhouettes that make a look your own.",
    tone: "silver",
    columns: 4,
    heroPosition: "50% 50%",
  },
  {
    slug: "pearl-jewellery",
    name: "Pearl Jewellery",
    eyebrow: "The pearl collection",
    headline: "Pearl Jewellery",
    description: "A little grace for your everyday and occasion looks.",
    sectionTitle: "Pearl Jewellery Collection",
    sectionDescription: "Classic inspiration, thoughtfully styled for today.",
    editorialTitle: "The elegance of pearls.",
    editorialDescription:
      "Explore the edit, from everyday expressions to moments of celebration.",
    tone: "pearl",
    columns: 4,
    heroPosition: "50% 50%",
  },
];
export const collectionDesigns = designs;
export const collectionDesign = (slug?: string) =>
  designs.find((d) => d.slug === slug) ?? designs[0]!;
export const collectionArt = (slug: string, kind = "hero") =>
  `/images/collections/${slug}-${kind}${slug === "silver-replica" && ["necklaces", "earrings", "bracelets"].includes(kind) ? "-type" : ""}.webp`;
