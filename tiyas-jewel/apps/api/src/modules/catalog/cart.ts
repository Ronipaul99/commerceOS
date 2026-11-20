import type { CartItemRef, CartLine, CartQuote, Product } from "@tiyas/shared";
// Read-only resolution. Never accepts client prices and never reserves/decrements stock.
export function resolveCart(
  items: CartItemRef[],
  products: Product[],
): CartQuote {
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines = items.map((item): CartLine => {
    const product = byId.get(item.productId);
    const base: CartLine = {
      ...item,
      requestedQuantity: item.quantity,
      quantity: 0,
      product: null,
      unitPricePaise: null,
      lineTotalPaise: 0,
      maxQuantity: 0,
      status: "missing",
    };
    if (!product || product.slug !== item.slug) return base;
    base.product = product;
    const variant = item.variantId
      ? product.variants.find((value) => value.id === item.variantId)
      : undefined;
    if (item.variantId && !variant)
      return { ...base, status: "variant_missing" };
    if (!item.variantId && product.variants.length)
      return { ...base, status: "variant_required" };
    const maxQuantity = Math.min(
      99,
      variant ? (variant.maxQuantity ?? 0) : (product.maxQuantity ?? 0),
    );
    const unitPricePaise = variant?.pricePaise ?? product.pricePaise;
    if (
      !product.available ||
      (variant && !variant.available) ||
      maxQuantity === 0
    )
      return { ...base, unitPricePaise, status: "unavailable" };
    const quantity = Math.min(item.quantity, maxQuantity);
    return {
      ...base,
      product,
      unitPricePaise,
      quantity,
      maxQuantity,
      status: quantity < item.quantity ? "adjusted" : "ready",
      lineTotalPaise: unitPricePaise * quantity,
    };
  });
  return {
    items: lines,
    subtotalPaise: lines.reduce((sum, line) => sum + line.lineTotalPaise, 0),
    currency: "INR",
  };
}
