import { ResponsiveImage } from "@/components/ui/responsive-image";
import { SecondaryButton } from "@/components/ui/actions";
export function EditorialBanner({
  image,
  alt,
  eyebrow,
  heading,
  description,
  href,
  cta,
}: {
  image: string;
  alt: string;
  eyebrow: string;
  heading: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="editorial-banner">
      <ResponsiveImage src={image} alt={alt} sizes="100vw" />
      <div className="shell banner-content">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{heading}</h2>
        <p>{description}</p>
        <SecondaryButton href={href}>{cta}</SecondaryButton>
      </div>
    </section>
  );
}
