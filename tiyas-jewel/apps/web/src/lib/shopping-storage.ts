import { z } from "zod";
import { cartItemSchema, slugSchema, type CartItemRef } from "@tiyas/shared";
export const SHOPPING_STORAGE_KEY = "tiyas.shopping.v1";
export type WishlistRef = { productId: string; slug: string };
export type ShoppingData = {
  version: 1;
  completedOrders: string[];
  cart: CartItemRef[];
  wishlist: WishlistRef[];
};
export const emptyShopping = (): ShoppingData => ({
  version: 1,
  completedOrders: [],
  cart: [],
  wishlist: [],
});
const schema = z.object({
  version: z.literal(1),
  completedOrders: z.array(z.string().max(64)).max(200).default([]),
  cart: z.array(cartItemSchema.strip()).max(50),
  wishlist: z
    .array(
      z.object({ productId: z.string().min(1).max(128), slug: slugSchema }),
    )
    .max(50),
});
export const cartKey = (item: {
  productId: string;
  variantId: string | null;
}) => `${item.productId}:${item.variantId ?? ""}`;
export function parseShopping(raw: string | null): ShoppingData {
  if (!raw) return emptyShopping();
  if (raw.length > 100000)
    throw new Error("Stored selections exceed the supported size");
  const value = schema.parse(JSON.parse(raw));
  if (
    new Set(value.cart.map(cartKey)).size !== value.cart.length ||
    new Set(value.wishlist.map((item) => item.productId)).size !==
      value.wishlist.length
  )
    throw new Error("Duplicate stored selections");
  return value;
}
export function createShoppingStore() {
  const initial = {
    ...emptyShopping(),
    hydrated: false,
    revision: 0,
    warning: "",
  };
  let current = initial;
  const listeners = new Set<() => void>();
  function emit() {
    for (const listener of listeners) listener();
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => current,
    getServerSnapshot: () => initial,
    hydrate() {
      try {
        current = {
          ...parseShopping(localStorage.getItem(SHOPPING_STORAGE_KEY)),
          hydrated: true,
          revision: current.revision + 1,
          warning: "",
        };
      } catch {
        current = {
          ...emptyShopping(),
          hydrated: true,
          revision: current.revision + 1,
          warning:
            "Saved selections could not be restored. You can start a new bag.",
        };
      }
      emit();
    },
    update(
      next: Omit<ShoppingData, "completedOrders"> & {
        completedOrders?: string[];
      },
    ) {
      let warning = "";
      const clean = parseShopping(
        JSON.stringify({
          ...next,
          completedOrders: next.completedOrders ?? current.completedOrders,
        }),
      );
      try {
        localStorage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify(clean));
      } catch {
        warning =
          "This browser cannot save your selections. They remain available until you leave this page.";
      }
      current = {
        ...clean,
        hydrated: true,
        revision: current.revision + 1,
        warning,
      };
      emit();
    },
    refresh() {
      current = { ...current, revision: current.revision + 1 };
      emit();
    },
  };
}
