"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useId, useState } from "react";
import type { Category, Collection, ProductsResponse } from "@tiyas/shared";
import {
  SlidersHorizontal,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Home,
  LayoutGrid,
  List,
  X,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { presentProduct } from "@/lib/catalog-presentation";
import { ProductCard } from "@/components/storefront/product-card";
import { Modal } from "@/components/ui/modal";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import {
  collectionDesign,
  collectionDesigns,
  collectionArt,
} from "@/lib/collection-design";
import { editorialAssets } from "@/lib/storefront-config";
import {
  CatalogHero,
  CatalogSectionHeading,
  CatalogEditorial,
  CatalogClosing,
} from "./catalog-editorial";
function priceInput(paise: string | null) {
  return paise && /^\d+$/.test(paise) ? String(Number(paise) / 100) : "";
}
export function rupeesToPaise(value: string): string | null {
  if (!value) return "";
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return paise <= 2147483647 ? String(paise) : null;
}
export function CatalogPage({
  collection,
  categorySlug,
  previewCollection = false,
}: {
  collection?: Collection;
  categorySlug?: string;
  previewCollection?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [retry, setRetry] = useState(0);
  const query = Object.fromEntries(
    [
      "page",
      "limit",
      "category",
      "minPricePaise",
      "maxPricePaise",
      "availability",
      "sort",
      "featured",
    ].flatMap((key) => (params.has(key) ? [[key, params.get(key)!]] : [])),
  );
  if (categorySlug) query.category = categorySlug;
  if (collection && !previewCollection) query.collection = collection.slug;
  if (!query.limit) query.limit = "12";
  const key = new URLSearchParams(query).toString();
  const [result, setResult] = useState<{
    key: string;
    data: ProductsResponse | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    api
      .categories(abort.signal)
      .then((response) => setCategories(response.data))
      .catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    api
      .catalog(Object.fromEntries(new URLSearchParams(key)), abort.signal)
      .then((data) => setResult({ key, data, error: "" }))
      .catch(() => {
        if (!abort.signal.aborted)
          setResult({
            key,
            data: null,
            error:
              "We could not load this edit. Check your filters or try again.",
          });
      });
    return () => abort.abort();
  }, [key, retry]);
  const loaded = result?.key === key;
  const data = loaded ? result.data : null;
  const category = categories.find(
    (item) => item.slug === (categorySlug ?? params.get("category")),
  );
  function navigate(next: URLSearchParams, target = pathname) {
    router.push(`${target}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  function change(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    navigate(next);
  }
  function apply(form: HTMLFormElement) {
    const values = new FormData(form);
    const min = rupeesToPaise(String(values.get("min") ?? ""));
    const max = rupeesToPaise(String(values.get("max") ?? ""));
    if (
      min === null ||
      max === null ||
      (min !== "" && max !== "" && Number(min) > Number(max))
    ) {
      setFilterError("Use a valid price range, with up to two decimal places.");
      return;
    }
    const next = new URLSearchParams(params);
    for (const [name, value] of [
      ["category", String(values.get("category") ?? "")],
      ["availability", String(values.get("availability") ?? "")],
      ["minPricePaise", min],
      ["maxPricePaise", max],
      ["featured", values.get("featured") === "true" ? "true" : ""],
    ]) {
      if (value) next.set(name!, value);
      else next.delete(name!);
    }
    next.delete("page");
    setFilterError("");
    setFiltersOpen(false);
    navigate(next, categorySlug ? "/shop" : pathname);
  }
  const formId = useId();
  const design = collectionDesign(collection?.slug);
  const editorialInGrid = ["american-diamond", "temple-jewellery"].includes(
    design.slug,
  );
  const title = collection?.name ?? category?.name ?? design.headline;
  const clearHref = collection ? `/collections/${collection.slug}` : "/shop";
  const selectedDesign = collectionDesigns.find(
    (d) => d.slug === collection?.slug,
  );
  const allCollections = !collection && !categorySlug && !category;
  const categoryPhotos: Record<string, string> = {
    earrings: editorialAssets.hoops,
    necklaces: editorialAssets.pendant,
    rings: editorialAssets.rings,
    bracelets: editorialAssets.bracelet,
  };
  function categoryHref(slug: string) {
    const next = new URLSearchParams(params);
    if (slug) next.set("category", slug);
    else next.delete("category");
    next.delete("page");
    return `${collection ? pathname : "/shop"}${next.size ? `?${next}` : ""}`;
  }
  const activeFilters = [
    ...(query.category
      ? [{ key: "category", label: category?.name ?? query.category }]
      : []),
    ...(query.minPricePaise
      ? [
          {
            key: "minPricePaise",
            label: `From INR ${Number(query.minPricePaise) / 100}`,
          },
        ]
      : []),
    ...(query.maxPricePaise
      ? [
          {
            key: "maxPricePaise",
            label: `To INR ${Number(query.maxPricePaise) / 100}`,
          },
        ]
      : []),
    ...(query.availability
      ? [
          {
            key: "availability",
            label:
              query.availability === "in-stock" ? "In stock" : "Out of stock",
          },
        ]
      : []),
    ...(query.featured === "true"
      ? [{ key: "featured", label: "Featured" }]
      : []),
  ];
  function filterForm(mobile = false) {
    return (
      <form
        className="catalog-filter-form"
        key={`${key}-${mobile}`}
        onSubmit={(event) => {
          event.preventDefault();
          apply(event.currentTarget);
        }}
      >
        <details open className="cl-filter-group">
          <summary>Category</summary>
          <label>
            <span className="sr-only">Category</span>
            <select
              aria-label="Category"
              name="category"
              defaultValue={query.category ?? ""}
            >
              <option value="">All forms</option>
              {categories.map((item) => (
                <option value={item.slug} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </details>
        <details open className="cl-filter-group">
          <summary>Price Range</summary>
          <fieldset>
            <legend className="sr-only">Base price (INR)</legend>
            <div className="price-fields">
              <label htmlFor={`${formId}-${mobile}-min`}>
                From
                <input
                  id={`${formId}-${mobile}-min`}
                  name="min"
                  inputMode="decimal"
                  placeholder="Any"
                  defaultValue={priceInput(params.get("minPricePaise"))}
                />
              </label>
              <span aria-hidden="true">&ndash;</span>
              <label htmlFor={`${formId}-${mobile}-max`}>
                To
                <input
                  id={`${formId}-${mobile}-max`}
                  name="max"
                  inputMode="decimal"
                  placeholder="Any"
                  defaultValue={priceInput(params.get("maxPricePaise"))}
                />
              </label>
            </div>
          </fieldset>
        </details>
        <details open className="cl-filter-group">
          <summary>Availability</summary>
          <label>
            <span className="sr-only">Availability</span>
            <select
              aria-label="Availability"
              name="availability"
              defaultValue={query.availability ?? ""}
            >
              <option value="">All pieces</option>
              <option value="in-stock">In stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
          </label>
        </details>
        <details open className="cl-filter-group">
          <summary>The edit</summary>
          <label className="cl-featured-check">
            <input
              type="checkbox"
              name="featured"
              value="true"
              defaultChecked={query.featured === "true"}
            />
            Featured pieces only
          </label>
        </details>
        {filterError ? (
          <p className="field-error" role="alert">
            {filterError}
          </p>
        ) : null}
        <button className="action" type="submit">
          <SlidersHorizontal size={15} aria-hidden="true" /> Apply filters
        </button>
        <Link
          className="text-button"
          href={collection ? `/collections/${collection.slug}` : "/shop"}
          onClick={() => setFiltersOpen(false)}
        >
          <RotateCcw size={14} aria-hidden="true" /> Clear filters
        </Link>
      </form>
    );
  }
  return (
    <div className={`cl-page cl-columns-${design.columns}`}>
      <CatalogHero
        design={design}
        title={title}
        description={category?.description ?? undefined}
      />
      <div className="cl-shell">
        <div className="cl-breadcrumb-bar">
          <nav aria-label="Breadcrumb" className="cl-breadcrumbs">
            <Link href="/" aria-label="Home">
              <Home size={13} aria-hidden="true" />
              <span>Home</span>
            </Link>
            <ChevronRight size={12} aria-hidden="true" />
            <Link href="/collections">Collections</Link>
            {collection || category ? (
              <>
                <ChevronRight size={12} aria-hidden="true" />
                <span aria-current="page">{title}</span>
              </>
            ) : null}
          </nav>
          <p className="cl-top-count">
            {data
              ? `${data.pagination.total} pieces in this edit`
              : "Finding your edit..."}
          </p>
        </div>
        <div className="catalog-layout cl-catalog-layout">
          <aside
            className="desktop-filters cl-filter-panel"
            aria-label="Product filters"
          >
            <div className="cl-filter-heading">
              <h2>
                <SlidersHorizontal size={17} aria-hidden="true" />
                Refine your search
              </h2>
              <Link href={clearHref}>Clear all</Link>
            </div>
            <nav
              className="cl-filter-collections"
              aria-label="Browse collections"
            >
              <details open>
                <summary>Collection</summary>
                <Link
                  href="/collections"
                  aria-current={!collection ? "page" : undefined}
                >
                  All Collections
                </Link>
                {collectionDesigns
                  .filter((d) => d.slug !== "all")
                  .map((d) => (
                    <Link
                      key={d.slug}
                      href={`/collections/${d.slug}`}
                      aria-current={
                        collection?.slug === d.slug ? "page" : undefined
                      }
                    >
                      {d.name}
                      <ChevronRight size={12} aria-hidden="true" />
                    </Link>
                  ))}
              </details>
            </nav>
            {filterForm()}
          </aside>
          <div className="catalog-results">
            <CatalogSectionHeading
              title={
                selectedDesign?.sectionTitle ??
                (collection
                  ? `${collection.name}`
                  : category
                    ? `${category.name}`
                    : design.sectionTitle)
              }
              description={
                selectedDesign?.sectionDescription ??
                collection?.description ??
                category?.description ??
                design.sectionDescription
              }
            />
            <nav
              className={`category-navigation cl-thumbnail-navigation ${allCollections ? "cl-collection-thumbnails" : ""}`}
              aria-label={
                allCollections ? "Explore collections" : "Browse categories"
              }
            >
              {allCollections
                ? collectionDesigns
                    .filter((d) => d.slug !== "all")
                    .map((d) => (
                      <Link key={d.slug} href={`/collections/${d.slug}`}>
                        <div className="cl-thumbnail-image">
                          <ResponsiveImage
                            src={collectionArt(d.slug, "thumb")}
                            alt={`${d.name} campaign concept`}
                            sizes="(max-width: 767px) 110px, 12vw"
                          />
                        </div>
                        <span>{d.name}</span>
                      </Link>
                    ))
                : categories.map((item) => (
                    <Link
                      key={item.id}
                      href={categoryHref(item.slug)}
                      aria-current={
                        query.category === item.slug ? "page" : undefined
                      }
                    >
                      <div className="cl-thumbnail-image">
                        <ResponsiveImage
                          src={
                            selectedDesign &&
                            Object.hasOwn(categoryPhotos, item.slug)
                              ? collectionArt(design.slug, item.slug)
                              : (categoryPhotos[item.slug] ??
                                editorialAssets.hoops)
                          }
                          alt={`${item.name} editorial concept`}
                          sizes="(max-width: 767px) 120px, 18vw"
                        />
                      </div>
                      <span>
                        {item.name}
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
            </nav>
            {!allCollections && (
              <nav className="cl-category-links" aria-label="Browse categories">
                <Link
                  href={categoryHref("")}
                  aria-current={!query.category ? "page" : undefined}
                >
                  All pieces
                </Link>
                {categories.map((item) => (
                  <Link
                    key={item.id}
                    href={categoryHref(item.slug)}
                    aria-current={
                      query.category === item.slug ? "page" : undefined
                    }
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            )}
            {previewCollection && (
              <p className="tj-preview-note">
                <strong>More from Tiyas</strong> &mdash; current catalogue
                pieces, not an assigned {collection?.name} assortment yet.
              </p>
            )}
            {design.slug === "premium-kundan" && (
              <div className="cl-collection-intro">
                <span className="cl-eyebrow">The occasion edit</span>
                <h2>A celebration of personal style.</h2>
                <p>
                  Explore the forms, then find the piece that feels like you.
                </p>
              </div>
            )}
            {design.slug === "1-gram-gold" && (
              <CatalogEditorial design={design} />
            )}
            <div
              className="catalog-toolbar cl-catalog-toolbar"
              id="catalog-products"
            >
              <div className="cl-results-heading">
                <h2>
                  {allCollections
                    ? "All Collections"
                    : (category?.name ?? collection?.name ?? "The Tiyas edit")}
                </h2>
                <p className="results-count" role="status">
                  {data
                    ? `${data.pagination.total} ${data.pagination.total === 1 ? "piece" : "pieces"}`
                    : "Finding your edit..."}
                </p>
              </div>
              <button
                className="filter-trigger"
                onClick={() => {
                  setFilterError("");
                  setFiltersOpen(true);
                }}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filter
              </button>
              <label className="sort-control">
                <span>Sort by</span>
                <select
                  aria-label="Sort products"
                  value={query.sort ?? "newest"}
                  onChange={(event) => change("sort", event.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>
              <div className="cl-view-controls" aria-label="Product layout">
                <button
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
            {activeFilters.length > 0 && (
              <div className="cl-active-filters" aria-label="Active filters">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    aria-label={`Remove ${filter.label} filter`}
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.delete(filter.key);
                      next.delete("page");
                      navigate(
                        next,
                        categorySlug && filter.key === "category"
                          ? "/shop"
                          : pathname,
                      );
                    }}
                  >
                    {filter.label}
                    <X size={12} aria-hidden="true" />
                  </button>
                ))}
                <Link href={clearHref}>Clear all</Link>
              </div>
            )}
            {data?.data.some((p) => presentProduct(p).conceptImage) && (
              <p className="catalog-disclosure">
                Concept product images are marked individually. Actual product
                photography is pending.
              </p>
            )}
            {!loaded ? (
              <div
                className="catalog-skeleton"
                role="status"
                aria-label="Loading products"
              >
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} />
                ))}
              </div>
            ) : result.error ? (
              <div className="shopping-empty" role="alert">
                <h2>A moment, please.</h2>
                <p>{result.error}</p>
                <button
                  className="action"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Try again
                </button>
                <Link className="editorial-link" href="/shop">
                  Reset the edit
                </Link>
              </div>
            ) : data?.data.length ? (
              <>
                <div
                  className={`product-grid cl-product-grid ${view === "list" ? "cl-list-view" : ""}`}
                >
                  {data.data.map((product, index) => (
                    <Fragment key={product.id}>
                      <ProductCard
                        variant="listing"
                        product={presentProduct(product)}
                      />
                      {index === 5 &&
                        data.data.length > 6 &&
                        editorialInGrid && <CatalogEditorial design={design} />}
                    </Fragment>
                  ))}
                </div>
                {data.pagination.totalPages > 1 ? (
                  <nav className="pagination" aria-label="Product pages">
                    <button
                      className="icon-button"
                      aria-label="Previous page"
                      disabled={data.pagination.page <= 1}
                      onClick={() =>
                        change("page", String(data.pagination.page - 1))
                      }
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <span className="cl-page-summary">
                      Page {data.pagination.page} of{" "}
                      {data.pagination.totalPages}
                    </span>
                    {Array.from(
                      { length: Math.min(5, data.pagination.totalPages) },
                      (_, index) =>
                        Math.min(
                          Math.max(1, data.pagination.page - 2),
                          Math.max(1, data.pagination.totalPages - 4),
                        ) + index,
                    ).map((page) => (
                      <button
                        key={page}
                        className="cl-page-number"
                        aria-label={`Go to page ${page}`}
                        aria-current={
                          data.pagination.page === page ? "page" : undefined
                        }
                        onClick={() => change("page", String(page))}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="icon-button"
                      aria-label="Next page"
                      disabled={
                        data.pagination.page >= data.pagination.totalPages
                      }
                      onClick={() =>
                        change("page", String(data.pagination.page + 1))
                      }
                    >
                      <ArrowRight size={20} />
                    </button>
                  </nav>
                ) : null}
              </>
            ) : (
              <div className="shopping-empty">
                <h2>A different form, perhaps.</h2>
                <p>
                  No pieces match this edit. Try a wider price range or another
                  category.
                </p>
                <Link
                  className="button button-primary"
                  href={
                    collection ? `/collections/${collection.slug}` : "/shop"
                  }
                >
                  Clear the filters
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      {design.slug !== "1-gram-gold" &&
        !(editorialInGrid && (data?.data.length ?? 0) > 6) && (
          <div className="cl-shell cl-bottom-editorial">
            <CatalogEditorial design={design} />
          </div>
        )}
      <div className="cl-shell">
        <CatalogClosing />
      </div>
      {filtersOpen ? (
        <Modal
          title="Refine your edit."
          onClose={() => setFiltersOpen(false)}
          side
        >
          {filterForm(true)}
        </Modal>
      ) : null}
    </div>
  );
}
