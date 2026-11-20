"use client";
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import type { AdminSession } from "@tiyas/shared";
import { adminRequest, adminOkSchema, AdminApiError } from "@/lib/admin-client";
import type { z } from "zod";
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
  return (
    <SessionContext value={session}>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <Link
            className="admin-brand"
            href="/admin"
            aria-label="Tiyas admin dashboard"
          >
            <Image
              src="/logo/tiyas-jewels-logo-web-optimized.webp"
              width={210}
              height={70}
              alt="Tiyas Jewels"
            />
          </Link>
          <p className="admin-sidebar-label">STORE ADMINISTRATION</p>
          <nav aria-label="Admin navigation">
            {[
              { href: "/admin", name: "Overview", icon: LayoutDashboard },
              { href: "/admin/products", name: "Products", icon: Package },
              { href: "/admin/orders", name: "Orders", icon: ShoppingBag },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
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
                <item.icon size={18} />
                {item.name}
              </Link>
            ))}
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
        <main id="main-content" className="admin-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </SessionContext>
  );
}
