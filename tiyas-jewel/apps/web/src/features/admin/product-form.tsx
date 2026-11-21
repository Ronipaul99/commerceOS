"use client";
import { useRef, useState } from "react";
import { AdminImage as Image } from "@/features/admin/image";
import { AdminLink as Link } from "@/features/admin/activity";
import { useAdminRouter as useRouter } from "@/features/admin/activity";
import { z } from "zod";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  UploadCloud,
  Tag,
  ImageIcon,
  Layers,
} from "lucide-react";
import {
  adminProductInputSchema,
  adminProductResponseSchema,
  adminAssetSchema,
  adminOptionsSchema,
  type AdminProduct,
  type ProductTransfer,
} from "@tiyas/shared";
import { adminOkSchema } from "@/lib/admin-client";
import { useAdmin } from "./shell";
import { ProductJsonTools } from "./product-json-tools";
import { ImagePromptHelper } from "./image-prompt-helper";
import { AdminSpinner } from "./loading-ui";
type Options = z.infer<typeof adminOptionsSchema>["data"];
type FormImage = {
  id?: string;
  assetId?: string;
  url: string;
  alt: string;
  fileName?: string;
};
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
  imageFileName?: string | null;
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
    subtitle: product?.details?.subtitle ?? "",
    material: product?.details?.material ?? "",
    weightGrams: product?.details?.weightGrams?.toString() ?? "",
    size: product?.details?.size ?? "",
  });
  const [colors, setColors] = useState(product?.details?.colors ?? []);
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
  const [saveIntent, setSaveIntent] = useState("save");
  const [imagePlan, setImagePlan] = useState<
    ProductTransfer["product"]["images"]
  >([]);
  const key = (i: FormImage) => i.id ?? i.assetId!;
  const fileName = (i: FormImage) => i.fileName ?? i.url.split("/").at(-1)!;
  const guide = {
    instructions: [
      "Fill product fields and import this file. Nothing is saved until you save the product.",
      "Prices are INR rupee strings, not paise. Use null for an absent compareAtPrice, variant price or weightGrams.",
      "Use category/collection slugs from the lists below. Arrays can be empty when not needed.",
      "Upload image bytes separately; fileName must match the uploaded filename exactly, including case. Image order follows this array. Existing uploads are kept.",
      "Variant imageFileName must match an entry in product.images, or be null. On edit, retain variant SKU to preserve its identity; use the form to rename an existing SKU.",
    ],
    categories: options.categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      active: c.active,
    })),
    collections: options.collections.map((c) => ({
      slug: c.slug,
      name: c.name,
      active: c.active,
    })),
    imageExample: {
      fileName: "front.webp",
      alt: "Describe the actual product and view",
    },
    variantExample: {
      name: "Variant name",
      sku: "REPLACE-WITH-UNIQUE-SKU",
      price: null,
      stockQuantity: 0,
      active: false,
      imageFileName: "front.webp",
    },
    colourExample: { name: "Confirmed colour name", hex: "#650F2A" },
  };
  const template = {
    format: "tiyas-product",
    version: 1,
    currency: "INR",
    _guide: guide,
    product: {
      name: "",
      slug: "",
      description: "",
      categorySlug:
        options.categories.find((c) => c.id === form.categoryId)?.slug ?? "",
      collectionSlugs: [],
      price: "",
      compareAtPrice: null,
      sku: "",
      stockQuantity: 0,
      active: false,
      featured: false,
      details: {
        subtitle: "",
        material: "",
        weightGrams: null,
        size: "",
        colors: [],
      },
      images: [],
      variants: [],
    },
  };
  function snapshot() {
    return {
      ...template,
      product: {
        ...template.product,
        name: form.name,
        slug: form.slug,
        description: form.description,
        collectionSlugs: options.collections
          .filter((c) => form.collectionIds.includes(c.id))
          .map((c) => c.slug),
        price: form.price,
        compareAtPrice: form.compare || null,
        sku: form.sku,
        stockQuantity: form.stockQuantity,
        active: form.active,
        featured: form.featured,
        details: {
          subtitle: form.subtitle,
          material: form.material,
          weightGrams: form.weightGrams ? Number(form.weightGrams) : null,
          size: form.size,
          colors,
        },
        images: [
          ...images.map((i) => ({ fileName: fileName(i), alt: i.alt })),
          ...imagePlan.filter(
            (p) => !images.some((i) => fileName(i) === p.fileName),
          ),
        ],
        variants: variants.map((v) => ({
          name: v.name,
          sku: v.sku,
          price: v.price || null,
          stockQuantity: v.stockQuantity,
          active: v.active,
          imageFileName: v.imageRef
            ? fileName(images.find((i) => key(i) === v.imageRef)!)
            : (v.imageFileName ?? null),
        })),
      },
    };
  }
  function importProduct(data: ProductTransfer) {
    const p = data.product,
      category = options.categories.find((c) => c.slug === p.categorySlug);
    if (!category)
      throw Error(
        `Unknown category: ${p.categorySlug}. Use a category slug from the downloaded template.`,
      );
    const collections = p.collectionSlugs.map((slug) => {
      const c = options.collections.find((c) => c.slug === slug);
      if (!c)
        throw Error(
          `Unknown collection: ${slug}. Use a collection slug from the template.`,
        );
      return c.id;
    });
    const nextVariants = p.variants.map((v) => {
      const existing = variants.find((old) => old.sku === v.sku);
      return {
        ...(existing ? { id: existing.id, version: existing.version } : {}),
        key: existing?.key ?? `import-${counter.current++}`,
        name: v.name,
        sku: v.sku,
        price: v.price ?? "",
        stockQuantity: v.stockQuantity,
        active: v.active,
        imageRef: v.imageFileName
          ? (() => {
              const image = images.find((i) => fileName(i) === v.imageFileName);
              return image ? key(image) : null;
            })()
          : null,
        imageFileName: v.imageFileName,
      };
    });
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description,
      categoryId: category.id,
      collectionIds: collections,
      price: p.price,
      compare: p.compareAtPrice ?? "",
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      active: p.active,
      featured: p.featured,
      subtitle: p.details?.subtitle ?? "",
      material: p.details?.material ?? "",
      weightGrams: p.details?.weightGrams?.toString() ?? "",
      size: p.details?.size ?? "",
    });
    setColors(p.details?.colors ?? []);
    setImagePlan(p.images);
    setImages((current) => {
      const listed = p.images.flatMap((plan) => {
        const image = current.find((i) => fileName(i) === plan.fileName);
        return image ? [{ ...image, alt: plan.alt }] : [];
      });
      return [
        ...listed,
        ...current.filter(
          (i) => !p.images.some((plan) => plan.fileName === fileName(i)),
        ),
      ];
    });
    setVariants(nextVariants);
    setError("");
  }
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
    if (busy || uploading) return;
    if (!files.length) return;
    if (new Set(files.map((file) => file.name)).size !== files.length) {
      setError("Choose image files with different filenames.");
      return;
    }
    if (images.length + (replace === undefined ? files.length : 0) > 12) {
      setError("A product can have up to 12 images.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        if (
          replace === undefined &&
          images.some((i) => fileName(i) === file.name)
        )
          throw Error(
            `An image named ${file.name} is already attached. Use Replace instead.`,
          );
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
          fileName: file.name,
          alt:
            imagePlan.find((p) => p.fileName === file.name)?.alt ??
            (form.name
              ? `${form.name} – product detail`
              : "Jewellery product detail"),
        };
        if (replace !== undefined) {
          const old = images[replace];
          if (old?.assetId) setRemoved((v) => [...v, old.assetId!]);
          if (old)
            setVariants((v) =>
              v.map((i) =>
                i.imageRef === key(old)
                  ? { ...i, imageRef: data.id, imageFileName: file.name }
                  : i,
              ),
            );
          setImages((v) =>
            v.map((i, index) => (index === replace ? image : i)),
          );
          if (old)
            setImagePlan((plans) =>
              plans.map((p) =>
                p.fileName === fileName(old)
                  ? { fileName: file.name, alt: image.alt }
                  : p,
              ),
            );
        } else {
          setImages((v) =>
            [...v, image].sort((a, b) => {
              const ai = imagePlan.findIndex((p) => p.fileName === fileName(a)),
                bi = imagePlan.findIndex((p) => p.fileName === fileName(b));
              return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi);
            }),
          );
          setVariants((v) =>
            v.map((i) =>
              i.imageFileName === file.name ? { ...i, imageRef: data.id } : i,
            ),
          );
        }
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
    setImagePlan((p) => p.filter((i) => i.fileName !== fileName(image)));
    setVariants((v) =>
      v.map((i) =>
        i.imageRef === key(image)
          ? { ...i, imageRef: null, imageFileName: null }
          : i,
      ),
    );
    setImages((v) => v.filter((_, i) => i !== index));
  }
  return (
    <>
      <ProductJsonTools
        template={template}
        snapshot={snapshot}
        disabled={busy || uploading}
        onImport={importProduct}
      />
      <form
        aria-busy={busy || uploading}
        className="admin-product-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            const pending = imagePlan.filter(
              (p) => !images.some((i) => fileName(i) === p.fileName),
            );
            if (pending.length)
              throw Error(
                `Upload the image files listed in your JSON before saving: ${pending.map((p) => p.fileName).join(", ")}.`,
              );
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
              active:
                (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                  "value",
                ) === "draft"
                  ? false
                  : form.active,
              featured: form.featured,
              details: {
                ...(form.subtitle.trim()
                  ? { subtitle: form.subtitle.trim() }
                  : {}),
                ...(form.material.trim()
                  ? { material: form.material.trim() }
                  : {}),
                ...(form.weightGrams
                  ? { weightGrams: Number(form.weightGrams) }
                  : {}),
                ...(form.size.trim() ? { size: form.size.trim() } : {}),
                colors,
              },
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
            setSaveIntent(
              (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                "value",
              ) === "draft"
                ? "draft"
                : "save",
            );
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
          <section className="admin-panel admin-product-details">
            <h2>
              <Tag size={24} />
              Product Details
            </h2>
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
            <div className="admin-product-price-fields">
              <h3>Pricing & Stock</h3>
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
              </div>
            </div>
          </section>
          <section className="admin-panel admin-product-facts">
            <h2>Card &amp; jewellery details</h2>
            <p className="admin-muted">
              Use confirmed specifications. Empty fields are hidden. Colours
              describe the product; purchasable options still use variants.
            </p>
            <div className="admin-form-grid">
              <label>
                Short subtitle
                <input
                  maxLength={160}
                  value={form.subtitle}
                  onChange={(e) => change("subtitle", e.target.value)}
                />
              </label>
              <label>
                Material
                <input
                  maxLength={100}
                  value={form.material}
                  onChange={(e) => change("material", e.target.value)}
                />
              </label>
              <label>
                Weight (grams)
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10000"
                  value={form.weightGrams}
                  onChange={(e) => change("weightGrams", e.target.value)}
                />
              </label>
              <label>
                Size / dimensions
                <input
                  maxLength={100}
                  value={form.size}
                  onChange={(e) => change("size", e.target.value)}
                />
              </label>
            </div>
            <div className="admin-section-title">
              <h3>Available colours</h3>
              <button
                type="button"
                className="admin-button admin-button-light"
                disabled={colors.length >= 12}
                onClick={() =>
                  setColors((v) => [...v, { name: "", hex: "#b08d57" }])
                }
              >
                Add colour
              </button>
            </div>
            {colors.map((color, index) => (
              <div className="admin-form-grid" key={index}>
                <label>
                  Colour name {index + 1}
                  <input
                    required
                    maxLength={40}
                    value={color.name}
                    onChange={(e) =>
                      setColors((v) =>
                        v.map((c, i) =>
                          i === index ? { ...c, name: e.target.value } : c,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Colour swatch {index + 1}
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) =>
                      setColors((v) =>
                        v.map((c, i) =>
                          i === index ? { ...c, hex: e.target.value } : c,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="admin-button admin-button-light"
                  aria-label={`Remove colour ${index + 1}`}
                  onClick={() =>
                    setColors((v) => v.filter((_, i) => i !== index))
                  }
                >
                  Remove colour
                </button>
              </div>
            ))}
          </section>
          <section className="admin-panel admin-product-publish">
            <h2>
              <Layers size={24} />
              Publish Settings
            </h2>
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
          </section>
          <section className="admin-panel admin-product-images">
            <div className="admin-section-title">
              <div>
                <h2>
                  <ImageIcon size={24} />
                  Product Images
                </h2>
                <p>
                  JPEG, PNG or WebP · up to 5 MB · 200–6000 px · maximum 12
                  images
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
            <ImagePromptHelper placement="product" name={form.name} />
            {imagePlan.some(
              (p) => !images.some((i) => fileName(i) === p.fileName),
            ) && (
              <div className="admin-notice">
                <p role="status">
                  Images to attach. Use these exact filenames to link
                  descriptions and variants automatically.
                </p>
                {imagePlan
                  .filter(
                    (p) => !images.some((i) => fileName(i) === p.fileName),
                  )
                  .map((plan) => (
                    <div className="admin-pending-image" key={plan.fileName}>
                      <span>{plan.fileName}</span>
                      <button
                        type="button"
                        className="admin-link"
                        aria-label={`Remove planned image ${plan.fileName}`}
                        onClick={() => {
                          setImagePlan((p) =>
                            p.filter((i) => i.fileName !== plan.fileName),
                          );
                          setVariants((v) =>
                            v.map((i) =>
                              i.imageFileName === plan.fileName
                                ? { ...i, imageFileName: null, imageRef: null }
                                : i,
                            ),
                          );
                        }}
                      >
                        Remove from import
                      </button>
                    </div>
                  ))}
              </div>
            )}
            <label
              className="admin-image-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void upload([...e.dataTransfer.files]);
              }}
            >
              <UploadCloud size={44} />
              <strong>Upload product images</strong>
              <span>
                Drag & drop files here, or click to <b>browse</b>
              </span>
              <small>JPG, PNG, WebP · Max 5 MB each</small>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                aria-label="Browse product images"
                onChange={(e) => {
                  void upload([...(e.target.files ?? [])]);
                  e.target.value = "";
                }}
              />
            </label>
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
                  <small className="admin-image-filename">
                    {fileName(image)}
                  </small>
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
          <section className="admin-panel admin-product-variants">
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
                      onChange={(e) =>
                        variant(index, { price: e.target.value })
                      }
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
                        variant(index, {
                          stockQuantity: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Variant image
                    <select
                      value={v.imageRef ?? ""}
                      onChange={(e) =>
                        variant(index, {
                          imageRef: e.target.value || null,
                          imageFileName: null,
                        })
                      }
                    >
                      <option value="">Main product image</option>
                      {images.map((i, n) => (
                        <option key={key(i)} value={key(i)}>
                          Image {n + 1}: {i.alt}
                        </option>
                      ))}
                    </select>
                    {!v.imageRef && v.imageFileName && (
                      <small>Waiting for {v.imageFileName}</small>
                    )}
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
            <AdminSpinner /> Uploading and validating image…
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
          <button
            className="admin-button admin-button-light"
            name="intent"
            value="draft"
            disabled={busy || uploading}
          >
            {busy && saveIntent === "draft" ? (
              <>
                <AdminSpinner />
                Saving draft…
              </>
            ) : (
              "Save as Draft"
            )}
          </button>
          <button className="admin-button" disabled={busy || uploading}>
            {busy && saveIntent === "save" ? (
              <>
                <AdminSpinner />
                Saving…
              </>
            ) : product ? (
              "Save changes"
            ) : (
              "Create product"
            )}
          </button>
        </div>
      </form>
    </>
  );
}
