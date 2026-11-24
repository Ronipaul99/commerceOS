import { createHash, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { TLSSocket } from "node:tls";
import { ForbiddenException, ServiceUnavailableException, SetMetadata, UnauthorizedException } from "@nestjs/common";
import type { VerifiedPrincipal } from "../http/contract.js";
import { normalizeIp } from "./config.js";
import type { ProtectedConfig } from "./config.js";
import { reportSecurity, SecurityFailure } from "./policy.js";
import type { SecurityLog } from "./policy.js";
import type { ProtectedSecurity, Transport } from "./protected.js";

export const COOKIE_AUTH = Symbol("cookie auth");
export const CookieAuth = () => SetMetadata(COOKIE_AUTH, true);
export const sessionCookieName = "__Host-businessos-session";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const bearerPattern = /^Bearer ([A-Za-z0-9._~+/-]+=*)(?![\s\S])/i;
const cookieCredential = /^[A-Za-z0-9._~-]{1,4089}(?![\s\S])/;

export type ProtectedAdmission = Readonly<{
  config: ProtectedConfig;
  verify: (request: IncomingMessage, transport: Transport) => Promise<VerifiedPrincipal>;
}>;

function headerValues(request: IncomingMessage, name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === name) values.push(request.rawHeaders[index + 1]!);
  }
  return values;
}

function singleHeader(request: IncomingMessage, name: string): string | undefined {
  const values = headerValues(request, name);
  return values.length === 1 ? values[0] : undefined;
}

export function bearerCredential(request: IncomingMessage): string | undefined {
  const value = singleHeader(request, "authorization");
  return value && value.length <= 4096 ? bearerPattern.exec(value)?.[1] : undefined;
}

function sessionCookies(request: IncomingMessage): string[] {
  return headerValues(request, "cookie")
    .flatMap((header) => header.split(";"))
    .flatMap((part) => {
      const index = part.indexOf("=");
      const name = (index < 0 ? part : part.slice(0, index)).trim();
      return name === sessionCookieName ? [index < 0 ? "" : part.slice(index + 1)] : [];
    });
}

function getCredential(request: IncomingMessage, transport: Transport): string {
  const cookies = sessionCookies(request);
  if (transport === "bearer") {
    const value = cookies.length === 0 ? bearerCredential(request) : undefined;
    if (value) return value;
  } else if (headerValues(request, "authorization").length === 0 && cookies.length === 1
      && cookieCredential.test(cookies[0]!)) {
    return cookies[0]!;
  }
  throw new SecurityFailure("CREDENTIAL_DENIED");
}

export function serializeSessionCookie(credential: string): string {
  if (!cookieCredential.test(credential)) throw new SecurityFailure("CREDENTIAL_DENIED");
  return sessionCookieName + "=" + credential + "; Path=/; Secure; HttpOnly; SameSite=Lax";
}

export function secured(request: IncomingMessage, config: ProtectedConfig): boolean {
  if ((request.socket as TLSSocket).encrypted === true) return true;
  const peer = normalizeIp(request.socket.remoteAddress ?? "");
  return config.trustedProxies.includes(peer) && singleHeader(request, "x-forwarded-proto") === "https";
}

export function securityHeaders(config?: ProtectedConfig) {
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    if (config?.https === "required" && secured(request, config)) {
      response.setHeader("Strict-Transport-Security", "max-age=31536000");
    }
    next();
  };
}

function hasCsrf(request: IncomingMessage, config: ProtectedConfig, digest?: string): boolean {
  const origin = singleHeader(request, "origin");
  const proof = singleHeader(request, "x-csrf-token");
  if (!origin || !config.browserOrigins.includes(origin) || !proof
      || !/^[A-Za-z0-9_-]{43}(?![\s\S])/.test(proof)
      || !digest || !/^[a-f0-9]{64}(?![\s\S])/.test(digest)) return false;
  return timingSafeEqual(createHash("sha256").update(proof).digest(), Buffer.from(digest, "hex"));
}

export function protectedAdmission(security: ProtectedSecurity, log?: SecurityLog): ProtectedAdmission {
  const { config } = security;
  return Object.freeze({
    config,
    async verify(request: IncomingMessage, transport: Transport) {
      const start = performance.now();
      try {
        const tls = secured(request, config);
        const peer = normalizeIp(request.socket.remoteAddress ?? "");
        const loopback = config.https === "loopback-test" && (peer === "127.0.0.1" || peer === "::1");
        if ((transport === "cookie" && (config.transport !== "bearer-with-cookie" || !tls))
            || (!tls && !loopback)) throw new SecurityFailure("TRANSPORT_DENIED");
        const authentication = await security.authenticate(getCredential(request, transport), transport);
        if (transport === "cookie" && !safeMethods.has(request.method ?? "")
            && !hasCsrf(request, config, authentication.csrfDigest)) throw new SecurityFailure("CSRF_DENIED");
        reportSecurity(log, "authenticate", "ACCEPTED", start);
        return authentication.principal;
      } catch (error) {
        const reason = error instanceof SecurityFailure ? error.reason : "UNAVAILABLE";
        reportSecurity(log, "authenticate", reason, start);
        if (reason === "CREDENTIAL_DENIED" || reason === "SESSION_DENIED") throw new UnauthorizedException();
        if (reason === "CSRF_DENIED" || reason === "TRANSPORT_DENIED") throw new ForbiddenException();
        throw new ServiceUnavailableException();
      }
    },
  });
}
