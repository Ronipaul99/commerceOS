import Image from "next/image";
export function LotusMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M32 41C15 34 17 16 32 5c15 11 17 29 0 36Z" />
      <path d="M32 41C14 40 5 27 9 13c15 2 24 10 23 28ZM32 41c18-1 27-14 23-28-15 2-24 10-23 28Z" />
      <path d="M32 41C17 47 3 36 2 24c13-2 25 4 30 17Zm0 0c15 6 29-5 30-17-13-2-25 4-30 17Z" />
      <path d="M21 42h22M24 46h16" />
    </svg>
  );
}
export function BrandIdentity({ priority = false }: { priority?: boolean }) {
  return (
    <span className="tj-brand-identity tj-brand-image">
      <Image
        className="tj-brand-logo"
        src="/logo/tiyas-jewels-logo-web-optimized.webp"
        alt="Tiyas Jewels - Timeless Elegance, Made for You"
        width={1200}
        height={400}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        sizes="(max-width: 767px) 170px, (max-width: 1023px) 210px, 280px"
      />
    </span>
  );
}
