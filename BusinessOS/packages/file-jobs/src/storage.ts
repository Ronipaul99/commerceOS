import { digest, FileError, limitBytes, uuidValue } from "./contract.ts";
import type { PrivateStorage } from "./contract.ts";

type RequestToSign = Readonly<{ method: "GET" | "PUT"; url: string; headers: Readonly<Record<string, string>> }>;
export type SignS3Request = (request: RequestToSign, signal: AbortSignal) => Promise<{
  authorization: string; date: string; sessionToken?: string;
}>;

const encryptionHeader = "x-amz-server-side-encryption";
const encrypted = new Set(["AES256", "aws:kms", "aws:kms:dsse"]);

export class S3PrivateStorage implements PrivateStorage {
  private readonly endpoint: string;

  constructor(
    endpoint: string, private readonly bucket: string, private readonly sign: SignS3Request,
    private readonly fetchObject: typeof fetch = fetch,
  ) {
    let url: URL;
    try { url = new URL(endpoint); } catch { throw new FileError("UNAVAILABLE"); }
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash
      || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9](?![\s\S])/.test(bucket)) throw new FileError("UNAVAILABLE");
    this.endpoint = url.origin;
  }

  private async request(method: "GET" | "PUT", key: string, signal: AbortSignal, bytes?: Uint8Array) {
    const parts = key.split("/");
    if (parts.length !== 3 || !parts.every(uuidValue)) throw new FileError("UNAVAILABLE");
    const url = this.endpoint + "/" + this.bucket + "/" + parts.join("/");
    const payload = bytes ? Uint8Array.from(bytes) : undefined;
    const headers = Object.freeze({
      "x-amz-content-sha256": digest(payload ?? new Uint8Array()),
      ...(payload ? {
        "if-none-match": "*", "content-type": "application/octet-stream", [encryptionHeader]: "AES256",
      } : {}),
    });
    const signed = await this.sign({ method, url, headers }, signal);
    if (!signed.authorization || !signed.date) throw new FileError("UNAVAILABLE");
    signal.throwIfAborted();
    return this.fetchObject(url, {
      method, signal, redirect: "error", body: payload, headers: {
        ...headers, authorization: signed.authorization, "x-amz-date": signed.date,
        ...(signed.sessionToken ? { "x-amz-security-token": signed.sessionToken } : {}),
      },
    });
  }

  async putIfAbsent(key: string, bytes: Uint8Array, signal: AbortSignal): Promise<void> {
    if (bytes.byteLength < 1 || bytes.byteLength > limitBytes) throw new FileError("UNAVAILABLE");
    const response = await this.request("PUT", key, signal, bytes);
    try {
      if (response.status !== 412 && (response.status !== 200 || !encrypted.has(response.headers.get(encryptionHeader) ?? ""))) {
        throw new FileError("UNAVAILABLE");
      }
    } finally {
      await response.body?.cancel();
    }
  }

  async read(key: string, maxBytes: number, signal: AbortSignal): Promise<Uint8Array | undefined> {
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > limitBytes) throw new FileError("UNAVAILABLE");
    const response = await this.request("GET", key, signal);
    const declared = response.headers.get("content-length");
    const encoding = response.headers.get("content-encoding");
    if (response.status !== 200 || !response.body || !encrypted.has(response.headers.get(encryptionHeader) ?? "")
      || (encoding && encoding !== "identity") || (declared !== null && !/^[0-9]{1,5}$/.test(declared))
      || (declared !== null && Number(declared) > maxBytes)) {
      await response.body?.cancel();
      if (response.status === 404) return undefined;
      throw new FileError("UNAVAILABLE");
    }
    const buffer = new Uint8Array(maxBytes);
    const reader = response.body.getReader();
    let position = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (position + value.byteLength > buffer.byteLength) throw new FileError("UNAVAILABLE");
        buffer.set(value, position);
        position += value.byteLength;
      }
      if (declared !== null && position !== Number(declared)) throw new FileError("UNAVAILABLE");
      return buffer.subarray(0, position);
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
}
