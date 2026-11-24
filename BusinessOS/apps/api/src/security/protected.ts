import { timingSafeEqual } from "node:crypto";
import type { VerifiedPrincipal } from "../http/contract.js";
import { loadSecurityConfig } from "./config.js";
import type { Assurance, Environment, ProtectedConfig } from "./config.js";
import { opaqueId, reportSecurity, seconds, SecurityFailure, withDeadline } from "./policy.js";
import type { SecurityLog } from "./policy.js";

export type Transport = "bearer" | "cookie";
type Purpose = "tenant-session";
type SecretPurpose = "tenant-session-verification";
const secretPurpose: SecretPurpose = "tenant-session-verification";
const isAssurance = (value: unknown): value is Assurance => value === "standard" || value === "elevated";
const assuranceSatisfies = (current: unknown, minimum: Assurance): boolean =>
  isAssurance(current) && (minimum === "standard" || current === "elevated");

export type VersionedSecret = Readonly<{ version: string; material: Uint8Array; validUntil: number }>;
type AvailableSecret = Readonly<{ status: "available"; secret: VersionedSecret }>;
export interface SecretProvider {
  resolve(reference: string, purpose: SecretPurpose, signal: AbortSignal): Promise<
    AvailableSecret | Readonly<{ status: "missing" | "revoked" | "unavailable" }>
  >;
  versionStatus(reference: string, purpose: SecretPurpose, version: string, signal: AbortSignal):
    Promise<"active" | "revoked" | "unavailable">;
}

export type ProviderIdentity = Readonly<{
  issuer: string;
  audience: string;
  purpose: Purpose;
  transport: Transport;
  providerSubject: string;
  sessionId: string;
  keyVersion: string;
  issuedAt: number;
  expiresAt: number;
  assurance: Assurance;
}>;
export interface AuthProvider {
  verify(request: Readonly<{
    credential: string;
    transport: Transport;
    issuer: string;
    audience: string;
    purpose: Purpose;
    trustedKeys: readonly VersionedSecret[];
  }>, signal: AbortSignal): Promise<
    Readonly<{ status: "verified"; identity: ProviderIdentity }> | Readonly<{ status: "denied" | "unavailable" }>
  >;
}

type SubjectBinding = Readonly<{ issuer: string; providerSubject: string; sessionId: string }>;
type ActiveSession = Readonly<{
  status: "active";
  binding: SubjectBinding;
  subject: string;
  purpose: Purpose;
  transport: Transport;
  assurance: Assurance;
  expiresAt: number;
  csrfDigest?: string;
}>;
export type SessionAuthority = (binding: SubjectBinding, signal: AbortSignal) => Promise<
  ActiveSession | Readonly<{ status: "denied" | "unavailable" }>
>;
type Membership = Readonly<{ id: string; tenantId: string }>;
export type MembershipAuthority = (subject: string, signal: AbortSignal) => Promise<readonly Membership[] | undefined>;
export type SecurityDependencies = Readonly<{
  secrets: SecretProvider;
  provider: AuthProvider;
  session: SessionAuthority;
  memberships: MembershipAuthority;
  log?: SecurityLog;
}>;

type RingEntry = Readonly<VersionedSecret & { ref: string; acceptUntil: number }>;

async function entry(
  store: SecretProvider, ref: string, acceptUntil: number, signal: AbortSignal, optional: boolean,
): Promise<RingEntry | undefined> {
  const result = await store.resolve(ref, secretPurpose, signal);
  if (optional && result?.status === "revoked") return undefined;
  if (result?.status === "missing") throw new SecurityFailure("SECRET_MISSING");
  if (result?.status === "revoked") throw new SecurityFailure("SECRET_INVALID");
  if (result?.status !== "available") throw new SecurityFailure("UNAVAILABLE");
  const secret = result.secret;
  if (!secret || !opaqueId(secret.version) || !(secret.material instanceof Uint8Array)
      || secret.material.byteLength < 32 || secret.material.byteLength > 8192
      || !Number.isSafeInteger(secret.validUntil) || secret.validUntil <= seconds()) {
    throw new SecurityFailure("SECRET_INVALID");
  }
  const ringEntry = Object.freeze({
    ref, acceptUntil, version: secret.version, material: Uint8Array.from(secret.material), validUntil: secret.validUntil,
  });
  const status = await authorizedVersion(store, ringEntry, signal);
  if (status) return ringEntry;
  if (optional) return undefined;
  throw new SecurityFailure("SECRET_INVALID");
}

async function authorizedVersion(store: SecretProvider, selected: RingEntry, signal: AbortSignal): Promise<boolean> {
  if (Math.min(selected.acceptUntil, selected.validUntil) <= seconds()) return false;
  signal.throwIfAborted();
  const status = await store.versionStatus(selected.ref, secretPurpose, selected.version, signal);
  if (status === "revoked") return false;
  if (status !== "active") throw new SecurityFailure("UNAVAILABLE");
  return Math.min(selected.acceptUntil, selected.validUntil) > seconds();
}

function validIdentity(
  identity: ProviderIdentity, config: ProtectedConfig, transport: Transport, now: number,
): boolean {
  return identity?.issuer === config.issuer && identity.audience === config.audience
    && identity.purpose === "tenant-session" && identity.transport === transport
    && opaqueId(identity.providerSubject) && opaqueId(identity.sessionId) && opaqueId(identity.keyVersion)
    && assuranceSatisfies(identity.assurance, config.minAssurance)
    && Number.isSafeInteger(identity.issuedAt) && Number.isSafeInteger(identity.expiresAt)
    && identity.issuedAt > 0 && identity.issuedAt <= now && identity.expiresAt > now
    && identity.expiresAt - identity.issuedAt <= config.maxTokenSeconds;
}

