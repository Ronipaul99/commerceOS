"use client";
import { useTransition } from "react";
import { useAdminActivity } from "@/features/admin/activity";
export default function AdminError({ reset }: { reset: () => void }) {
  const [pending, startTransition] = useTransition();
  useAdminActivity(pending, "Retrying page…");
  return (
    <main id="main-content" className="admin-main">
      <h1>We could not load this page.</h1>
      <p>Please try again. If the issue continues, check the API connection.</p>
      <button
        className="admin-button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => startTransition(reset)}
      >
        {pending ? <>Retrying…</> : "Try again"}
      </button>
    </main>
  );
}
