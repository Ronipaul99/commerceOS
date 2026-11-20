"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import {
  adminProductInputSchema,
  adminProductResponseSchema,
  adminAssetSchema,
  adminOptionsSchema,
  type AdminProduct,
} from "@tiyas/shared";
import { adminOkSchema } from "@/lib/admin-client";
import { useAdmin } from "./shell";
type Options = z.infer<typeof adminOptionsSchema>["data"];
type FormImage = { id?: string; assetId?: string; url: string; alt: string };
type Variant = {
  id?: string;
  version?: string;
  name: string;
  sku: string;
  price: string;
  stockQuantity: number;
  active: boolean;
  imageRef: string | null;
  key: string;
};
const amountText = (n: number) =>
  `${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`;
function paise(s: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(s.trim()))
    throw Error("Enter prices in rupees with up to two decimal places.");
  const [a, b = ""] = s.trim().split(".");
  const value = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(value)) throw Error("Price is too large.");
  return value;
}
export function AdminProductForm({
  product,
  options,
}: {
  product?: AdminProduct;
  options: Options;
}) {
  const { request } = useAdmin(),
    router = useRouter();
  const counter = useRef(0);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? options.categories[0]?.id ?? "",
    collectionIds: product?.collectionIds ?? [],
    price: product ? amountText(product.pricePaise) : "",
    compare: product?.compareAtPaise ? amountText(product.compareAtPaise) : "",
    sku: product?.sku ?? "",
    stockQuantity: product?.stockQuantity ?? 0,
    active: product?.active ?? true,
    featured: product?.featured ?? false,
  });
  const [images, setImages] = useState<FormImage[]>(
    product?.images.map((i) => ({
      id: i.id,
      assetId: i.assetId ?? undefined,
      url: i.url,
      alt: i.alt,
    })) ?? [],
  );
  const [variants, setVariants] = useState<Variant[]>(
    product?.variants.map((v) => ({
      id: v.id,
      version: v.version,
      name: v.name,
      sku: v.sku,
      price: v.pricePaise === null ? "" : amountText(v.pricePaise),
      stockQuantity: v.stockQuantity,
      active: v.active,
      imageRef: v.imageRef,
      key: v.id,
    })) ?? [],
  );
  const [removed, setRemoved] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const key = (i: FormImage) => i.id ?? i.assetId!;
  function change<K extends keyof typeof form>(
    name: K,
    value: (typeof form)[K],
  ) {
    setForm((v) => ({ ...v, [name]: value }));
  }
  function variant(index: number, change: Partial<Variant>) {
    setVariants((v) =>
      v.map((item, i) => (i === index ? { ...item, ...change } : item)),
    );
  }
  async function upload(files: File[], replace?: number) {
    if (!files.length) return;
    if (images.length + (replace === undefined ? files.length : 0) > 12) {
      setError("A product can have up to 12 images.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024)
          throw Error("Images must be 5 MB or smaller.");
        const { data } = await request(
          "/images",
          z.object({ data: adminAssetSchema }),
          { method: "POST", file },
        );
        const image = {
          assetId: data.id,
          url: data.url,
          alt: form.name
            ? `${form.name} – product detail`
            : "Jewellery product detail",
        };
        if (replace !== undefined) {
          const old = images[replace];
          if (old?.assetId) setRemoved((v) => [...v, old.assetId!]);
          if (old)
            setVariants((v) =>
              v.map((i) =>
                i.imageRef === key(old) ? { ...i, imageRef: data.id } : i,
              ),
            );
          setImages((v) =>
            v.map((i, index) => (index === replace ? image : i)),
          );
        } else setImages((v) => [...v, image]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }
  function removeImage(index: number) {
    const image = images[index]!;
    if (image.assetId) setRemoved((v) => [...v, image.assetId!]);
    setVariants((v) =>
      v.map((i) => (i.imageRef === key(image) ? { ...i, imageRef: null } : i)),
    );
    setImages((v) => v.filter((_, i) => i !== index));
  }
  return (
    <form
      className="admin-product-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const input = adminProductInputSchema.parse({
            ...(product ? { version: product.version } : {}),
            name: form.name,
            slug: form.slug,
            description: form.description,
            categoryId: form.categoryId,
            collectionIds: form.collectionIds,
            sku: form.sku,
            pricePaise: paise(form.price),
            compareAtPaise: form.compare ? paise(form.compare) : null,
            stockQuantity: form.stockQuantity,
            active: form.active,
            featured: form.featured,
            images: images.map((i) => ({
              ...(i.id ? { id: i.id } : { assetId: i.assetId }),
              alt: i.alt,
            })),
            variants: variants.map((v) => ({
              ...(v.id ? { id: v.id, version: v.version } : {}),
              name: v.name,
              sku: v.sku,
              pricePaise: v.price ? paise(v.price) : null,
              stockQuantity: v.stockQuantity,
              active: v.active,
              imageRef: v.imageRef,
            })),
          });
          setBusy(true);
          const { data } = await request(
            product ? `/products/${product.id}` : "/products",
            adminProductResponseSchema,
            { method: product ? "PUT" : "POST", body: input },
          );
          // Detached assets used in historical orders are intentionally retained by the API.
          for (const id of removed)
            await request(`/images/${id}`, adminOkSchema, {
              method: "DELETE",
            }).catch(() => undefined);
          router.replace(`/admin/products/${data.id}/edit?saved=1`);
          router.refresh();
        } catch (e) {
          setError(
            e instanceof z.ZodError
              ? e.issues
                  .map((i) => `${i.path.join(".")}: ${i.message}`)
                  .join(" · ")
              : e instanceof Error
                ? e.message
                : "Product could not be saved.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy || uploading}>
        <section className="admin-panel">
          <h2>Product details</h2>
          <div className="admin-form-grid">
            <label>
              Product name
              <input
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
            <label>
              Product slug
              <input
                required
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                aria-label="Product slug"
                aria-describedby="admin-slug-help"
                value={form.slug}
                onChange={(e) => change("slug", e.target.value)}
              />
              <small id="admin-slug-help">
                Lowercase words separated by hyphens.
              </small>
            </label>
            <label className="admin-field-full">
              Description
              <textarea
                required
                rows={4}
                maxLength={10000}
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
              />
            </label>
            <label>
              Category
              <select
                required
                value={form.categoryId}
                onChange={(e) => change("categoryId", e.target.value)}
              >
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.active ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              SKU
              <input
                required
                maxLength={80}
                value={form.sku}
                onChange={(e) => change("sku", e.target.value)}
              />
            </label>
          </div>
          <fieldset className="admin-collections">
            <legend>Collections</legend>
            {options.collections.map((c) => (
              <label className="admin-check" key={c.id}>
                <input
                  type="checkbox"
                  checked={form.collectionIds.includes(c.id)}
                  onChange={(e) =>
                    change(
                      "collectionIds",
                      e.target.checked
                        ? [...form.collectionIds, c.id]
                        : form.collectionIds.filter((id) => id !== c.id),
                    )
                  }
                />
                {c.name}
                {c.active ? "" : " (inactive)"}
              </label>
            ))}
          </fieldset>
        </section>
        <section className="admin-panel">
          <h2>Price & availability</h2>
          <div className="admin-form-grid">
            <label>
              Price (INR)
              <input
                required
                inputMode="decimal"
                placeholder="1490.00"
                value={form.price}
                onChange={(e) => change("price", e.target.value)}
              />
            </label>
            <label>
              Compare-at price (INR)
              <input
                inputMode="decimal"
                placeholder="Optional"
                value={form.compare}
                onChange={(e) => change("compare", e.target.value)}
              />
            </label>
            <label>
              Available stock
              <input
                type="number"
                min={0}
                max={1000000}
                step={1}
                required
                value={form.stockQuantity}
                aria-label="Available stock"
                aria-describedby="admin-stock-help"
                onChange={(e) =>
                  change("stockQuantity", Number(e.target.value))
                }
              />
              <small id="admin-stock-help">
                Available units exclude stock already held for payment. For
                variant products, set stock on each variant below.
              </small>
            </label>
            <div className="admin-toggles">
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => change("active", e.target.checked)}
                />
                Active on storefront
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => change("featured", e.target.checked)}
                />
                Featured product
              </label>
            </div>
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-section-title">
            <div>
              <h2>Product images</h2>
              <p>
                JPEG, PNG or WebP · up to 5 MB · 200–6000 px · maximum 12 images
              </p>
            </div>
            <label className="admin-button admin-button-light admin-upload">
              Upload images
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload product images"
                onChange={(e) => {
                  void upload([...(e.target.files ?? [])]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="admin-image-grid">
            {images.map((image, index) => (
              <article className="admin-image-item" key={key(image)}>
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={280}
                  height={280}
                  unoptimized
                />
                <label>
                  Image description
                  <input
                    required
                    maxLength={250}
                    value={image.alt}
                    onChange={(e) =>
                      setImages((v) =>
                        v.map((i, n) =>
                          n === index ? { ...i, alt: e.target.value } : i,
                        ),
                      )
                    }
                  />
                </label>
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="admin-icon-button"
                    disabled={index === 0}
                    aria-label={`Move image ${index + 1} earlier`}
                    onClick={() =>
                      setImages((v) => {
                        const copy = [...v];
                        [copy[index - 1], copy[index]] = [
                          copy[index]!,
                          copy[index - 1]!,
                        ];
                        return copy;
                      })
                    }
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-button"
                    disabled={index === images.length - 1}
                    aria-label={`Move image ${index + 1} later`}
                    onClick={() =>
                      setImages((v) => {
                        const copy = [...v];
                        [copy[index + 1], copy[index]] = [
                          copy[index]!,
                          copy[index + 1]!,
                        ];
                        return copy;
                      })
                    }
                  >
                    <ArrowDown size={16} />
                  </button>
                  <label className="admin-replace">
                    Replace
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={`Replace image ${index + 1}`}
                      onChange={(e) => {
                        void upload([...(e.target.files ?? [])], index);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-icon-button"
                    aria-label={`Remove image ${index + 1}`}
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!images.length && (
            <p className="admin-muted">
              No images yet. Upload the actual product photography.
            </p>
          )}
        </section>
        <section className="admin-panel">
          <div className="admin-section-title">
            <div>
              <h2>Variants</h2>
              <p>
                Each variant has its own SKU and available stock. Leave price
                blank to use the product price.
              </p>
            </div>
            <button
              type="button"
              className="admin-button admin-button-light"
              disabled={variants.length >= 50}
              onClick={() =>
                setVariants((v) => [
                  ...v,
                  {
                    key: `new-${++counter.current}`,
                    name: "",
                    sku: "",
                    price: "",
                    stockQuantity: 0,
                    active: true,
                    imageRef: null,
                  },
                ])
              }
            >
              <Plus size={16} />
              Add variant
            </button>
          </div>
          {variants.map((v, index) => (
            <fieldset className="admin-variant" key={v.key}>
              <legend>Variant {index + 1}</legend>
              <div className="admin-form-grid">
                <label>
                  Variant name
                  <input
                    required
                    maxLength={100}
                    value={v.name}
                    onChange={(e) => variant(index, { name: e.target.value })}
                  />
                </label>
                <label>
                  Variant SKU
                  <input
                    required
                    maxLength={80}
                    value={v.sku}
                    onChange={(e) => variant(index, { sku: e.target.value })}
                  />
                </label>
                <label>
                  Variant price (INR)
                  <input
                    inputMode="decimal"
                    value={v.price}
                    placeholder="Use product price"
                    onChange={(e) => variant(index, { price: e.target.value })}
                  />
                </label>
                <label>
                  Variant stock
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    required
                    value={v.stockQuantity}
                    onChange={(e) =>
                      variant(index, { stockQuantity: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Variant image
                  <select
                    value={v.imageRef ?? ""}
                    onChange={(e) =>
                      variant(index, { imageRef: e.target.value || null })
                    }
                  >
                    <option value="">Main product image</option>
                    {images.map((i, n) => (
                      <option key={key(i)} value={key(i)}>
                        Image {n + 1}: {i.alt}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="admin-actions">
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={v.active}
                      onChange={(e) =>
                        variant(index, { active: e.target.checked })
                      }
                    />
                    Variant active
                  </label>
                  <button
                    className="admin-button admin-button-light"
                    type="button"
                    onClick={() =>
                      setVariants((items) =>
                        items.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Remove variant
                  </button>
                </div>
              </div>
            </fieldset>
          ))}
          {!variants.length && (
            <p className="admin-muted">
              This product uses its main SKU and stock quantity.
            </p>
          )}
        </section>
      </fieldset>
      {uploading && (
        <p role="status" className="admin-notice">
          Uploading and validating image…
        </p>
      )}
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      <div className="admin-form-footer">
        <Link
          className="admin-button admin-button-light"
          href="/admin/products"
        >
          Back to products
        </Link>
        <button className="admin-button" disabled={busy || uploading}>
          {busy ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
