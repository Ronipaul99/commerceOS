import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import type { Access } from "@businessos/execution-context";

export const fileAccess = {
  upload: { resource: "private-file", action: "upload", ownership: "branch" },
  download: { resource: "private-file", action: "download", ownership: "branch" },
  status: { resource: "private-file-job", action: "read", ownership: "branch" },
  cancel: { resource: "private-file-job", action: "cancel", ownership: "branch" },
  scan: { resource: "private-file-job", action: "scan", ownership: "branch" },
} as const satisfies Record<string, Access>;

export const fileQueue = Object.freeze({
  issuer: "businessos-files", audience: "businessos-worker", queue: "private-file-scan", operation: "scan",
});

export type FileErrorCode = "BAD_REQUEST" | "TOO_LARGE" | "TYPE_UNSUPPORTED" | "NOT_FOUND" | "CONFLICT" | "UNAVAILABLE";
export class FileError extends Error {
  readonly code: FileErrorCode;

  constructor(code: FileErrorCode) {
    super("Private file operation could not be completed.");
    this.code = code;
  }
}

export const limitBytes = 16384;
export const grantSeconds = 60;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?![\s\S])/;
export const uuidValue = (value: unknown): value is string => typeof value === "string" && uuid.test(value);
export function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type UploadIntent = Readonly<{ filename: string; mediaType: "text/plain"; sizeBytes: number }>;
export function parseIntent(value: unknown): UploadIntent {
  if (!value || typeof value !== "object" || Array.isArray(value) || Reflect.ownKeys(value).length !== 3
      || !("filename" in value) || !("mediaType" in value) || !("sizeBytes" in value)) throw new FileError("BAD_REQUEST");
  const { filename, mediaType, sizeBytes } = value;
  if (typeof filename !== "string" || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,95}\.txt(?![\s\S])/.test(filename)
      || filename.includes("..") || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(filename)) {
    throw new FileError("BAD_REQUEST");
  }
  if (mediaType !== "text/plain") throw new FileError("TYPE_UNSUPPORTED");
  if (typeof sizeBytes !== "number" || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1) throw new FileError("BAD_REQUEST");
  if (sizeBytes > limitBytes) throw new FileError("TOO_LARGE");
  return { filename, mediaType, sizeBytes };
}

export function validateText(bytes: Uint8Array): void {
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new FileError("TYPE_UNSUPPORTED"); }
  // Disallow control characters except the line separators and tab used by plain text.
  // eslint-disable-next-line no-control-regex
  if (/[^\S\r\n\t ]|\p{Cf}|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(text) || !text.length) {
    throw new FileError("TYPE_UNSUPPORTED");
  }
}

export function parseContent(value: unknown): Buffer {
  if (!value || typeof value !== "object" || Array.isArray(value) || Reflect.ownKeys(value).length !== 1
      || !("contentBase64" in value) || typeof value.contentBase64 !== "string") throw new FileError("BAD_REQUEST");
  const encoded = value.contentBase64;
  if (encoded.length > 4 * Math.ceil(limitBytes / 3)) throw new FileError("TOO_LARGE");
  if (!encoded.length || !/^[A-Za-z0-9+/]+={0,2}(?![\s\S])/.test(encoded)) throw new FileError("BAD_REQUEST");
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length > limitBytes) throw new FileError("TOO_LARGE");
  if (bytes.toString("base64") !== encoded) throw new FileError("BAD_REQUEST");
  validateText(bytes);
  return bytes;
}

export interface PrivateStorage {
  /** Host adapter enforces private encrypted storage, conditional creation and bounded reads. */
  putIfAbsent(key: string, bytes: Uint8Array, signal: AbortSignal): Promise<void>;
  read(key: string, maxBytes: number, signal: AbortSignal): Promise<Uint8Array | undefined>;
}
export type Scan = (bytes: Uint8Array, mediaType: "text/plain", signal: AbortSignal) =>
  Promise<"clean" | "rejected" | "unavailable">;
/** A media registration can supply this hook after a clean scan, before completing its job. */
export type PrepareVariants = (bytes: Uint8Array, signal: AbortSignal) => Promise<void>;

export type JobState = "QUEUED" | "RUNNING" | "SUCCEEDED" | "REJECTED" | "FAILED" | "CANCELLED";
export type JobFailure = "SCAN_REJECTED" | "SCAN_UNAVAILABLE";
export type JobStatus = { jobId: string; state: JobState; progress: number; version: number; failure: JobFailure | null };

export async function bounded<T>(work: (signal: AbortSignal) => Promise<T>, ms = 2000): Promise<T> {
  const signal = AbortSignal.timeout(ms);
  return new Promise((resolve, reject) => {
    const abort = () => reject(new FileError("UNAVAILABLE"));
    signal.addEventListener("abort", abort, { once: true });
    void Promise.resolve().then(() => work(signal)).then((result) => {
      if (signal.aborted) abort();
      else resolve(result);
    }, abort).finally(() => signal.removeEventListener("abort", abort));
  });
}
