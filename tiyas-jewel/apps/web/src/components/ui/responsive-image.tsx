import Image from "next/image";
export function ResponsiveImage({
  src,
  alt,
  sizes = "100vw",
  className = "",
  preload = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      className={`responsive-image ${className}`}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
    />
  );
}
