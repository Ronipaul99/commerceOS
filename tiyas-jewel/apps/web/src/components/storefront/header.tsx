"use client";
import Link from "next/link";
import { Heart, Menu, Search } from "lucide-react";
import { CartButton } from "./product-card";
import { useStorefront } from "./storefront-provider";
function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="Tiyas Jewel home">
      TIYAS JEWEL<span>The art of adornment</span>
    </Link>
  );
}
function HeaderActions({ mobile = false }: { mobile?: boolean }) {
  const { setPanel, saved } = useStorefront();
  return (
    <div className="header-actions">
      <button
        className="icon-button"
        onClick={() => setPanel("search")}
        aria-label="Open search"
      >
        <Search size={20} strokeWidth={1.3} />
      </button>
      {!mobile ? (
        <Link
          className="icon-button"
          href="/wishlist"
          aria-label={`Open wishlist, ${saved.length} saved items`}
        >
          <Heart size={20} strokeWidth={1.3} />
          {saved.length ? <span className="count">{saved.length}</span> : null}
        </Link>
      ) : null}
      <CartButton />
    </div>
  );
}
export function DesktopHeader() {
  return (
    <div className="desktop-header shell">
      <nav aria-label="Main navigation">
        <Link href="/shop">Shop</Link>
        <Link href="/collections/everyday-edit">Collections</Link>
        <Link href="/#journal">The Journal</Link>
      </nav>
      <Wordmark />
      <HeaderActions />
    </div>
  );
}
export function MobileHeader() {
  const { setPanel } = useStorefront();
  return (
    <div className="mobile-header">
      <button
        className="icon-button"
        onClick={() => setPanel("menu")}
        aria-label="Open menu"
      >
        <Menu size={22} strokeWidth={1.3} />
      </button>
      <Wordmark />
      <HeaderActions mobile />
    </div>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <DesktopHeader />
      <MobileHeader />
    </header>
  );
}
