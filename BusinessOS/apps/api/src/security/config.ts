import { isIP } from "node:net";
import { opaqueId, seconds, SecurityFailure } from "./policy.js";

const prefix = "BUSINESSOS_AUTH_";
const names = new Set([
  "MODE", "ISSUER", "AUDIENCE", "TRANSPORT", "HTTPS", "BROWSER_ORIGINS", "TRUSTED_PROXIES",
  "CURRENT_REF", "PREVIOUS_REF", "PREVIOUS_UNTIL", "VERIFY_MS", "MAX_TOKEN_SECONDS", "MIN_ASSURANCE",
]);

export type Assurance = "standard" | "elevated";
export type ProtectedConfig = Readonly<{
  mode: "protected";
  issuer: string;
  audience: string;
  transport: "bearer" | "bearer-with-cookie";
  https: "required" | "loopback-test";
  browserOrigins: readonly string[];
  trustedProxies: readonly string[];
  currentRef: string;
  previous?: Readonly<{ ref: string; until: number }>;
  verifyMs: number;
  maxTokenSeconds: number;
  minAssurance: Assurance;
}>;
export type SecurityConfig = Readonly<{ mode: "shell" }> | ProtectedConfig;
export type Environment = Readonly<Record<string, string | undefined>>;

function invalid(): never { throw new SecurityFailure("CONFIG_INVALID"); }

function integer(value: string | undefined, min: number, max: number, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9][0-9]{0,14}(?![\s\S])/.test(value)) invalid();
  const number = Number(value);
  return number >= min && number <= max ? number : invalid();
}

function reference(value?: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}(?![\s\S])/.test(value)
      || value.split("/").some((part) => !part || part === "." || part === "..")) invalid();
  return value;
}

function secureUrl(value?: string): URL {
  if (!value || value.length > 512 || /[\s\\]/.test(value)) invalid();
  let parsed: URL;
  try { parsed = new URL(value); } catch { invalid(); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) invalid();
  return parsed;
}

export const normalizeIp = (value: string): string => value.toLowerCase().replace(/^::ffff:(?=\d+\.)/, "");

function list(value: string | undefined): string[] {
  if (value === undefined) return [];
  const items = value.split(",");
  if (items.length > 16 || items.some((item) => !item || item.trim() !== item)) invalid();
  return items;
}

export function loadSecurityConfig(env: Environment, now = seconds()): SecurityConfig {
  const get = (name: string) => env[prefix + name];
  const provided = Object.keys(env).filter((key) => key.startsWith(prefix) && env[key] !== undefined);
  if (provided.some((key) => !names.has(key.slice(prefix.length)))) invalid();
  const mode = get("MODE") ?? "shell";
  if (mode === "shell") {
    if (provided.some((key) => key !== prefix + "MODE")) invalid();
    return Object.freeze({ mode });
  }
  if (mode !== "protected") invalid();

  const issuer = get("ISSUER");
  secureUrl(issuer);
  const audience = get("AUDIENCE");
  const transport = get("TRANSPORT");
  const https = get("HTTPS");
  const minAssurance = get("MIN_ASSURANCE") ?? "standard";
  if (!issuer || !opaqueId(audience) || (transport !== "bearer" && transport !== "bearer-with-cookie")
      || (https !== "required" && https !== "loopback-test")
      || (https === "loopback-test" && env.NODE_ENV !== "test")
      || (minAssurance !== "standard" && minAssurance !== "elevated")) invalid();

  const currentRef = reference(get("CURRENT_REF"));
  const previousRef = get("PREVIOUS_REF");
  const previousUntil = get("PREVIOUS_UNTIL");
  if ((previousRef === undefined) !== (previousUntil === undefined) || previousRef === currentRef) invalid();
  const previous = previousRef === undefined ? undefined : Object.freeze({
    ref: reference(previousRef), until: integer(previousUntil, 1, now + 600),
  });
  const browserOrigins = list(get("BROWSER_ORIGINS"));
  if (browserOrigins.some((origin) => secureUrl(origin).origin !== origin)
      || Boolean(browserOrigins.length) !== (transport === "bearer-with-cookie")) invalid();
  const trustedProxies = list(get("TRUSTED_PROXIES")).map(normalizeIp);
  if (trustedProxies.some((ip) => !isIP(ip) || ip.includes("%"))) invalid();

  return Object.freeze({
    mode, issuer, audience, transport, https, currentRef, previous, minAssurance,
    browserOrigins: Object.freeze(browserOrigins), trustedProxies: Object.freeze(trustedProxies),
    verifyMs: integer(get("VERIFY_MS"), 50, 2000, 1000),
    maxTokenSeconds: integer(get("MAX_TOKEN_SECONDS"), 1, 3600, 900),
  });
}
