import Image, { getImageProps } from "next/image";
export function ResponsiveImage({
  src,
  alt,
  sizes = "100vw",
  className = "",
  preload = false,
  position,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  preload?: boolean;
  position?: string;
}) {
  return (
    <Image
      className={`responsive-image ${className}`}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      unoptimized={src.startsWith("/images/uploads/")}
      style={position ? { objectPosition: position } : undefined}
    />
  );
}

export function ArtDirectedImage({
  desktop,
  mobile,
  alt,
  priority = false,
}: {
  desktop: string;
  mobile: string;
  alt: string;
  priority?: boolean;
}) {
  const { props: desktopProps } = getImageProps({
    src: desktop,
    unoptimized: desktop.startsWith("/images/uploads/"),
    alt,
    width: 2400,
    height: 800,
    sizes: "100vw",
    loading: priority ? "eager" : "lazy",
    fetchPriority: priority ? "high" : "auto",
  });
  const { props: mobileProps } = getImageProps({
    src: mobile,
    unoptimized: mobile.startsWith("/images/uploads/"),
    alt,
    width: 900,
    height: 1125,
    sizes: "100vw",
  });
  return (
    <picture>
      <source
        media="(max-width: 767px)"
        srcSet={mobileProps.srcSet ?? mobileProps.src}
        sizes="100vw"
      />
      {/* getImageProps provides Next.js optimized URLs for this art-directed picture. */}
      <img {...desktopProps} alt={alt} className="tj-art-directed" />
    </picture>
  );
}
