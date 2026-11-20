"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
const query = "(min-width: 600px)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: string[][];
}) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
  const navigation = (
    <nav aria-label={title}>
      {links.map(([label, href]) => (
        <Link key={href} href={href!}>
          {label}
        </Link>
      ))}
    </nav>
  );
  if (desktop)
    return (
      <div className="footer-group">
        <h3 className="footer-group-title">{title}</h3>
        {navigation}
      </div>
    );
  return (
    <details className="footer-group">
      <summary>
        {title}
        <span aria-hidden="true">+</span>
      </summary>
      {navigation}
    </details>
  );
}
