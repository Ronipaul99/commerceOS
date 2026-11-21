"use client";
import { useState, useEffect } from "react";
import { AdminImage as Image } from "@/features/admin/image";
import { AdminLink as Link } from "@/features/admin/activity";
import { useAdminRouter as useRouter } from "@/features/admin/activity";
import { z } from "zod";
import {
  Home,
  ImageIcon,
  FileText,
  Link2,
  Plus,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Trash2,
  Upload,
  Eye,
  Rocket,
  ArrowUp,
  ArrowDown,
  Tag,
  Sparkles,
  Type,
  Grid2X2,
} from "lucide-react";
import {
  contentValueSchema,
  contentDocumentResponseSchema,
  contentSectionSchema,
  contentSectionKinds,
  adminAssetSchema,
  contentImagePaths,
  type ContentDocument,
  type ContentValue,
  type ContentSection,
  type ContentItem,
} from "@tiyas/shared";
import { defaultHomepage, defaultNavigation } from "@/lib/content-defaults";
import { useAdmin } from "./shell";
import { AdminConfirm } from "./confirm";
import { adminOkSchema } from "@/lib/admin-client";
import { ImagePromptHelper } from "./image-prompt-helper";
import { imagePromptProfile } from "@/lib/admin-image-prompt";
import { useAdminActivity } from "./activity";
const labels = {
  hero: "Hero Slider",
  categories: "Shop by Category",
  collections: "The Tiyas Collections",
  arrivals: "New Arrivals",
  campaign: "Campaign Banner",
  occasions: "Shop by Occasion",
  showcases: "Collection Showcases",
  promotion: "Promotional Banner",
  trust: "Why Shop at Tiyas",
  story: "The Tiyas Story",
  newsletter: "Newsletter",
};
const icons = {
  hero: Home,
  categories: Grid2X2,
  collections: Grid2X2,
  arrivals: Tag,
  campaign: ImageIcon,
  occasions: Sparkles,
  showcases: Grid2X2,
  promotion: ImageIcon,
  trust: Sparkles,
  story: Type,
  newsletter: FileText,
};
const descriptions = {
  hero: "Main homepage banner carousel",
  categories: "Category banners with images and links",
  collections: "Editorial jewellery collection cards",
  arrivals: "Product collection or listing",
  campaign: "Full-width collection campaign",
  occasions: "Occasion-based collections",
  showcases: "Collection banners and actual related products",
  promotion: "Mid-page offer or campaign banner",
  trust: "Approved service and shopping information",
  story: "About the brand, imagery and story link",
  newsletter: "Newsletter heading and introduction",
};
const uid = () => crypto.randomUUID();
type Summary = { key: string; title: string; publishedAt: string | null };
const basePage: ContentValue = {
  type: "page",
  content: { title: "", description: "", body: "", image: "", alt: "" },
};
export function ContentEditor({
  document,
  documents,
  tab,
  documentKey,
}: {
  document: ContentDocument | null;
  documents: Summary[];
  tab: string;
  documentKey: string;
}) {
  const { request } = useAdmin(),
    router = useRouter();
  const initial =
    document?.draft ??
    (tab === "menus"
      ? defaultNavigation()
      : tab === "pages"
        ? basePage
        : defaultHomepage());
  const [value, setValue] = useState<ContentValue>(initial),
    [version, setVersion] = useState(document?.version ?? 0),
    [isPublished, setPublished] = useState(!!document?.publishedAt),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [operation, setOperation] = useState<string | null>(null),
    [uploading, setUploading] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [sectionId, setSectionId] = useState(
      initial.type === "homepage"
        ? (initial.content.sections[0]?.id ?? "")
        : "",
    ),
    [itemId, setItemId] = useState<string | null>(
      initial.type === "homepage"
        ? (initial.content.sections[0]?.items[0]?.id ?? null)
        : null,
    ),
    [addSection, setAddSection] = useState(false),
    [newKind, setNewKind] = useState<ContentSection["kind"]>("campaign"),
    [pageSlug, setPageSlug] = useState(
      documentKey.startsWith("page-") && documentKey !== "page-new"
        ? documentKey.slice(5)
        : "",
    ),
    [deletePage, setDeletePage] = useState(false),
    [removeSection, setRemoveSection] = useState<string | null>(null);
  const sections = value.type === "homepage" ? value.content.sections : [];
  useAdminActivity(
    busy || uploading,
    uploading
      ? "Uploading and optimizing image…"
      : operation === "preview"
        ? "Preparing preview…"
        : operation === "publish"
          ? "Publishing content…"
          : operation === "unpublish"
            ? "Unpublishing content…"
            : "Saving draft…",
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function selectItem(id: string | null) {
    setItemId(id);
    if (window.matchMedia("(max-width:767px)").matches)
      requestAnimationFrame(() => {
        const panel = window.document.querySelector(".cms-edit-panel");
        if (panel)
          window.scrollTo({
            top: window.scrollY + panel.getBoundingClientRect().top - 88,
            behavior: window.matchMedia("(prefers-reduced-motion:reduce)")
              .matches
              ? "instant"
              : "smooth",
          });
      });
  }
  const current = sections.find((s) => s.id === sectionId) ?? sections[0];
  const selected = current?.items.find((i) => i.id === itemId);
  const target = selected ?? current;
  const update = (next: ContentValue) => {
    setValue(next);
    setDirty(true);
    setMessage("");
  };
  function changeSection(next: ContentSection) {
    if (value.type === "homepage")
      update({
        ...value,
        content: {
          sections: value.content.sections.map((s) =>
            s.id === next.id ? next : s,
          ),
        },
      });
  }
  function changeTarget(key: keyof ContentItem, text: string) {
    if (!current) return;
    if (selected)
      changeSection({
        ...current,
        items: current.items.map((i) =>
          i.id === selected.id
            ? { ...i, [key]: key === "collection" && !text ? undefined : text }
            : i,
        ),
      });
    else
      changeSection({
        ...current,
        [key]: key === "collection" && !text ? undefined : text,
      });
  }
  async function upload(file: File | undefined, mobile = false) {
    if (!file || busy || uploading) return;
    setUploading(true);
    setOperation("upload");
    setError("");
    try {
      const { data } = await request(
        "/images",
        z.object({ data: adminAssetSchema }),
        { method: "POST", file },
      );
      if (value.type === "page")
        update({
          ...value,
          content: {
            ...value.content,
            image: data.url,
            alt: value.content.alt || value.content.title || "Page image",
          },
        });
      else if (current) {
        if (selected)
          changeSection({
            ...current,
            items: current.items.map((i) =>
              i.id === selected.id
                ? {
                    ...i,
                    ...(mobile
                      ? { mobileImage: data.url }
                      : { image: data.url, mobileImage: "" }),
                    alt: i.alt || i.title || "Campaign image",
                  }
                : i,
            ),
          });
        else
          changeSection({
            ...current,
            ...(mobile
              ? { mobileImage: data.url }
              : { image: data.url, mobileImage: "" }),
            alt: current.alt || current.title || "Campaign image",
          });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      setOperation(null);
    }
  }
  const key = value.type === "page" ? `page-${pageSlug}` : documentKey;
  async function save(publish?: boolean, preview = false) {
    if (busy || uploading) return;
    setOperation(
      preview
        ? "preview"
        : publish === true
          ? "publish"
          : publish === false
            ? "unpublish"
            : "save",
    );
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (value.type === "page" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pageSlug))
        throw Error("Enter a page slug such as care-guide.");
      const parsed = contentValueSchema.parse(value);
      const result = await request(
        `/content/${key}${publish === undefined ? "" : "/publish"}`,
        contentDocumentResponseSchema,
        {
          method: publish === undefined ? "PUT" : "POST",
          body: {
            version,
            value: parsed,
            ...(publish === undefined ? {} : { published: publish }),
          },
        },
      );
      if (!result.data) throw Error("Content could not be saved.");
      setVersion(result.data.version);
      setPublished(!!result.data.publishedAt);
      setDirty(false);
      setMessage(
        publish === undefined
          ? "Draft saved. The live website is unchanged."
          : publish
            ? "Changes published. Your website is updated."
            : "Content unpublished. The default storefront content is restored.",
      );
      if (preview)
        router.push(
          `/admin-preview?key=${key}${value.type === "homepage" && current ? `&section=${encodeURIComponent(current.id)}` : ""}`,
        );
      else if (value.type === "page" && (!document || documentKey !== key))
        router.replace(`/admin/content?tab=pages&key=${key}`);
      else router.refresh();
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ")
          : e instanceof Error
            ? e.message
            : "Content could not be saved.",
      );
    } finally {
      setBusy(false);
      setOperation(null);
    }
  }
  function moveSection(index: number, delta: number) {
    if (value.type !== "homepage") return;
    const copy = [...sections],
      next = index + delta;
    if (next < 0 || next >= copy.length) return;
    [copy[index], copy[next]] = [copy[next]!, copy[index]!];
    update({ ...value, content: { sections: copy } });
  }
  function moveItem(index: number, delta: number) {
    if (!current) return;
    const copy = [...current.items],
      next = index + delta;
    if (next < 0 || next >= copy.length) return;
    [copy[index], copy[next]] = [copy[next]!, copy[index]!];
    changeSection({ ...current, items: copy });
  }
  return (
    <div className="admin-content-editor">
      <header className="admin-page-heading cms-heading">
        <div>
          <h1>Content Management</h1>
          <p>
            Create and manage website content, banners, sections and static
            pages.
          </p>
        </div>
      </header>
      <nav className="cms-tabs" aria-label="Content areas">
        {[
          { name: "Homepage", key: "homepage", Icon: Home },
          { name: "Banners & Carousel", key: "banners", Icon: ImageIcon },
          { name: "Static Pages", key: "pages", Icon: FileText },
          { name: "Menus & Links", key: "menus", Icon: Link2 },
        ].map(({ name, key, Icon }) => (
          <Link
            key={key}
            href={`/admin/content?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm("Leave without saving your changes?")
              )
                e.preventDefault();
            }}
          >
            <Icon size={23} />
            {name}
          </Link>
        ))}
      </nav>
      {message && (
        <p className="admin-notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {value.type === "homepage" && (
        <div className="cms-workspace">
          <section className="admin-panel cms-section-list">
            <header className="cms-panel-header">
              <h2>Homepage Sections</h2>
              <button
                className="admin-button admin-button-light"
                type="button"
                onClick={() => setAddSection((v) => !v)}
              >
                <Plus size={18} />
                Add Section
              </button>
            </header>
            {addSection && (
              <div className="cms-add-section">
                <label>
                  Section type
                  <select
                    value={newKind}
                    onChange={(e) =>
                      setNewKind(e.target.value as ContentSection["kind"])
                    }
                  >
                    {contentSectionKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {labels[kind]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="admin-button"
                  onClick={() => {
                    const s = contentSectionSchema.parse({
                      id: `section-${uid()}`,
                      kind: newKind,
                      title: labels[newKind],
                      enabled: false,
                    });
                    update({
                      ...value,
                      content: { sections: [...sections, s] },
                    });
                    setSectionId(s.id);
                    setItemId(null);
                    setAddSection(false);
                  }}
                >
                  Add section
                </button>
              </div>
            )}
            <div className="cms-sections">
              {sections.map((s, index) => {
                const Icon = icons[s.kind],
                  open = current?.id === s.id;
                return (
                  <article
                    className="cms-section"
                    key={s.id}
                    data-selected={open}
                  >
                    <button
                      type="button"
                      className="cms-section-heading"
                      aria-expanded={open}
                      onClick={() => {
                        setSectionId(s.id);
                        setItemId(s.items[0]?.id ?? null);
                      }}
                    >
                      <Icon size={24} />
                      <span>
                        <strong>{labels[s.kind]}</strong>
                        <small>{descriptions[s.kind]}</small>
                      </span>
                      <small>
                        {s.items.length
                          ? `${s.items.length} Items`
                          : s.kind === "arrivals"
                            ? "Auto (Latest)"
                            : s.enabled
                              ? "Visible"
                              : "Hidden"}
                      </small>
                      {open ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                    {open && (
                      <>
                        <div className="cms-section-controls">
                          <button
                            className="admin-icon-button"
                            aria-label="Move section up"
                            disabled={index === 0}
                            onClick={() => moveSection(index, -1)}
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            className="admin-icon-button"
                            aria-label="Move section down"
                            disabled={index === sections.length - 1}
                            onClick={() => moveSection(index, 1)}
                          >
                            <ArrowDown size={15} />
                          </button>
                          <button
                            className="admin-link"
                            onClick={() => setItemId(null)}
                          >
                            Edit section
                          </button>
                          <button
                            className="admin-icon-button"
                            disabled={sections.length <= 1}
                            aria-label="Remove section"
                            onClick={() => setRemoveSection(s.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                          <label className="admin-check">
                            <input
                              type="checkbox"
                              checked={s.enabled}
                              onChange={(e) =>
                                changeSection({
                                  ...s,
                                  enabled: e.target.checked,
                                })
                              }
                            />
                            Visible
                          </label>
                        </div>
                        {s.items.map((i, n) => (
                          <div
                            className="cms-banner-row"
                            key={i.id}
                            data-selected={selected?.id === i.id}
                          >
                            <span className="cms-reorder">
                              <button
                                className="admin-icon-button"
                                disabled={n === 0}
                                aria-label={`Move ${i.title || `item ${n + 1}`} up`}
                                onClick={() => moveItem(n, -1)}
                              >
                                <ArrowUp size={12} />
                              </button>
                              <GripVertical size={17} />
                              <button
                                className="admin-icon-button"
                                disabled={n === s.items.length - 1}
                                aria-label={`Move ${i.title || `item ${n + 1}`} down`}
                                onClick={() => moveItem(n, 1)}
                              >
                                <ArrowDown size={12} />
                              </button>
                            </span>
                            <button
                              className="cms-banner-select"
                              onClick={() => selectItem(i.id)}
                            >
                              {i.image ? (
                                <Image
                                  src={i.image}
                                  alt={i.alt}
                                  width={220}
                                  height={90}
                                  unoptimized
                                />
                              ) : (
                                <ImageIcon size={28} />
                              )}
                              <strong>
                                {s.kind === "hero"
                                  ? `Banner ${n + 1}`
                                  : i.title || `Item ${n + 1}`}
                              </strong>
                            </button>
                            <span
                              className={`admin-status ${i.enabled ? "admin-status-green" : "admin-status-muted"}`}
                            >
                              {i.enabled ? "Enabled" : "Hidden"}
                            </span>
                            <button
                              className="admin-icon-button"
                              aria-label={`Edit ${i.title || `item ${n + 1}`}`}
                              onClick={() => selectItem(i.id)}
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              className="admin-icon-button"
                              aria-label={`Remove ${i.title || `item ${n + 1}`}`}
                              onClick={() => {
                                changeSection({
                                  ...s,
                                  items: s.items.filter((x) => x.id !== i.id),
                                });
                                if (selected?.id === i.id) setItemId(null);
                              }}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        ))}
                        {![
                          "arrivals",
                          "newsletter",
                          "story",
                          "promotion",
                          "campaign",
                        ].includes(s.kind) && (
                          <button
                            className="cms-add-item admin-link"
                            disabled={s.items.length >= 24}
                            onClick={() => {
                              const i = contentSectionSchema.parse({
                                id: uid(),
                                kind: "campaign",
                                title: "New item",
                              });
                              const { kind, items, ...entry } = i;
                              void kind;
                              void items;
                              changeSection({
                                ...s,
                                items: [...s.items, entry],
                              });
                              setItemId(i.id);
                            }}
                          >
                            <Plus size={16} />
                            Add {s.kind === "hero" ? "banner" : "item"}
                          </button>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
          <section className="admin-panel cms-edit-panel">
            <header className="cms-panel-header">
              <h2>
                {selected
                  ? `Edit ${current?.kind === "hero" ? "Banner" : "Item"} (${labels[current!.kind]})`
                  : `Edit ${current ? labels[current.kind] : "Section"}`}
              </h2>
              <label className="admin-check">
                <input
                  role="switch"
                  aria-label="Show selected item"
                  type="checkbox"
                  checked={target?.enabled ?? false}
                  onChange={(e) => {
                    if (current) {
                      if (selected)
                        changeSection({
                          ...current,
                          items: current.items.map((i) =>
                            i.id === selected.id
                              ? { ...i, enabled: e.target.checked }
                              : i,
                          ),
                        });
                      else
                        changeSection({
                          ...current,
                          enabled: e.target.checked,
                        });
                    }
                  }}
                />
                Enabled
              </label>
            </header>
            {target && (
              <fieldset className="cms-fields" disabled={busy || uploading}>
                {!["arrivals", "trust", "newsletter"].includes(
                  current!.kind,
                ) && (
                  <>
                    <div className="cms-image-field">
                      <span>Banner Image</span>
                      <div className="cms-image-preview">
                        {target.image ? (
                          <Image
                            src={target.image}
                            alt={target.alt || "Banner preview"}
                            width={960}
                            height={360}
                            unoptimized
                          />
                        ) : (
                          <div className="cms-empty-image">
                            <ImageIcon size={40} />
                            <span>Choose a campaign image</span>
                          </div>
                        )}
                        <div className="cms-image-actions">
                          <label className="admin-button admin-button-light admin-upload">
                            <Upload size={17} />
                            {uploading ? "Uploading…" : "Change"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              aria-label="Upload banner image"
                              onChange={(e) => {
                                void upload(e.target.files?.[0]);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="admin-icon-button"
                            aria-label="Remove banner image"
                            onClick={() => changeTarget("image", "")}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <ImagePromptHelper
                      key={current!.kind}
                      placement={current!.kind}
                      name={target.title || current!.title}
                    />
                    <small>
                      Recommended: {imagePromptProfile(current!.kind).width} ×{" "}
                      {imagePromptProfile(current!.kind).height} · JPG, PNG,
                      WebP · Max 5 MB · Saved as compressed WebP
                    </small>
                  </>
                )}
                <div className="admin-form-grid">
                  {(
                    [
                      ["title", "Title"],
                      ["subtitle", "Subtitle"],
                      ["eyebrow", "Section Label"],
                      ["buttonText", "Button Text"],
                      ["href", "Button Link"],
                      ["collection", "Collection slug (products)"],
                    ] as const
                  )
                    .filter(
                      ([field]) =>
                        field !== "collection" ||
                        ["arrivals", "showcases"].includes(current!.kind),
                    )
                    .map(([field, label]) => (
                      <label key={field}>
                        {label}
                        <input
                          maxLength={300}
                          value={target[field] ?? ""}
                          onChange={(e) => changeTarget(field, e.target.value)}
                        />
                      </label>
                    ))}
                </div>
                <label>
                  Description
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={target.description}
                    onChange={(e) =>
                      changeTarget("description", e.target.value)
                    }
                  />
                </label>
                {!["arrivals", "trust", "newsletter"].includes(
                  current!.kind,
                ) && (
                  <>
                    <label>
                      Image description
                      <input
                        maxLength={300}
                        value={target.alt}
                        onChange={(e) => changeTarget("alt", e.target.value)}
                      />
                    </label>
                    <details>
                      <summary>Image sources & mobile composition</summary>
                      <label>
                        Image path
                        <input
                          value={target.image}
                          list="cms-image-sources"
                          onChange={(e) =>
                            changeTarget("image", e.target.value)
                          }
                          placeholder="/images/campaign/silver.webp"
                        />
                        <datalist id="cms-image-sources">
                          {contentImagePaths.map((path) => (
                            <option key={path} value={path} />
                          ))}
                        </datalist>
                      </label>
                      {current?.kind === "hero" && (
                        <>
                          <label>
                            Mobile image path
                            <input
                              value={target.mobileImage}
                              onChange={(e) =>
                                changeTarget("mobileImage", e.target.value)
                              }
                            />
                          </label>
                          <label className="admin-button admin-button-light admin-upload">
                            <Upload size={17} /> Upload mobile hero image
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              aria-label="Upload mobile hero image"
                              onChange={(e) => {
                                void upload(e.target.files?.[0], true);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <small>
                            900 × 1125 · 4:5. Choose “Mobile hero” in the image
                            prompt dialog.
                          </small>
                          {target.mobileImage && (
                            <Image
                              className="cms-mobile-image"
                              src={target.mobileImage}
                              alt={target.alt || "Mobile hero preview"}
                              width={180}
                              height={225}
                              unoptimized
                            />
                          )}
                        </>
                      )}
                    </details>
                  </>
                )}
              </fieldset>
            )}
            <SaveBar
              operation={operation}
              busy={busy || uploading}
              isPublished={isPublished}
              dirty={dirty}
              onSave={() => void save()}
              onPublish={() => void save(true)}
              onUnpublish={() => void save(false)}
              onPreview={() => void save(undefined, true)}
            />
          </section>
        </div>
      )}
      {value.type === "page" && (
        <div className="cms-workspace cms-pages">
          <section className="admin-panel">
            <header className="cms-panel-header">
              <h2>Static Pages</h2>
              <Link
                className="admin-button admin-button-light"
                href="/admin/content?tab=pages"
              >
                <Plus size={16} />
                New Page
              </Link>
            </header>
            <nav className="cms-pages-list" aria-label="Static pages">
              {documents
                .filter((d) => d.key.startsWith("page-"))
                .map((d) => (
                  <Link
                    key={d.key}
                    href={`/admin/content?tab=pages&key=${d.key}`}
                    aria-current={d.key === documentKey ? "page" : undefined}
                  >
                    <FileText size={20} />
                    <span>
                      {d.title}
                      <small>{d.publishedAt ? "Published" : "Draft"}</small>
                    </span>
                    <Pencil size={16} />
                  </Link>
                ))}
              {!documents.some((d) => d.key.startsWith("page-")) && (
                <p>
                  No custom pages yet. Create a page to replace an existing
                  information page or add a new one.
                </p>
              )}
            </nav>
          </section>
          <section className="admin-panel">
            <header className="cms-panel-header">
              <h2>{document ? "Edit Page" : "Create Page"}</h2>
              {document && (
                <button
                  className="admin-icon-button"
                  aria-label="Delete page"
                  onClick={() => setDeletePage(true)}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </header>
            <fieldset className="cms-fields" disabled={busy || uploading}>
              <label>
                Page title
                <input
                  value={value.content.title}
                  maxLength={160}
                  onChange={(e) =>
                    update({
                      ...value,
                      content: { ...value.content, title: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Page slug
                <input
                  disabled={!!document}
                  value={pageSlug}
                  maxLength={120}
                  placeholder="our-story"
                  onChange={(e) => setPageSlug(e.target.value)}
                />
                <small>Public address: /info/{pageSlug || "page-slug"}</small>
              </label>
              <label>
                SEO description
                <input
                  value={value.content.description}
                  maxLength={300}
                  onChange={(e) =>
                    update({
                      ...value,
                      content: {
                        ...value.content,
                        description: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <label>
                Page content
                <textarea
                  rows={14}
                  maxLength={20000}
                  value={value.content.body}
                  onChange={(e) =>
                    update({
                      ...value,
                      content: { ...value.content, body: e.target.value },
                    })
                  }
                />
                <small>
                  Separate paragraphs with a blank line. Text is rendered safely
                  without HTML.
                </small>
              </label>
              <label className="admin-button admin-button-light admin-upload">
                <Upload size={17} />
                Upload page image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Upload page image"
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </label>
              <ImagePromptHelper placement="page" name={value.content.title} />
              {value.content.image && (
                <>
                  <Image
                    className="cms-page-image"
                    src={value.content.image}
                    alt={value.content.alt}
                    width={700}
                    height={240}
                    unoptimized
                  />
                  <label>
                    Image description
                    <input
                      value={value.content.alt}
                      onChange={(e) =>
                        update({
                          ...value,
                          content: { ...value.content, alt: e.target.value },
                        })
                      }
                    />
                  </label>
                  <button
                    className="admin-link"
                    onClick={() =>
                      update({
                        ...value,
                        content: { ...value.content, image: "", alt: "" },
                      })
                    }
                  >
                    Remove page image
                  </button>
                </>
              )}
            </fieldset>
            <SaveBar
              operation={operation}
              busy={busy || uploading}
              isPublished={isPublished}
              dirty={dirty}
              onSave={() => void save()}
              onPublish={() => void save(true)}
              onUnpublish={() => void save(false)}
              onPreview={() => void save(undefined, true)}
            />
          </section>
        </div>
      )}
      {value.type === "navigation" && (
        <section className="admin-panel">
          <header className="cms-panel-header">
            <h2>Menus & Links</h2>
            <span className="admin-muted">Mobile navigation and footer</span>
          </header>
          <div className="cms-fields">
            <MenuLinks
              title="Mobile Menu"
              links={value.content.mobile}
              onChange={(links) =>
                update({
                  ...value,
                  content: { ...value.content, mobile: links },
                })
              }
            />
            {value.content.footer.map((group, index) => (
              <div className="cms-menu-group" key={index}>
                <label>
                  Footer group title
                  <input
                    value={group.title}
                    onChange={(e) =>
                      update({
                        ...value,
                        content: {
                          ...value.content,
                          footer: value.content.footer.map((g, n) =>
                            n === index ? { ...g, title: e.target.value } : g,
                          ),
                        },
                      })
                    }
                  />
                </label>
                <MenuLinks
                  title={group.title || "Footer links"}
                  links={group.links}
                  onChange={(links) =>
                    update({
                      ...value,
                      content: {
                        ...value.content,
                        footer: value.content.footer.map((g, n) =>
                          n === index ? { ...g, links } : g,
                        ),
                      },
                    })
                  }
                />
                <button
                  className="admin-link"
                  onClick={() =>
                    update({
                      ...value,
                      content: {
                        ...value.content,
                        footer: value.content.footer.filter(
                          (_, n) => n !== index,
                        ),
                      },
                    })
                  }
                >
                  Remove footer group
                </button>
              </div>
            ))}
            <button
              className="admin-button admin-button-light"
              disabled={value.content.footer.length >= 6}
              onClick={() =>
                update({
                  ...value,
                  content: {
                    ...value.content,
                    footer: [
                      ...value.content.footer,
                      { title: "New group", links: [] },
                    ],
                  },
                })
              }
            >
              <Plus size={16} />
              Add footer group
            </button>
          </div>
          <SaveBar
            operation={operation}
            busy={busy}
            isPublished={isPublished}
            dirty={dirty}
            onSave={() => void save()}
            onPublish={() => void save(true)}
            onUnpublish={() => void save(false)}
          />
        </section>
      )}
      <AdminConfirm
        open={!!removeSection}
        onClose={() => setRemoveSection(null)}
        title="Remove this section?"
        description="The section and its items will be removed from this draft. The live homepage changes only after publishing."
        label="Remove section"
        onConfirm={async () => {
          if (value.type === "homepage") {
            update({
              ...value,
              content: {
                sections: sections.filter((s) => s.id !== removeSection),
              },
            });
            setSectionId(
              sections.find((s) => s.id !== removeSection)?.id ?? "",
            );
            setItemId(null);
          }
        }}
      />
      <AdminConfirm
        open={deletePage}
        onClose={() => setDeletePage(false)}
        title="Delete this page?"
        description="The custom page and its drafts will be removed. Built-in information pages return to their default content."
        label="Delete page"
        onConfirm={async () => {
          await request(`/content/${key}`, adminOkSchema, {
            method: "DELETE",
            body: { version },
          });
          router.push("/admin/content?tab=pages");
          router.refresh();
        }}
      />
    </div>
  );
}
function SaveBar({
  operation,
  busy,
  isPublished,
  dirty,
  onSave,
  onPublish,
  onUnpublish,
  onPreview,
}: {
  operation: string | null;
  busy: boolean;
  isPublished: boolean;
  dirty: boolean;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onPreview?: () => void;
}) {
  return (
    <footer className="cms-save-bar" aria-busy={busy}>
      <span>
        {isPublished ? "Published" : "Draft"}
        {dirty ? " · Unsaved changes" : ""}
      </span>
      <div>
        {onPreview && (
          <button
            className="admin-button admin-button-light"
            disabled={busy}
            onClick={onPreview}
          >
            {operation !== "preview" && <Eye size={17} />}
            {operation === "preview" ? "Preparing preview…" : "Preview"}
          </button>
        )}
        {isPublished && (
          <button className="admin-link" disabled={busy} onClick={onUnpublish}>
            {operation === "unpublish" ? <>Unpublishing…</> : "Unpublish"}
          </button>
        )}
        <button
          className="admin-button admin-button-light"
          disabled={busy}
          onClick={onSave}
        >
          {operation === "save" ? <>Saving draft…</> : "Save as Draft"}
        </button>
        <button className="admin-button" disabled={busy} onClick={onPublish}>
          {operation !== "publish" && <Rocket size={18} />}
          {operation === "publish" ? "Publishing…" : "Publish Changes"}
        </button>
      </div>
    </footer>
  );
}
function MenuLinks({
  title,
  links,
  onChange,
}: {
  title: string;
  links: { label: string; href: string }[];
  onChange: (links: { label: string; href: string }[]) => void;
}) {
  return (
    <section className="cms-menu-links">
      <h3>{title}</h3>
      {links.map((link, index) => (
        <div key={index}>
          <label>
            <span className="sr-only">
              {title} label {index + 1}
            </span>
            <input
              value={link.label}
              maxLength={70}
              placeholder="Link label"
              onChange={(e) =>
                onChange(
                  links.map((l, n) =>
                    n === index ? { ...l, label: e.target.value } : l,
                  ),
                )
              }
            />
          </label>
          <label>
            <span className="sr-only">
              {title} URL {index + 1}
            </span>
            <input
              value={link.href}
              placeholder="/shop"
              onChange={(e) =>
                onChange(
                  links.map((l, n) =>
                    n === index ? { ...l, href: e.target.value } : l,
                  ),
                )
              }
            />
          </label>
          <button
            className="admin-icon-button"
            disabled={index === 0}
            aria-label={`Move ${title} link ${index + 1} up`}
            onClick={() => {
              const copy = [...links];
              [copy[index - 1], copy[index]] = [copy[index]!, copy[index - 1]!];
              onChange(copy);
            }}
          >
            <ArrowUp size={16} />
          </button>
          <button
            className="admin-icon-button"
            aria-label={`Remove ${title} link ${index + 1}`}
            onClick={() => onChange(links.filter((_, n) => n !== index))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        className="admin-link"
        disabled={links.length >= 15}
        onClick={() =>
          onChange([...links, { label: "New link", href: "/shop" }])
        }
      >
        <Plus size={16} />
        Add link
      </button>
    </section>
  );
}
