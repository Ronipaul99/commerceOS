"use client";
import { useState } from "react";
import { AdminLink as Link } from "@/features/admin/activity";
import { useAdminRouter as useRouter } from "@/features/admin/activity";
import { z } from "zod";
import { Check, X, Mail, UserPlus, Pencil } from "lucide-react";
import {
  adminUserInputSchema,
  adminUserResponseSchema,
  adminUserSchema,
} from "@tiyas/shared";
import { adminOkSchema } from "@/lib/admin-client";
import { useAdmin } from "./shell";
import { AdminHeading } from "./common";
import { useAdminActivity } from "./activity";
type User = z.infer<typeof adminUserSchema>;
export function AdminUsers({
  users,
  create = false,
}: {
  users: User[];
  create?: boolean;
}) {
  const { request } = useAdmin(),
    router = useRouter();
  const [role, setRole] = useState<"CONTENT_MANAGER" | "ADMIN">(
      "CONTENT_MANAGER",
    ),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  useAdminActivity(busy, "Updating admin access…");
  async function mutate(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AdminHeading
        title={create ? "Create New User" : "Admin Users"}
        description={
          create
            ? "Give a team member secure access to the Tiyas Jewel admin panel."
            : "Manage access to your products, orders and website content."
        }
        action={
          !create ? (
            <Link className="admin-button" href="/admin/users/new">
              <UserPlus size={18} />
              Create New User
            </Link>
          ) : undefined
        }
      />
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {busy && (
        <p className="admin-notice" role="status">
          Updating admin access…
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {create ? (
        <div className="admin-user-create-grid">
          <section className="admin-panel">
            <h2>User Details</h2>
            <form
              aria-busy={busy}
              className="admin-user-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void mutate(async () => {
                  const input = adminUserInputSchema.parse({
                    name: f.get("name"),
                    email: f.get("email"),
                    role,
                    active: f.get("active") === "on",
                    message: f.get("message") ?? "",
                  });
                  await request("/users", adminUserResponseSchema, {
                    method: "POST",
                    body: input,
                  });
                  router.push("/admin/users");
                }, "Invitation created.");
              }}
            >
              <fieldset disabled={busy}>
                <div className="admin-form-grid">
                  <label>
                    Full Name *
                    <input
                      name="name"
                      placeholder="Enter full name"
                      maxLength={100}
                      required
                    />
                  </label>
                  <label>
                    Email Address *
                    <input
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      maxLength={254}
                      required
                    />
                  </label>
                  <label>
                    Role *
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as typeof role)}
                    >
                      <option value="CONTENT_MANAGER">Content Manager</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </label>
                  <label>
                    Account Status
                    <span className="admin-check">
                      <input
                        name="active"
                        type="checkbox"
                        role="switch"
                        defaultChecked
                      />
                      Active
                    </span>
                  </label>
                </div>
                <label className="admin-invitation-message">
                  Invitation Message{" "}
                  <span className="admin-muted">(Optional)</span>
                  <input
                    name="message"
                    maxLength={500}
                    placeholder="Welcome to the Tiyas Jewel admin team"
                  />
                </label>
                <div className="admin-actions">
                  <Link
                    className="admin-button admin-button-light"
                    href="/admin/users"
                  >
                    Cancel
                  </Link>
                  <button className="admin-button" disabled={busy}>
                    <Mail size={17} />
                    {busy ? "Sending…" : "Send Email Invitation"}
                  </button>
                </div>
                <p className="admin-muted">
                  The user will receive a six-digit email OTP to set their
                  password at /admin/accept-invitation. Codes expire in 10
                  minutes.
                </p>
              </fieldset>
            </form>
          </section>
          <aside className="admin-panel admin-role-access">
            <h2>Role Access</h2>
            <h3>
              {role === "CONTENT_MANAGER" ? "Content Manager" : "Administrator"}
            </h3>
            <p>
              {role === "CONTENT_MANAGER"
                ? "Can update storefront banners, carousel slides, homepage sections and static pages."
                : "Can manage products, accepted orders and website content."}
            </p>
            <ul>
              {[
                "Manage homepage content",
                "Upload and update banners",
                "Edit static page content",
                ...(role === "ADMIN"
                  ? ["Manage products and complete orders"]
                  : []),
              ].map((item) => (
                <li key={item}>
                  <Check size={17} />
                  {item}
                </li>
              ))}
              <li className="admin-access-denied">
                <X size={17} />
                No access to user administration
              </li>
            </ul>
            <p className="admin-notice">
              Only the store owner can create admins. Passwords are set using
              single-use email verification codes.
            </p>
          </aside>
        </div>
      ) : (
        <section className="admin-panel admin-panel-table">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Access</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name || "Store Owner"}</strong>
                      <small>{user.email}</small>
                    </td>
                    <td>
                      {user.role === "CONTENT_MANAGER"
                        ? "Content Manager"
                        : user.role === "OWNER"
                          ? "Store Owner"
                          : "Administrator"}
                    </td>
                    <td>
                      <span
                        className={`admin-status ${user.active ? "admin-status-green" : "admin-status-muted"}`}
                      >
                        {!user.active
                          ? "Inactive"
                          : user.invited
                            ? "Invitation pending"
                            : "Active"}
                      </span>
                    </td>
                    <td>
                      {user.role === "OWNER" ? (
                        "Full access"
                      ) : (
                        <select
                          aria-label={`Role for ${user.email}`}
                          disabled={busy}
                          value={user.role}
                          onChange={(e) =>
                            void mutate(
                              () =>
                                request(
                                  `/users/${user.id}`,
                                  adminUserResponseSchema,
                                  {
                                    method: "PUT",
                                    body: {
                                      role: e.target.value,
                                      active: user.active,
                                    },
                                  },
                                ),
                              "Access updated. Existing sessions revoked.",
                            )
                          }
                        >
                          <option value="ADMIN">Administrator</option>
                          <option value="CONTENT_MANAGER">
                            Content Manager
                          </option>
                        </select>
                      )}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        {user.role !== "OWNER" && (
                          <button
                            className="admin-button admin-button-light"
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                () =>
                                  request(
                                    `/users/${user.id}`,
                                    adminUserResponseSchema,
                                    {
                                      method: "PUT",
                                      body: {
                                        role: user.role,
                                        active: !user.active,
                                      },
                                    },
                                  ),
                                "Account status updated. Existing sessions revoked.",
                              )
                            }
                          >
                            <Pencil size={15} />
                            {user.active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                        <button
                          className="admin-button admin-button-light"
                          disabled={busy || !user.active}
                          onClick={() =>
                            void mutate(
                              () =>
                                request(
                                  `/users/${user.id}/resend`,
                                  adminOkSchema,
                                  { method: "POST", body: {} },
                                ),
                              "Email OTP requested. Repeated requests within 60 seconds reuse the current code.",
                            )
                          }
                        >
                          <Mail size={16} />
                          {user.invited
                            ? "Resend invitation"
                            : "Send reset OTP"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
