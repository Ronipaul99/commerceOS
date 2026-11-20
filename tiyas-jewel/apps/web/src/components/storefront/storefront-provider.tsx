"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { CartItemRef, CartQuote, Product } from "@tiyas/shared";
import { api } from "@/lib/api-client";
import type { DisplayProduct } from "@/lib/catalog-presentation";
import {
  cartKey,
  createShoppingStore,
  SHOPPING_STORAGE_KEY,
  type WishlistRef,
} from "@/lib/shopping-storage";
type Panel = "menu" | "search" | "bag" | null;
type State = {
  saved: string[];
  wishlistRefs: WishlistRef[];
  cartRefs: CartItemRef[];
  cart: CartQuote;
  cartStatus: "loading" | "ready" | "error";
  cartError: string;
  hydrated: boolean;
  storageWarning: string;
  panel: Panel;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setPanel: (panel: Panel) => void;
  toggleSaved: (product: Product | DisplayProduct) => void;
  removeSaved: (id: string) => void;
  addToBag: (
    product: Product | DisplayProduct,
    variantId?: string | null,
    quantity?: number,
  ) => Promise<boolean>;
  removeFromBag: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => Promise<boolean>;
  refreshCart: () => void;
  completePurchase: (items: CartItemRef[], orderNumber: string) => void;
};
const Context = createContext<State | null>(null);
const emptyQuote: CartQuote = { items: [], subtotalPaise: 0, currency: "INR" };
export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createShoppingStore);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [panel, setPanel] = useState<Panel>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<{
    key: string;
    data: CartQuote;
    error: string;
  } | null>(null);
  const queue = useRef(Promise.resolve());
  const key = `${snapshot.revision}:${JSON.stringify(snapshot.cart)}`;
  useEffect(() => {
    store.hydrate();
    const changed = (event: StorageEvent) => {
      if (event.key === SHOPPING_STORAGE_KEY || event.key === null)
        store.hydrate();
    };
    const refresh = () => store.refresh();
    window.addEventListener("storage", changed);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("focus", refresh);
    };
  }, [store]);
  useEffect(() => {
    if (!snapshot.hydrated || !snapshot.cart.length) return;
    const abort = new AbortController();
    api
      .resolveCart(snapshot.cart, abort.signal)
      .then((response) => setResolved({ key, data: response.data, error: "" }))
      .catch(() => {
        if (!abort.signal.aborted)
          setResolved({
            key,
            data: emptyQuote,
            error: "We could not verify your bag. Please try again.",
          });
      });
    return () => abort.abort();
  }, [key, snapshot.cart, snapshot.hydrated]);
  function enqueue(job: () => Promise<boolean>) {
    const next = queue.current.then(job, job);
    queue.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
  function toggleSaved(product: Product | DisplayProduct) {
    if ("source" in product && product.source === "demo") {
      setAnnouncement("This concept piece is not in the catalogue.");
      return;
    }
    const state = store.getSnapshot();
    const removing = state.wishlist.some(
      (item) => item.productId === product.id,
    );
    if (!removing && state.wishlist.length >= 50) {
      setAnnouncement("Your wishlist can hold up to 50 pieces.");
      return;
    }
    store.update({
      version: 1,
      cart: state.cart,
      wishlist: removing
        ? state.wishlist.filter((item) => item.productId !== product.id)
        : [...state.wishlist, { productId: product.id, slug: product.slug }],
    });
    setAnnouncement(
      `${product.name} ${removing ? "removed from" : "saved to"} your wishlist.`,
    );
  }
  async function resolveChange(
    next: CartItemRef[],
    before: CartItemRef[],
    candidate?: string,
    open = false,
  ) {
    setBusy(true);
    try {
      const response = await api.resolveCart(next);
      if (JSON.stringify(store.getSnapshot().cart) !== JSON.stringify(before)) {
        setAnnouncement("Your bag changed. Please try again.");
        return false;
      }
      const line = candidate
        ? response.data.items.find((item) => cartKey(item) === candidate)
        : undefined;
      if (
        candidate &&
        (!line || !["ready", "adjusted"].includes(line.status))
      ) {
        setAnnouncement(
          "This selection is no longer available. Please choose another piece.",
        );
        return false;
      }
      const refs = next.map((item) => {
        const quote = response.data.items.find(
          (line) => cartKey(line) === cartKey(item),
        );
        return quote && quote.quantity > 0
          ? { ...item, quantity: quote.quantity }
          : item;
      });
      const state = store.getSnapshot();
      store.update({ version: 1, cart: refs, wishlist: state.wishlist });
      setResolved({
        key: `${store.getSnapshot().revision}:${JSON.stringify(refs)}`,
        data: response.data,
        error: "",
      });
      setAnnouncement(
        line?.status === "adjusted"
          ? `Quantity limited to ${line.quantity} currently available.`
          : "Your bag has been updated.",
      );
      if (open) setPanel("bag");
      return true;
    } catch {
      setAnnouncement(
        "We could not verify this selection. Your bag has not changed.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  function addToBag(
    product: Product | DisplayProduct,
    variantId: string | null = null,
    quantity = 1,
  ) {
    return enqueue(async () => {
      if (
        ("source" in product && product.source === "demo") ||
        !product.available ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        setAnnouncement("This selection is unavailable.");
        return false;
      }
      const before = store.getSnapshot().cart;
      const item = {
        productId: product.id,
        slug: product.slug,
        variantId,
        quantity,
      };
      const itemKey = cartKey(item);
      const found = before.find((line) => cartKey(line) === itemKey);
      if (!found && before.length >= 50) {
        setAnnouncement("Your bag can hold up to 50 selections.");
        return false;
      }
      const next = found
        ? before.map((line) =>
            cartKey(line) === itemKey
              ? { ...line, quantity: Math.min(99, line.quantity + quantity) }
              : line,
          )
        : [...before, item];
      return resolveChange(next, before, itemKey, true);
    });
  }
  function removeFromBag(itemKey: string) {
    const state = store.getSnapshot();
    store.update({
      version: 1,
      cart: state.cart.filter((item) => cartKey(item) !== itemKey),
      wishlist: state.wishlist,
    });
  }
  function updateQuantity(itemKey: string, quantity: number) {
    return enqueue(async () => {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
        return false;
      const before = store.getSnapshot().cart;
      return resolveChange(
        before.map((item) =>
          cartKey(item) === itemKey ? { ...item, quantity } : item,
        ),
        before,
        itemKey,
      );
    });
  }
  const cartStatus =
    !snapshot.hydrated ||
    busy ||
    (snapshot.cart.length > 0 && resolved?.key !== key)
      ? "loading"
      : snapshot.cart.length && resolved?.error
        ? "error"
        : "ready";
  return (
    <Context.Provider
      value={{
        panel,
        setPanel,
        searchTerm,
        setSearchTerm,
        saved: snapshot.wishlist.map((item) => item.productId),
        wishlistRefs: snapshot.wishlist,
        cartRefs: snapshot.cart,
        cart:
          snapshot.cart.length && resolved?.key === key
            ? resolved.data
            : emptyQuote,
        cartStatus,
        cartError: resolved?.error ?? "",
        hydrated: snapshot.hydrated,
        storageWarning: snapshot.warning,
        toggleSaved,
        addToBag,
        removeFromBag,
        updateQuantity,
        refreshCart: store.refresh,
        completePurchase: (items, orderNumber) => {
          const state = store.getSnapshot();
          if (state.completedOrders.includes(orderNumber)) return;
          const quantities = new Map(
            items.map((i) => [cartKey(i), i.quantity]),
          );
          store.update({
            version: 1,
            wishlist: state.wishlist,
            completedOrders: [
              ...state.completedOrders.slice(-199),
              orderNumber,
            ],
            cart: state.cart.flatMap((i) => {
              const quantity = i.quantity - (quantities.get(cartKey(i)) ?? 0);
              return quantity > 0 ? [{ ...i, quantity }] : [];
            }),
          });
        },
        removeSaved: (id) => {
          const state = store.getSnapshot();
          store.update({
            version: 1,
            cart: state.cart,
            wishlist: state.wishlist.filter((item) => item.productId !== id),
          });
        },
      }}
    >
      {children}
      {announcement ? (
        <div
          className="shopping-announcement"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>{announcement}</span>
          <button
            aria-label="Dismiss message"
            onClick={() => setAnnouncement("")}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </Context.Provider>
  );
}
export function useStorefront() {
  const context = useContext(Context);
  if (!context) throw new Error("StorefrontProvider is missing");
  return context;
}
