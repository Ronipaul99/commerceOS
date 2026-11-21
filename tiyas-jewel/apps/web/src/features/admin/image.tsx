"use client";
import { useState } from "react";
import Image, { type ImageProps } from "next/image";
function ImageState({ onLoad, onError, ...props }: ImageProps) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return (
    <Image
      {...props}
      src={state === "error" ? "/images/catalog-placeholder.svg" : props.src}
      alt={state === "error" ? "Image unavailable" : props.alt}
      loading={props.loading ?? "lazy"}
      data-image-state={state}
      className={`admin-lazy-image ${props.className ?? ""}`}
      onLoad={(e) => {
        setState((s) => (s === "error" ? s : "ready"));
        onLoad?.(e);
      }}
      onError={(e) => {
        setState("error");
        onError?.(e);
      }}
    />
  );
}
export function AdminImage(props: ImageProps) {
  return (
    <ImageState
      key={
        typeof props.src === "string" ? props.src : JSON.stringify(props.src)
      }
      {...props}
    />
  );
}
