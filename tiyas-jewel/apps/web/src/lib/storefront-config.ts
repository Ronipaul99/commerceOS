export const storefrontConfig = {
  shipping: {
    title: "Free Shipping",
    detail: "Eligibility to be confirmed at launch.",
  },
  returns: {
    title: "Easy Returns",
    detail: "Return window to be confirmed at launch.",
  },
  payments: {
    title: "Secure Payments",
    detail: "Payment options coming at launch.",
  },
  packaging: {
    title: "Premium Packaging",
    detail: "Thoughtfully considered, down to the details.",
  },
  contact: null as string | null,
  socials: [] as { label: string; href: string }[],
};
export const editorialAssets = Object.fromEntries(
  [
    "hero",
    "hoops",
    "pendant",
    "rings",
    "bracelet",
    "flowers",
    "celebration",
    "story",
    "portrait",
  ].map((name) => [name, `/images/editorial/${name}.webp`]),
) as Record<
  | "hero"
  | "hoops"
  | "pendant"
  | "rings"
  | "bracelet"
  | "flowers"
  | "celebration"
  | "story"
  | "portrait",
  string
>;
export const categories = [
  { name: "Earrings", slug: "earrings", image: editorialAssets.hoops },
  { name: "Necklaces", slug: "necklaces", image: editorialAssets.pendant },
  { name: "Rings", slug: "rings", image: editorialAssets.rings },
  { name: "Bracelets", slug: "bracelets", image: editorialAssets.bracelet },
];
export const journal = [
  {
    slug: "the-art-of-layering",
    title: "The art of layering, made personal.",
    image: editorialAssets.story,
    category: "The styling notes",
    body: "Start with one piece you love. Add a second chain at a different length, then leave a little space between the two. A simple neckline lets each shape find its own rhythm.",
  },
  {
    slug: "a-little-more-statement",
    title: "A little more statement. A little more you.",
    image: editorialAssets.flowers,
    category: "In the details",
    body: "Let one sculptural piece lead. A bold earring, an open neckline and softly pulled-back hair can be all the composition needs. Choose what feels like you, and wear it your way.",
  },
];
