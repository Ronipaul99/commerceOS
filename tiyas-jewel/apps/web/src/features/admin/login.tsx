"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLoginSchema, adminSessionSchema } from "@tiyas/shared";
import { adminRequest } from "@/lib/admin-client";
export function AdminLogin() {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main id="main-content" className="admin-login" tabIndex={-1}>
      <div className="admin-login-panel">
        <Link href="/" aria-label="Tiyas Jewel home">
          <Image
            src="/logo/tiyas-jewels-logo-web-optimized.webp"
            alt="Tiyas Jewels"
            width={260}
            height={87}
          />
        </Link>
        <p className="admin-eyebrow">STORE OWNER ACCESS</p>
        <h1>Welcome back.</h1>
        <p>Sign in to manage your products and orders.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const data = new FormData(e.currentTarget);
            const input = adminLoginSchema.safeParse({
              email: data.get("email"),
              password: data.get("password"),
            });
            if (!input.success) {
              setError("Enter a valid email and password.");
              return;
            }
            setBusy(true);
            try {
              await adminRequest("/login", adminSessionSchema, {
                method: "POST",
                body: input.data,
              });
              router.replace("/admin");
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Sign in failed. Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <button className="admin-button" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <Link className="admin-link" href="/">
          Return to storefront
        </Link>
      </div>
      <aside className="admin-login-note">
        <span>THE TIYAS DESK</span>
        <h2>
          A considered collection.
          <br />A clear overview.
        </h2>
        <p>Products, orders and the details that matter.</p>
      </aside>
    </main>
  );
}
