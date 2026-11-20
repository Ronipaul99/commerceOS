"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { Category, Collection, ProductsResponse } from "@tiyas/shared";
import { SlidersHorizontal, ArrowLeft, ArrowRight } from "lucide-react";
import { api } from "@/lib/api-client";
import { presentProduct } from "@/lib/catalog-presentation";
import { ProductCard } from "@/components/storefront/product-card";
import { Modal } from "@/components/ui/modal";
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
}: {
  collection?: Collection;
  categorySlug?: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterError, setFilterError] = useState("");
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
  if (collection) query.collection = collection.slug;
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
        <label>
          Category
          <select name="category" defaultValue={query.category ?? ""}>
            <option value="">All forms</option>
            {categories.map((item) => (
              <option value={item.slug} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Base price (INR)</legend>
          <div className="price-fields">
            <label htmlFor={`${formId}-${mobile}-min`}>
              From
              <input
                id={`${formId}-${mobile}-min`}
                name="min"
                inputMode="decimal"
                placeholder="0"
                defaultValue={priceInput(params.get("minPricePaise"))}
              />
            </label>
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
        <label>
          Availability
          <select name="availability" defaultValue={query.availability ?? ""}>
            <option value="">All pieces</option>
            <option value="in-stock">In stock</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
        </label>
        {filterError ? (
          <p className="field-error" role="alert">
            {filterError}
          </p>
        ) : null}
        <button className="action" type="submit">
          Apply filters
        </button>
        <Link
          className="text-button"
          href={collection ? `/collections/${collection.slug}` : "/shop"}
          onClick={() => setFiltersOpen(false)}
        >
          Clear filters
        </Link>
      </form>
    );
  }
  return (
    <div className="shell shopping-page catalog-page">
      <div className="catalog-intro">
        <p className="eyebrow">
          The Tiyas edit / {collection ? "Collections" : "Shop by form"}
        </p>
        <h1>
          {collection?.name ?? category?.name ?? "Discover your signature."}
        </h1>
        <p>
          {collection?.description ??
            category?.description ??
            "Considered forms. Personal expression. Find the piece that feels like you."}
        </p>
      </div>
      <nav className="category-navigation" aria-label="Browse categories">
        <Link
          href={collection ? `/collections/${collection.slug}` : "/shop"}
          aria-current={!query.category ? "page" : undefined}
        >
          All pieces
        </Link>
        {categories.map((item) => {
          const next = new URLSearchParams(params);
          next.set("category", item.slug);
          next.delete("page");
          return (
            <Link
              key={item.id}
              href={`${collection ? pathname : "/shop"}?${next}`}
              aria-current={query.category === item.slug ? "page" : undefined}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="catalog-toolbar">
        <p className="results-count" role="status">
          {data
            ? `${data.pagination.total} ${data.pagination.total === 1 ? "piece" : "pieces"}`
            : "Finding your edit..."}
        </p>
        <button
          className="filter-trigger"
          onClick={() => {
            setFilterError("");
            setFiltersOpen(true);
          }}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          Filter
        </button>
        <label className="sort-control">
          Sort by
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
      </div>
      <div className="catalog-layout">
        <aside className="desktop-filters" aria-label="Product filters">
          <h2>Refine your edit.</h2>
          {filterForm()}
        </aside>
        <div className="catalog-results">
          <p className="catalog-disclosure">
            Concept images are illustrative. Actual product photography is
            pending.
          </p>
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
              <div className="product-grid">
                {data.data.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={presentProduct(product)}
                  />
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
                  <span>
                    Page {data.pagination.page} of {data.pagination.totalPages}
                  </span>
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
                href={collection ? `/collections/${collection.slug}` : "/shop"}
              >
                Clear the filters
              </Link>
            </div>
          )}
        </div>
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
