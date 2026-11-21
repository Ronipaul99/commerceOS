"use client";
import { useEffect, useId, useRef, useState } from "react";
import { AdminSpinner } from "./loading-ui";
export function AdminConfirm({
  open,
  onClose,
  title,
  description,
  label,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  label: string;
  onConfirm: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      ref.current?.showModal();
    } else ref.current?.close();
  }, [open]);
  function dismiss() {
    setError("");
    onClose();
  }
  return (
    <dialog
      className="admin-dialog"
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else dismiss();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-actions">
        <button
          type="button"
          className="admin-button admin-button-light"
          disabled={busy}
          onClick={dismiss}
        >
          Cancel
        </button>
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onConfirm();
              dismiss();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Request failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <AdminSpinner />}
          {busy ? "Working…" : label}
        </button>
      </div>
    </dialog>
  );
}
