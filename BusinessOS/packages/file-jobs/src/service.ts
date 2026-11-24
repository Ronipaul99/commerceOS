import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { KeyObject } from "node:crypto";
import type { RequestContext } from "@businessos/execution-context";
import { bounded, digest, FileError, grantSeconds, parseContent, parseIntent, uuidValue } from "./contract.ts";
import type { PrivateStorage } from "./contract.ts";
import type { FileRepository, FileRow } from "./repository.ts";

export function objectKey(row: FileRow): string {
  if (![row.tenantId, row.branchId, row.id].every(uuidValue)) throw new FileError("UNAVAILABLE");
  return [row.tenantId, row.branchId, row.id].join("/");
}

export async function checkedObject(storage: PrivateStorage, row: FileRow, signal: AbortSignal): Promise<Uint8Array> {
  const object = await storage.read(objectKey(row), row.sizeBytes, signal);
  if (!object || object.byteLength !== row.sizeBytes) throw new FileError("UNAVAILABLE");
  const snapshot = Uint8Array.from(object);
  if (digest(snapshot) !== row.digest) throw new FileError("UNAVAILABLE");
  return snapshot;
}

function validateKey(key: KeyObject): void {
  if (key?.type !== "secret" || (key.symmetricKeySize ?? 0) < 32) throw new FileError("UNAVAILABLE");
}

function signature(key: KeyObject, context: RequestContext, row: FileRow, expiry: number): Buffer {
  return createHmac("sha256", key).update(JSON.stringify([
    "businessos-private-file-download-v1", row.id, row.version, row.tenantId, row.branchId,
    context.auth.principal.id, context.auth.principal.identityRef, expiry,
  ])).digest();
}

export class FileService {
  constructor(
    readonly repository: FileRepository, private readonly storage: PrivateStorage, private readonly downloadKey: KeyObject,
    private readonly now = () => Math.floor(Date.now() / 1000),
  ) {
    validateKey(downloadKey);
  }

  create(context: RequestContext, key: string | undefined, input: unknown) {
    if (!key || !/^[A-Za-z0-9._~:-]{1,128}(?![\s\S])/.test(key)) throw new FileError("BAD_REQUEST");
    return this.repository.create(context, key, parseIntent(input));
  }

  async upload(context: RequestContext, id: string, input: unknown) {
    const bytes = parseContent(input);
    const checksum = digest(bytes);
    const pinned = await this.repository.pin(context, id, bytes.length, checksum);
    if (pinned.state === "INTENT") {
      await bounded((signal) => this.storage.putIfAbsent(objectKey(pinned), bytes, signal));
      await bounded((signal) => checkedObject(this.storage, pinned, signal));
    }
    return this.repository.finalize(context, id, checksum);
  }

  async issueDownload(context: RequestContext, id: string) {
    const row = await this.repository.download(context, id);
    if (row.state !== "AVAILABLE") throw new FileError("CONFLICT");
    const expires = this.now() + grantSeconds;
    const proof = String(expires) + "." + signature(this.downloadKey, context, row, expires).toString("base64url");
    return { url: "/api/v1/files/" + row.id + "/download?grant=" + proof, expiresAt: new Date(expires * 1000).toISOString() };
  }

  async download(context: RequestContext, id: string, proof: unknown) {
    const parsed = typeof proof === "string" && /^([1-9]\d{0,12})\.([A-Za-z0-9_-]{43})(?![\s\S])/.exec(proof);
    if (!parsed) throw new FileError("NOT_FOUND");
    const expires = Number(parsed[1]);
    const validTime = () => expires > this.now() && expires <= this.now() + grantSeconds;
    if (!validTime()) throw new FileError("NOT_FOUND");
    const row = await this.repository.download(context, id);
    const tag = Buffer.from(parsed[2]!, "base64url");
    if (row.state !== "AVAILABLE" || tag.toString("base64url") !== parsed[2] || tag.length !== 32
        || !timingSafeEqual(tag, signature(this.downloadKey, context, row, expires))) throw new FileError("NOT_FOUND");
    const bytes = await bounded((signal) => checkedObject(this.storage, row, signal));
    if (!validTime()) throw new FileError("NOT_FOUND");
    return { bytes, filename: row.filename };
  }
}
