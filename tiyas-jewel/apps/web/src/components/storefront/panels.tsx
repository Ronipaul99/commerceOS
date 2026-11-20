"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useEffect, useState } from "react";
import type { Category, Product } from "@tiyas/shared";
import { Search, ArrowRight, ArrowUp } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useStorefront } from "./storefront-provider";
import { campaignCollections } from "@/lib/homepage-config";
import { categories } from "@/lib/storefront-config";
import { api } from "@/lib/api-client";
import { presentProduct } from "@/lib/catalog-presentation";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { formatINR } from "@/lib/money";
import { CartContent } from "./cart-content";
export function MobileMenu({ onClose }: { onClose: () => void }) {
  const { saved } = useStorefront();
  return (
    <Modal title="Explore Tiyas" onClose={onClose} side>
      <nav className="mobile-menu-links" aria-label="Mobile navigation">
        <Link href="/shop" onClick={onClose}>
          Shop all <ArrowRight size={20} aria-hidden="true" />
        </Link>
        {campaignCollections.map((collection) => (
          <Link
            key={collection.slug}
            href={`/collections/${collection.slug}`}
            onClick={onClose}
          >
            {collection.name}
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        ))}
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/shop/${category.slug}`}
            onClick={onClose}
          >
            {category.name}
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        ))}
        <Link href="/collections/everyday-edit" onClick={onClose}>
          The Everyday Edit
        </Link>
        <Link href="/collections/celebration" onClick={onClose}>
          The Celebration Edit
        </Link>
        <Link href="/wishlist" onClick={onClose}>
          Your wishlist ({saved.length})
        </Link>
        <Link href="/cart" onClick={onClose}>
          Your bag
        </Link>
        <Link href="/#our-story" onClick={onClose}>
          Our story
        </Link>
        <Link href="/journal/the-art-of-layering" onClick={onClose}>
          The Journal
        </Link>
      </nav>
    </Modal>
  );
}
export function SearchDialog({
  onClose,
  initialQuery = "",
}: {
  onClose: () => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{
    key: string;
    products: Product[];
    categories: Category[];
    error: boolean;
  } | null>(null);
  const router = useRouter();
  const id = useId();
  const q = query.trim();
  useEffect(() => {
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .search(q, abort.signal)
        .then(({ data }) => setResult({ key: q, ...data, error: false }))
        .catch(() => {
          if (!abort.signal.aborted)
            setResult({ key: q, products: [], categories: [], error: true });
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [q]);
  const ready = result?.key === q;
  const items = ready
    ? [
        ...result.products.map((product) => ({
          href: `/products/${product.slug}`,
          label: product.name,
          product,
        })),
        ...result.categories.map((category) => ({
          href: `/shop/${category.slug}`,
          label: `${category.name} collection`,
          product: null,
        })),
      ]
    : [];
  return (
    <Modal title="Find your form." onClose={onClose}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const item = items[active];
          if (item) {
            router.push(item.href);
            onClose();
          }
        }}
      >
        <label className="field-label" htmlFor={`${id}-input`}>
          Search jewellery or a category
        </label>
        <div className="search-field">
          <Search size={20} aria-hidden="true" />
          <input
            id={`${id}-input`}
            role="combobox"
            aria-expanded={true}
            aria-autocomplete="list"
            aria-controls={`${id}-results`}
            aria-activedescendant={
              active >= 0 ? `${id}-option-${active}` : undefined
            }
            type="search"
            placeholder="Earrings, a pendant, your next favourite..."
            value={query}
            maxLength={80}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(-1);
            }}
            onKeyDown={(event) => {
              if (
                (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                items.length
              ) {
                event.preventDefault();
                const next =
                  (active +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    items.length) %
                  items.length;
                setActive(next);
                document
                  .getElementById(`${id}-option-${next}`)
                  ?.scrollIntoView({ block: "nearest" });
              }
            }}
            autoComplete="off"
          />
        </div>
      </form>
      <p className="search-caption">
        {q ? "Your search" : "A little inspiration"}
      </p>
      {!ready ? (
        <p role="status">Finding your edit...</p>
      ) : result.error ? (
        <p role="status">
          Search is temporarily unavailable. Please try again.
        </p>
      ) : !items.length ? (
        <p role="status">No pieces found. Try a different name or category.</p>
      ) : null}
      <div
        id={`${id}-results`}
        role="listbox"
        aria-label="Search results"
        className="live-search-results"
      >
        {items.map((item, index) => {
          const image = item.product ? presentProduct(item.product) : null;
          return (
            <Link
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              href={item.href}
              key={item.href}
              onClick={onClose}
              className={index === active ? "active-result" : ""}
            >
              {image ? (
                <div className="search-thumb">
                  <ResponsiveImage
                    src={image.image}
                    alt={image.alt}
                    sizes="64px"
                  />
                </div>
              ) : null}
              <span>
                {item.label}
                {item.product ? (
                  <small>
                    {formatINR(item.product.pricePaise)}
                    {!item.product.available ? " / Out of stock" : ""}
                  </small>
                ) : (
                  <small>Shop by form</small>
                )}
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </Modal>
  );
}
export function StorefrontPanels() {
  const { panel, setPanel, searchTerm } = useStorefront();
  const close = () => setPanel(null);
  if (panel === "menu") return <MobileMenu onClose={close} />;
  if (panel === "search")
    return <SearchDialog onClose={close} initialQuery={searchTerm} />;
  if (panel === "bag")
    return (
      <Modal title="Your bag." onClose={close} side>
        <CartContent drawer onNavigate={close} />
      </Modal>
    );
  return null;
}
export function ScrollToTop() {
  return (
    <button
      className="scroll-top icon-button"
      aria-label="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        })
      }
    >
      <ArrowUp size={21} strokeWidth={1.2} />
    </button>
  );
}
