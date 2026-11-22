"use client";
import Image, { getImageProps } from "next/image";
import { createContext, useContext } from "react";
import type { PublicMediaManifest } from "@tiyas/shared";

const MediaContext = createContext<Record<string, PublicMediaManifest>>({});
export const PublicMediaProvider = MediaContext.Provider;

function sourceProps(media: PublicMediaManifest, sizes: string) {
  const fallback = media.find((item) => item.width >= 640) ?? media.at(-1)!;
  return {
    src: fallback.src,
    srcSet: media.map((item) => `${item.src} ${item.width}w`).join(", "),
    width: fallback.width,
    height: fallback.height,
    sizes,
  };
}
export function useMediaManifest() {
  return useContext(MediaContext);
}
const uploadedLoader = ({ src, width }: { src: string; width: number }) =>
  `${src}?width=${width}`;
/** Warm only the next campaign shortly before rotation, at the current viewport size. */
export function warmCampaignImage(
  desktop: string,
  mobile: string,
  manifest: Record<string, PublicMediaManifest>,
) {
  const src = matchMedia("(max-width: 767px)").matches ? mobile : desktop;
  const media = manifest[src];
  const props = media
    ? sourceProps(media, "100vw")
    : getImageProps({
        src,
        alt: "",
        width: 2400,
        height: 800,
        sizes: "100vw",
        loader: src.startsWith("/images/uploads/") ? uploadedLoader : undefined,
      }).props;
  const image = new window.Image();
  image.fetchPriority = "low";
  image.sizes = "100vw";
  if (props.srcSet) image.srcset = props.srcSet;
  image.src = props.src;
}
export function ResponsiveImage({
  src,
  alt,
  sizes = "100vw",
  className = "",
  preload = false,
  position,
  publicMedia,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  preload?: boolean;
  position?: string;
  publicMedia?: PublicMediaManifest;
}) {
  const context = useMediaManifest();
  const media = publicMedia ?? context[src];
  if (media) {
    const props = sourceProps(media, sizes);
    return (
      // Already optimized, explicit content-hashed WebP representations.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...props}
        className={`responsive-image ${className}`}
        alt={alt}
        loading={preload ? "eager" : "lazy"}
        fetchPriority={preload ? "high" : "auto"}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectPosition: position,
        }}
      />
    );
  }
  return (
    <Image
      className={`responsive-image ${className}`}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      loader={src.startsWith("/images/uploads/") ? uploadedLoader : undefined}
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
  const manifest = useMediaManifest();
  const desktopMedia = manifest[desktop];
  const mobileMedia = manifest[mobile];
  const desktopProps = desktopMedia
    ? {
        ...sourceProps(desktopMedia, "100vw"),
        loading: priority ? ("eager" as const) : ("lazy" as const),
        fetchPriority: priority ? ("high" as const) : ("auto" as const),
      }
    : getImageProps({
        src: desktop,
        loader: desktop.startsWith("/images/uploads/")
          ? uploadedLoader
          : undefined,
        alt,
        width: 2400,
        height: 800,
        sizes: "100vw",
        loading: priority ? "eager" : "lazy",
        fetchPriority: priority ? "high" : "auto",
      }).props;
  const mobileProps = mobileMedia
    ? sourceProps(mobileMedia, "100vw")
    : getImageProps({
        src: mobile,
        loader: mobile.startsWith("/images/uploads/")
          ? uploadedLoader
          : undefined,
        alt,
        width: 900,
        height: 1125,
        sizes: "100vw",
      }).props;
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