function validSession(session: ActiveSession, binding: SubjectBinding, config: ProtectedConfig, transport: Transport): boolean {
  return session.binding?.issuer === binding.issuer && session.binding.providerSubject === binding.providerSubject
    && session.binding.sessionId === binding.sessionId && opaqueId(session.subject)
    && session.purpose === "tenant-session" && session.transport === transport
    && assuranceSatisfies(session.assurance, config.minAssurance)
    && Number.isSafeInteger(session.expiresAt) && session.expiresAt > seconds();
}

export type Authenticated = Readonly<{ principal: VerifiedPrincipal; csrfDigest?: string }>;

export async function initializeProtectedSecurity(env: Environment, deps: SecurityDependencies) {
  const started = performance.now();
  let config: ProtectedConfig;
  try {
    const parsed = loadSecurityConfig(env);
    if (parsed.mode !== "protected") throw new SecurityFailure("CONFIG_INVALID");
    config = parsed;
  } catch {
    reportSecurity(deps.log, "startup", "CONFIG_INVALID", started);
    throw new SecurityFailure("CONFIG_INVALID");
  }

  let ring: readonly RingEntry[] = [];
  let refreshInFlight: Promise<void> | undefined;
  async function load(operation: "startup" | "refresh", start: number): Promise<void> {
    try {
      await withDeadline(config.verifyMs, async (signal) => {
        const prior = config.previous;
        const [current, previous] = await Promise.all([
          entry(deps.secrets, config.currentRef, Number.POSITIVE_INFINITY, signal, false),
          prior && prior.until > seconds() ? entry(deps.secrets, prior.ref, prior.until, signal, true) : undefined,
        ]);
        signal.throwIfAborted();
        if (!current || current.version === previous?.version) throw new SecurityFailure("SECRET_INVALID");
        const candidate = previous ? [current, previous] : [current];
        for (const key of candidate) {
          const same = ring.find(({ version }) => version === key.version);
          if (same && (same.material.byteLength !== key.material.byteLength || !timingSafeEqual(same.material, key.material))) {
            throw new SecurityFailure("SECRET_INVALID");
          }
        }
        ring = Object.freeze(candidate);
      });
      reportSecurity(deps.log, operation, "ACCEPTED", start);
    } catch (error) {
      reportSecurity(deps.log, operation, error instanceof SecurityFailure ? error.reason : "UNAVAILABLE", start);
      throw error;
    }
  }
  await load("startup", started);

  function refresh(): Promise<void> {
    refreshInFlight ??= load("refresh", performance.now()).finally(() => { refreshInFlight = undefined; });
    return refreshInFlight;
  }

  function authenticate(credential: string, transport: Transport, parent?: AbortSignal): Promise<Authenticated> {
    return withDeadline(config.verifyMs, async (signal) => {
      const trusted = (await Promise.all(ring.map(async (key) =>
        await authorizedVersion(deps.secrets, key, signal) ? key : undefined
      ))).filter((key): key is RingEntry => key !== undefined);
      signal.throwIfAborted();
      if (!trusted.length) throw new SecurityFailure("CREDENTIAL_DENIED");
      const verified = await deps.provider.verify({
        credential, transport, issuer: config.issuer, audience: config.audience, purpose: "tenant-session",
        trustedKeys: Object.freeze(trusted.map(({ version, validUntil, material }) => Object.freeze({
          version, validUntil, material: Uint8Array.from(material),
        }))),
      }, signal);
      signal.throwIfAborted();
      if (verified?.status === "denied") throw new SecurityFailure("CREDENTIAL_DENIED");
      if (verified?.status !== "verified") throw new SecurityFailure("UNAVAILABLE");
      const identity = { ...verified.identity };
      if (!validIdentity(identity, config, transport, seconds())) throw new SecurityFailure("CREDENTIAL_DENIED");
      const selected = trusted.find((key) => key.version === identity.keyVersion);
      if (!selected) throw new SecurityFailure("CREDENTIAL_DENIED");

      const binding = Object.freeze({ issuer: config.issuer, providerSubject: identity.providerSubject, sessionId: identity.sessionId });
      const session = await deps.session(binding, signal);
      signal.throwIfAborted();
      if (session?.status === "denied") throw new SecurityFailure("SESSION_DENIED");
      if (session?.status !== "active") throw new SecurityFailure("UNAVAILABLE");
      if (!validSession(session, binding, config, transport)) throw new SecurityFailure("SESSION_DENIED");
      const { subject, expiresAt, csrfDigest } = session;

      const memberships = await deps.memberships(subject, signal);
      signal.throwIfAborted();
      if (!Array.isArray(memberships) || memberships.some((item) => !opaqueId(item?.id) || !opaqueId(item?.tenantId))) {
        throw new SecurityFailure("UNAVAILABLE");
      }
      const membershipsSnapshot = Object.freeze(memberships.map(({ id, tenantId }) => Object.freeze({ id, tenantId })));
      const stillCurrent = ring.find(({ version }) => version === selected.version);
      if (!stillCurrent || !await authorizedVersion(deps.secrets, stillCurrent, signal)
          || !ring.includes(stillCurrent) || identity.expiresAt <= seconds()) {
        throw new SecurityFailure("CREDENTIAL_DENIED");
      }
      if (expiresAt <= seconds()) throw new SecurityFailure("SESSION_DENIED");

      return Object.freeze({
        principal: Object.freeze({
          subject, sessionId: binding.sessionId, memberships: membershipsSnapshot,
        }),
        csrfDigest,
      });
    }, parent);
  }

  return Object.freeze({ config, authenticate, refresh });
}

export type ProtectedSecurity = Awaited<ReturnType<typeof initializeProtectedSecurity>>;
