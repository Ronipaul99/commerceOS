"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { AdminLink as Link } from "@/features/admin/activity";
import { usePathname } from "next/navigation";
import { useAdminRouter as useRouter, AdminFilterForm } from "./activity";
import {
  House,
  Package,
  ShoppingBag,
  LogOut,
  ArrowUpRight,
  FileText,
  Users,
  Search,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import type { AdminSession } from "@tiyas/shared";
import { adminRequest, adminOkSchema, AdminApiError } from "@/lib/admin-client";
import type { z } from "zod";
import { AdminBrand } from "./brand";
const SessionContext = createContext<AdminSession | null>(null);
export function useAdmin() {
  const session = useContext(SessionContext);
  const router = useRouter();
  if (!session) throw Error("Admin session is missing");
  return {
    session,
    async request<T>(
      path: string,
      schema: z.ZodType<T>,
      options: { method?: string; body?: unknown; file?: File } = {},
    ) {
      try {
        return await adminRequest(path, schema, {
          ...options,
          csrf: session.csrfToken,
        });
      } catch (error) {
        if (error instanceof AdminApiError && error.status === 401) {
          router.replace("/admin/login");
          router.refresh();
        }
        throw error;
      }
    },
  };
}
export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  const path = usePathname(),
    router = useRouter();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cmsExpanded, setCmsExpanded] = useState(
    path.startsWith("/admin/content"),
  );
  const contentOnly = session.role === "CONTENT_MANAGER";
  const aside = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    aside.current?.querySelector<HTMLElement>("a,button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key === "Tab") {
        const links = [
          ...(aside.current?.querySelectorAll<HTMLElement>(
            "a,button:not([disabled])",
          ) ?? []),
        ].filter((e) => e.getClientRects().length);
        const first = links[0],
          last = links.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    const resize = () => {
      if (!window.matchMedia("(max-width:767px)").matches) setMenuOpen(false);
    };
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", resize);
      previous?.focus();
    };
  }, [menuOpen]);
  return (
    <SessionContext value={session}>
      <div className="admin-shell">
        <aside
          ref={aside}
          role={menuOpen ? "dialog" : undefined}
          aria-modal={menuOpen ? true : undefined}
          aria-label={menuOpen ? "Admin menu" : undefined}
          className="admin-sidebar"
          data-open={menuOpen}
          id="admin-navigation"
        >
          <Link
            className="admin-brand"
            href="/admin"
            aria-label="Tiyas admin dashboard"
          >
            <AdminBrand />
          </Link>
          <nav aria-label="Admin navigation" tabIndex={0}>
            {[
              ...(!contentOnly
                ? [
                    {
                      href: "/admin",
                      name: "Dashboard",
                      icon: House,
                    },
                    {
                      href: "/admin/orders",
                      name: "Orders",
                      icon: ShoppingBag,
                    },
                    {
                      href: "/admin/products",
                      name: "Products",
                      icon: Package,
                    },
                  ]
                : []),
              { href: "/admin/content", name: "Content (CMS)", icon: FileText },
              ...(session.role === "OWNER"
                ? [{ href: "/admin/users", name: "Admin Users", icon: Users }]
                : []),
            ].map((item) =>
              item.href === "/admin/content" ? (
                <div className="admin-cms-group" key={item.href}>
                  <button
                    type="button"
                    className="admin-cms-toggle"
                    data-active={path.startsWith(item.href)}
                    aria-expanded={cmsExpanded}
                    aria-controls="admin-cms-links"
                    onClick={() => setCmsExpanded((open) => !open)}
                  >
                    <FileText size={23} strokeWidth={1.6} aria-hidden="true" />
                    <span>Content (CMS)</span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </button>
                  <div
                    id="admin-cms-links"
                    className="admin-cms-subnav"
                    hidden={!cmsExpanded}
                  >
                    {[
                      ["Homepage", "homepage"],
                      ["Banners & Carousel", "banners"],
                      ["Static Pages", "pages"],
                      ["Menus & Links", "menus"],
                    ].map(([label, tab]) => (
                      <Link
                        key={tab}
                        href={`/admin/content?tab=${tab}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={
                    (
                      item.href === "/admin"
                        ? path === item.href
                        : path.startsWith(item.href)
                    )
                      ? "page"
                      : undefined
                  }
                >
                  <item.icon size={23} strokeWidth={1.6} aria-hidden="true" />
                  {item.name}
                </Link>
              ),
            )}
          </nav>
          <div className="admin-sidebar-bottom">
            <Link href="/" target="_blank" rel="noopener">
              View storefront <ArrowUpRight size={16} />
            </Link>
            <p>{session.email}</p>
            <button
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                setLogoutError("");
                try {
                  await adminRequest("/logout", adminOkSchema, {
                    method: "POST",
                    csrf: session.csrfToken,
                  });
                  router.replace("/admin/login");
                  router.refresh();
                } catch (error) {
                  if (error instanceof AdminApiError && error.status === 401) {
                    router.replace("/admin/login");
                    router.refresh();
                  } else setLogoutError("Sign out failed. Please try again.");
                } finally {
                  setLoggingOut(false);
                }
              }}
            >
              <LogOut size={16} />
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
            {logoutError && <span role="alert">{logoutError}</span>}
          </div>
        </aside>
        <div className="admin-workspace">
          <header className="admin-topbar">
            <button
              className="admin-icon-button admin-menu-toggle"
              aria-label={menuOpen ? "Close admin menu" : "Open admin menu"}
              aria-expanded={menuOpen}
              aria-controls="admin-navigation"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
            {!contentOnly && (
              <AdminFilterForm
                action="/admin/products"
                className="admin-top-search"
                role="search"
              >
                <Search size={21} aria-hidden="true" />
                <label className="sr-only" htmlFor="admin-global-search">
                  Search products
                </label>
                <input
                  id="admin-global-search"
                  name="q"
                  placeholder="Search products by name, SKU or category…"
                  maxLength={100}
                />
              </AdminFilterForm>
            )}
            <Link
              className="admin-button admin-button-light admin-view-store"
              href="/"
              target="_blank"
              rel="noopener"
            >
              <ArrowUpRight size={18} />
              View Website
            </Link>
            <div className="admin-top-account">
              <span className="admin-avatar">
                {(session.name || session.email).slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{session.name || "Admin"}</strong>
                <small>
                  {session.role === "OWNER"
                    ? "Store Owner"
                    : session.role === "CONTENT_MANAGER"
                      ? "Content Manager"
                      : "Administrator"}
                </small>
              </div>
              <ChevronDown size={17} aria-hidden="true" />
            </div>
          </header>
          {menuOpen && (
            <button
              className="admin-menu-backdrop"
              aria-label="Close admin menu"
              onClick={() => setMenuOpen(false)}
            />
          )}
          <main id="main-content" className="admin-main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </SessionContext>
  );
}
