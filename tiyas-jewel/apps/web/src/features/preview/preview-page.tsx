import { notFound } from "next/navigation";
import { journal, storefrontConfig } from "@/lib/storefront-config";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { EditorialTextLink } from "@/components/ui/actions";
const info: Record<string, { title: string; text: string }> = {
  "our-story": {
    title: "More than jewellery.",
    text: "Tiyas is a modern jewellery house inspired by individuality. We believe in considered forms, personal expression and pieces that find a place in your everyday. Our full story is taking shape.",
  },
  contact: {
    title: "A little closer to you.",
    text:
      storefrontConfig.contact ??
      "Our client care contact details will be shared before the store opens. Thank you for being part of our first chapter.",
  },
  "shipping-returns": {
    title: "The details, considered.",
    text: `${storefrontConfig.shipping.detail} ${storefrontConfig.returns.detail} Complete shipping and return policies will be published before shopping opens.`,
  },
  privacy: {
    title: "Your privacy matters.",
    text: "This design preview does not submit newsletter details or create customer accounts. The store's complete privacy policy will be published before launch.",
  },
  terms: {
    title: "A considered beginning.",
    text: "This is a storefront design preview. Orders and payments are not available. Complete terms of sale will be published before the store opens.",
  },
  social: {
    title: "Follow our story.",
    text: "Our official social channels will be listed here once confirmed. Until then, explore the journal for a little inspiration.",
  },
};
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ preview: string[] }>;
}) {
  const { preview } = await params;
  const [kind, slug = ""] = preview;
  if (preview.length > 2) notFound();
  if (kind === "journal") {
    const article = journal.find((item) => item.slug === slug);
    if (!article) notFound();
    return (
      <article className="shell preview-page preview-destination">
        <div>
          <p className="eyebrow">The Journal / {article.category}</p>
          <h1>{article.title}</h1>
          <p className="article-copy">{article.body}</p>
          <EditorialTextLink href="/">
            Back to Tiyas
          </EditorialTextLink>
        </div>
        <div className="destination-image">
          <ResponsiveImage
            src={article.image}
            alt={article.title}
            sizes="(max-width: 599px) 90vw, 45vw"
          />
        </div>
      </article>
    );
  }
  if (kind === "info") {
    const item = info[slug];
    if (!item) notFound();
    return (
      <div className="shell preview-page">
        <p className="eyebrow">Tiyas Jewel</p>
        <h1>{item.title}</h1>
        <p className="article-copy">{item.text}</p>
        <EditorialTextLink href="/">Return home</EditorialTextLink>
      </div>
    );
  }
  notFound();
}
