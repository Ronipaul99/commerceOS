"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Copy, Download, Sparkles, X } from "lucide-react";
import {
  buildImagePrompt,
  imagePromptProfile,
  type ImagePlacement,
} from "@/lib/admin-image-prompt";
import { downloadAdminFile } from "@/lib/admin-download";
import { useAdminActivity } from "./activity";

export function ImagePromptHelper({
  placement,
  name,
}: {
  placement: ImagePlacement;
  name: string;
}) {
  const [open, setOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [copying, setCopying] = useState(false),
    [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    text = useRef<HTMLTextAreaElement>(null);
  const title = useId(),
    prompt = buildImagePrompt(placement, name, mobile),
    profile = imagePromptProfile(placement, mobile);
  useAdminActivity(copying, "Copying image prompt…");
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  function download() {
    downloadAdminFile(
      `tiyas-${placement}${mobile ? "-mobile" : ""}-image-prompt.txt`,
      prompt,
      "text/plain;charset=utf-8",
    );
  }
  return (
    <div className="admin-image-prompt">
      <div className="admin-actions">
        <button
          type="button"
          className="admin-button admin-button-light"
          onClick={() => {
            setMessage("");
            setOpen(true);
          }}
        >
          <Sparkles size={16} /> View image prompt
        </button>
        <button
          type="button"
          className="admin-button admin-button-light"
          onClick={download}
        >
          <Download size={16} /> Download prompt
        </button>
      </div>
      <small>
        {profile.width} × {profile.height} · {profile.ratio} · Uploads are
        optimized to WebP
      </small>
      <dialog
        ref={dialog}
        className="admin-dialog admin-prompt-dialog"
        aria-labelledby={title}
        onCancel={() => setOpen(false)}
      >
        <header>
          <div>
            <h2 id={title}>Tiyas image prompt</h2>
            <p>
              Attach your product photo in an image-capable AI tool, then paste
              this prompt. Check the result matches the real jewellery.
            </p>
          </div>
          <button
            type="button"
            className="admin-icon-button"
            aria-label="Close image prompt"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </header>
        {placement === "hero" && (
          <label>
            Image placement
            <select
              value={mobile ? "mobile" : "desktop"}
              onChange={(e) => {
                setMobile(e.target.value === "mobile");
                setMessage("");
              }}
            >
              <option value="desktop">Desktop hero · 3:1</option>
              <option value="mobile">Mobile hero · 4:5</option>
            </select>
          </label>
        )}
        <label>
          Ready-to-use prompt
          <textarea ref={text} rows={14} readOnly value={prompt} />
        </label>
        <div className="admin-actions">
          <button
            type="button"
            className="admin-button"
            disabled={copying}
            aria-busy={copying}
            onClick={async () => {
              setCopying(true);
              try {
                await navigator.clipboard.writeText(prompt);
                setMessage("Prompt copied.");
              } catch {
                text.current?.focus();
                text.current?.select();
                setMessage(
                  "Select and copy the prompt, or download the text file.",
                );
              } finally {
                setCopying(false);
              }
            }}
          >
            {!copying && <Copy size={16} />}{" "}
            {copying ? "Copying…" : "Copy prompt"}
          </button>
          <button
            type="button"
            className="admin-button admin-button-light"
            onClick={download}
          >
            <Download size={16} /> Download prompt
          </button>
        </div>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </dialog>
    </div>
  );
}
