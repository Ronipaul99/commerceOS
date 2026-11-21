"use client";
import { useState } from "react";
import { Download, FileJson, Upload } from "lucide-react";
import { z } from "zod";
import { productTransferSchema, type ProductTransfer } from "@tiyas/shared";
import { downloadAdminFile } from "@/lib/admin-download";
import { AdminConfirm } from "./confirm";
import { useAdminActivity } from "./activity";

export function ProductJsonTools({
  template,
  snapshot,
  disabled,
  onImport,
}: {
  template: unknown;
  snapshot: () => unknown;
  disabled: boolean;
  onImport: (data: ProductTransfer) => void;
}) {
  const [pending, setPending] = useState<ProductTransfer | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState("");
  useAdminActivity(reading, "Reading product JSON…");
  function download(value: unknown, name: string) {
    downloadAdminFile(
      name,
      JSON.stringify(value, null, 2) + "\n",
      "application/json",
    );
  }
  return (
    <section
      className="admin-panel admin-json-tools"
      aria-labelledby="product-json-heading"
    >
      <div>
        <h2 id="product-json-heading">
          <FileJson size={21} /> Fill product details with JSON
        </h2>
        <p>
          Download the template, fill in your details, then import it here.
          Review the form before saving. Upload image files separately using the
          filenames in your JSON.
        </p>
      </div>
      <div className="admin-actions">
        <button
          type="button"
          className="admin-button admin-button-light"
          disabled={disabled || reading}
          onClick={() => download(template, "tiyas-product-template.json")}
        >
          <Download size={17} /> Download JSON template
        </button>
        <button
          type="button"
          className="admin-button admin-button-light"
          disabled={disabled || reading}
          onClick={() => download(snapshot(), "tiyas-product-draft.json")}
        >
          <Download size={17} /> Export current details
        </button>
        <label className="admin-button admin-upload">
          {!reading && <Upload size={17} />}
          {reading ? "Reading JSON…" : "Import JSON"}
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Import product JSON"
            disabled={disabled || reading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError("");
              setMessage("");
              setReading(true);
              try {
                if (file.size > 256 * 1024)
                  throw Error("The JSON file must be 256 KB or smaller.");
                const data = productTransferSchema.parse(
                  JSON.parse((await file.text()).replace(/^\uFEFF/, "")),
                );
                setPending(data);
              } catch (e) {
                setError(
                  e instanceof z.ZodError
                    ? e.issues
                        .slice(0, 8)
                        .map((i) => `${i.path.join(".")}: ${i.message}`)
                        .join(" · ")
                    : e instanceof SyntaxError
                      ? "This is not valid JSON. Check commas, quotation marks and brackets."
                      : e instanceof Error
                        ? e.message
                        : "The file could not be read.",
                );
              } finally {
                setReading(false);
              }
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="admin-notice">
          {message}
        </p>
      )}
      <AdminConfirm
        open={!!pending}
        onClose={() => setPending(null)}
        title="Fill this form from JSON?"
        description="This replaces the details and variants currently in the form. Existing uploaded images are kept; matching image descriptions and variant image links are filled by filename. Nothing is saved until you save the product."
        label="Fill product form"
        onConfirm={async () => {
          if (pending) {
            onImport(pending);
            setMessage(
              "Product details imported. Review the form and attach any listed image files, then save.",
            );
          }
        }}
      />
    </section>
  );
}
