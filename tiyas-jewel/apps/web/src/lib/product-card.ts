import type { DisplayProduct } from "./catalog-presentation";
import { formatINR } from "./money";

export function formatCardPrice(paise: number) {
  return formatINR(paise).replace(/\.00$/, "");
}

/** Optional, verified merchandising data. Never infer these facts from photography. */
export type ProductCardDetails = {
  subtitle?: string;
  material?: string;
  weightGrams?: number;
  size?: string;
  colors?: { name: string; hex: string; variantId?: string }[];
  bestseller?: boolean;
  rating?: { value: number; count: number };
};

export function defaultColorVariant(
  product: DisplayProduct,
  details?: ProductCardDetails,
) {
  const variants = product.raw?.variants ?? [];
  const colors = verifiedCardDetails(details).colors;
  if (
    !product.available ||
    !variants.length ||
    !variants.every((variant) =>
      colors.some((color) => color.variantId === variant.id),
    )
  )
    return null;
  return variants.find((variant) => variant.available)?.id ?? null;
}

export function cardSelection(
  product: DisplayProduct,
  variantId?: string | null,
) {
  const variants = product.raw?.variants ?? [];
  const variant = variants.find((item) => item.id === variantId);
  const pricePaise = variant
    ? (variant.pricePaise ?? product.pricePaise)
    : variants.length
      ? Math.min(
          ...variants.map((item) => item.pricePaise ?? product.pricePaise),
        )
      : product.pricePaise;
  const compareAtPaise =
    !variants.length || variant ? product.compareAtPaise : null;
  return {
    variant,
    pricePaise,
    from: variants.length > 0 && !variant,
    available:
      product.available && (!variants.length || Boolean(variant?.available)),
    compareAtPaise:
      compareAtPaise && compareAtPaise > pricePaise ? compareAtPaise : null,
    discountPercent:
      compareAtPaise && compareAtPaise > pricePaise
        ? Math.floor(((compareAtPaise - pricePaise) * 100) / compareAtPaise)
        : 0,
  };
}

type CardImage = { id: string; url: string; alt: string; position: number };
export function cardImages(
  product: DisplayProduct,
): [CardImage, ...CardImage[]] {
  const images =
    product.raw?.images.filter(
      (image) => !image.url.endsWith("catalog-placeholder.svg"),
    ) ?? [];
  return images[0]
    ? [images[0], ...images.slice(1)]
    : [{ id: "cover", url: product.image, alt: product.alt, position: 0 }];
}

export function verifiedCardDetails(details?: ProductCardDetails) {
  return {
    ...details,
    weightGrams:
      details?.weightGrams &&
      Number.isFinite(details.weightGrams) &&
      details.weightGrams > 0
        ? details.weightGrams
        : undefined,
    colors:
      details?.colors?.filter(
        (color) => color.name.trim() && /^#[\da-f]{6}$/i.test(color.hex),
      ) ?? [],
    rating:
      details?.rating &&
      Number.isFinite(details.rating.value) &&
      details.rating.value >= 0 &&
      details.rating.value <= 5 &&
      Number.isInteger(details.rating.count) &&
      details.rating.count > 0
        ? details.rating
        : undefined,
  };
}
