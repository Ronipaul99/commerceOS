"use client";
import Link from "next/link";
import { Heart, Menu, Search, ArrowUpRight } from "lucide-react";
import { CartButton } from "./product-card";
import { useStorefront } from "./storefront-provider";
import { BrandIdentity } from "./brand-mark";
import { campaignCollections } from "@/lib/homepage-config";
function Wordmark() {
  return (
    <Link href="/" className="tj-wordmark" aria-label="Tiyas Jewel home">
      <BrandIdentity />
    </Link>
  );
}
function HeaderActions({ mobile = false }: { mobile?: boolean }) {
  const { setPanel, saved } = useStorefront();
  return (
    <div className="tj-header-actions">
      {mobile && (
        <button
          className="icon-button"
          onClick={() => setPanel("search")}
          aria-label="Open search"
        >
          <Search size={20} strokeWidth={1.5} />
        </button>
      )}
      <Link
        className="icon-button"
        href="/wishlist"
        aria-label={`Open wishlist, ${saved.length} saved items`}
      >
        <Heart size={21} strokeWidth={1.4} />
        {saved.length > 0 && <span className="count">{saved.length}</span>}
      </Link>
      <CartButton />
    </div>
  );
}
export function DesktopHeader() {
  const { setPanel, searchTerm, setSearchTerm } = useStorefront();
  return (
    <div className="tj-desktop-bar">
      <Wordmark />
      <form
        className="tj-search-launch"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setPanel("search");
        }}
      >
        <Search size={19} aria-hidden="true" />
        <label className="sr-only" htmlFor="header-jewellery-search">
          Search jewellery
        </label>
        <input
          id="header-jewellery-search"
          type="search"
          name="q"
          autoComplete="off"
          maxLength={80}
          placeholder="Search for Kundan, earrings, necklaces..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <button
          type="submit"
          className="icon-button"
          aria-label="Open search"
          aria-haspopup="dialog"
        >
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </form>
      <HeaderActions />
    </div>
  );
}
export function MobileHeader() {
  const { setPanel } = useStorefront();
  return (
    <div className="tj-mobile-bar">
      <button
        className="icon-button"
        onClick={() => setPanel("menu")}
        aria-label="Open menu"
      >
        <Menu size={21} />
      </button>
      <Wordmark />
      <HeaderActions mobile />
    </div>
  );
}
export function Header() {
  return (
    <header className="site-header festival-header">
      <DesktopHeader />
      <MobileHeader />
      <nav className="tj-collection-nav" aria-label="Jewellery collections">
        {campaignCollections.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`}>
            {c.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
