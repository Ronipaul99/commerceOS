import { BadRequestException, ConflictException, PipeTransform, SetMetadata } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { RequestContext } from "@businessos/execution-context";

export const API_PREFIX = "/api/v1";
export const PUBLIC_ROUTE = Symbol("public route");
export const IDEMPOTENT_WRITE = Symbol("idempotent write");
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE, true);
export const RequireIdempotency = () => SetMetadata(IDEMPOTENT_WRITE, true);

export interface VerifiedPrincipal {
  subject: string;
  sessionId?: string;
  memberships: readonly { id: string; tenantId: string }[];
}

export interface ContractRequest extends IncomingMessage {
  path?: string;
  requestId?: string;
  cookieAuth?: boolean;
  principal?: VerifiedPrincipal;
  idempotencyKey?: string;
  body?: unknown;
  query?: unknown;
  executionContext?: RequestContext;
}

export const isVersioned = (request: ContractRequest) => {
  // Express supplies the routed pathname even for absolute-form request targets.
  const path = (request.path ?? request.url?.split("?", 1)[0])?.toLowerCase();
  return path === API_PREFIX || path?.startsWith(API_PREFIX + "/") === true;
};

export function invalid(field: string): never {
  throw new BadRequestException({
    code: "VALIDATION_FAILED", message: "Request validation failed.", details: { field },
  });
}

export class StringFieldsPipe implements PipeTransform {
  constructor(private readonly fields: Readonly<Record<string, RegExp>>) {}

  transform(value: unknown): Record<string, string> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) invalid("body");
    const input = value as Record<string, unknown>;
    if (Object.keys(input).some((key) => !Object.hasOwn(this.fields, key))) invalid("body");
    const result: Record<string, string> = {};
    for (const [key, pattern] of Object.entries(this.fields)) {
      const entry = Object.hasOwn(input, key) ? input[key] : undefined;
      if (typeof entry !== "string" || !pattern.test(entry)) invalid(key);
      result[key] = entry;
    }
    return result;
  }
}

export class PaginationPipe implements PipeTransform {
  transform(query: Record<string, unknown>): { limit: number; cursor?: string } {
    if (Object.keys(query).some((key) => key !== "limit" && key !== "cursor")) invalid("query");
    const { limit = "25", cursor } = query;
    if (typeof limit !== "string" || !/^(?:[1-9][0-9]?|100)$/.test(limit)) invalid("limit");
    if (cursor !== undefined && (typeof cursor !== "string" || !/^[A-Za-z0-9_-]{1,256}$/.test(cursor))) {
      invalid("cursor");
    }
    return { limit: Number(limit), cursor };
  }
}

export function versionTag(version: number): string {
  if (!Number.isSafeInteger(version) || version < 1) throw new Error("Invalid resource version");
  return `"${version}"`;
}

export function requireCurrentVersion(ifMatch: unknown, current: number): void {
  if (typeof ifMatch !== "string" || !/^"[1-9][0-9]{0,15}"$/.test(ifMatch)
      || !Number.isSafeInteger(Number(ifMatch.slice(1, -1)))) invalid("If-Match");
  if (ifMatch !== versionTag(current)) {
    throw new ConflictException({ code: "VERSION_CONFLICT", message: "The resource version has changed." });
  }
}

// Pass validated fields and the accepted precondition to a durable command store.
export function commandFingerprint(fields: Readonly<Record<string, string>>, ifMatch: string): string {
  const ordered = Object.keys(fields).sort().map((name) => [name, fields[name]]);
  return createHash("sha256").update(JSON.stringify([ifMatch, ordered])).digest("hex");
}

export function requireMatchingFingerprint(stored: string, incoming: string): void {
  if (stored !== incoming) {
    throw new ConflictException({
      code: "IDEMPOTENCY_KEY_REUSE", message: "The key was already used for a different request.",
    });
  }
}
