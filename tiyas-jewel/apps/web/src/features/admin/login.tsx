"use client";
import { AdminLink as Link } from "@/features/admin/activity";
import { useState } from "react";
import { useAdminRouter as useRouter } from "@/features/admin/activity";
import {
  Mail,
  LockKeyhole,
  Monitor,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  MailCheck,
} from "lucide-react";
import {
  adminLoginSchema,
  adminSessionSchema,
  otpRequestSchema,
  otpCompleteSchema,
} from "@tiyas/shared";
import { adminRequest, adminOkSchema } from "@/lib/admin-client";
import { AdminBrand } from "./brand";
import { AdminSpinner } from "./loading-ui";
export function AdminLogin({
  recovery = false,
  invitation = false,
}: {
  recovery?: boolean;
  invitation?: boolean;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [visible, setVisible] = useState(false),
    [sent, setSent] = useState(false),
    [complete, setComplete] = useState(false),
    [email, setEmail] = useState("");
  const purpose = invitation ? "INVITE" : "RESET";
  return (
    <main
      id="main-content"
      className={`admin-auth ${recovery ? "admin-auth-recovery" : ""}`}
      tabIndex={-1}
    >
      <aside className="admin-auth-art" aria-label="Tiyas Jewel admin console">
        <Link href="/" aria-label="Tiyas Jewel home">
          <AdminBrand />
        </Link>
        <p className="admin-auth-console">Admin Console</p>
        <p>
          Manage your products, orders
          <br />
          and website content.
        </p>
        <div className="admin-auth-photography" aria-hidden="true" />
      </aside>
      <div className="admin-auth-main">
        <section className="admin-auth-card">
          <header>
            <span className="admin-auth-icon">
              {recovery ? <MailCheck /> : <Monitor />}
            </span>
            <div>
              <h1>
                {complete
                  ? "Password updated"
                  : invitation
                    ? "Accept Invitation"
                    : recovery
                      ? "Forgot Password?"
                      : "Admin Login"}
              </h1>
              <p>
                {complete
                  ? "You can now sign in securely."
                  : recovery
                    ? sent
                      ? "Enter your six-digit email code and choose a password."
                      : "Enter your registered email address to receive a password reset code."
                    : "Access your Tiyas Jewel back office"}
              </p>
            </div>
          </header>
          {!complete && (
            <form
              aria-busy={busy}
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const form = new FormData(e.currentTarget);
                try {
                  if (!recovery) {
                    const input = adminLoginSchema.parse({
                      email: form.get("email"),
                      password: form.get("password"),
                    });
                    const result = await adminRequest(
                      "/login",
                      adminSessionSchema,
                      { method: "POST", body: input },
                    );
                    router.replace(
                      result.data.role === "CONTENT_MANAGER"
                        ? "/admin/content"
                        : "/admin",
                    );
                    router.refresh();
                  } else if (!sent) {
                    const body = otpRequestSchema.parse({ email, purpose });
                    await adminRequest("/access/request", adminOkSchema, {
                      method: "POST",
                      body,
                    });
                    setSent(true);
                  } else {
                    const body = otpCompleteSchema.parse({
                      email,
                      purpose,
                      code: form.get("code"),
                      password: form.get("password"),
                    });
                    await adminRequest("/access/complete", adminOkSchema, {
                      method: "POST",
                      body,
                    });
                    setComplete(true);
                  }
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Please try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Email Address
                <span className="admin-input-icon">
                  <Mail size={23} />
                  <input
                    name="email"
                    aria-label="Email address"
                    type="email"
                    autoComplete="username"
                    required
                    maxLength={254}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={sent}
                  />
                </span>
              </label>
              {(!recovery || sent) && (
                <>
                  {sent && (
                    <label>
                      Email verification code
                      <input
                        name="code"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        minLength={6}
                        maxLength={6}
                        autoComplete="one-time-code"
                        placeholder="Six-digit code"
                        required
                      />
                    </label>
                  )}
                  <label>
                    {recovery ? "New password" : "Password"}
                    <span className="admin-input-icon">
                      <LockKeyhole size={23} />
                      <input
                        name="password"
                        type={visible ? "text" : "password"}
                        autoComplete={
                          recovery ? "new-password" : "current-password"
                        }
                        required
                        minLength={recovery ? 14 : 1}
                        maxLength={128}
                        placeholder={
                          recovery
                            ? "At least 14 characters"
                            : "Enter your password"
                        }
                      />
                      <button
                        type="button"
                        aria-label={visible ? "Hide password" : "Show password"}
                        onClick={() => setVisible((v) => !v)}
                      >
                        {visible ? <Eye size={22} /> : <EyeOff size={22} />}
                      </button>
                    </span>
                  </label>
                </>
              )}
              {!recovery && (
                <Link
                  className="admin-forgot-link"
                  href="/admin/forgot-password"
                >
                  Forgot password?
                </Link>
              )}
              {sent && (
                <p className="admin-notice" role="status">
                  If this address is eligible, a code has been sent. Codes
                  expire after 10 minutes.
                </p>
              )}
              {error && (
                <p role="alert" className="admin-error">
                  {error}
                </p>
              )}
              <button className="admin-button" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : recovery
                    ? sent
                      ? "Verify & save password"
                      : "Send Email OTP"
                    : "Sign in"}
                {busy ? <AdminSpinner /> : <ArrowRight size={22} />}
              </button>
              {sent && (
                <button
                  type="button"
                  className="admin-link admin-resend"
                  disabled={busy}
                  onClick={() => {
                    setSent(false);
                    setError("");
                  }}
                >
                  Request another code
                </button>
              )}
            </form>
          )}
          <Link
            className="admin-auth-back"
            href={recovery ? "/admin/login" : "/"}
          >
            <ArrowLeft size={18} />
            {recovery ? "Back to Login" : "Return to storefront"}
          </Link>
        </section>
      </div>
    </main>
  );
}
