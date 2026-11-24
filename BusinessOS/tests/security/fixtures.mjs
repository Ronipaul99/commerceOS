import { Buffer } from "node:buffer";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const issuer = "https://issuer.businessos.invalid";
export const audience = "businessos-tenant-fixture";
export const origin = "https://browser.businessos.invalid";
export const currentRef = "fixtures/session/current";
export const previousRef = "fixtures/session/previous";
export const now = () => Math.floor(Date.now() / 1000);

export function environment(overrides = {}) {
  return {
    NODE_ENV: "test",
    BUSINESSOS_AUTH_MODE: "protected",
    BUSINESSOS_AUTH_ISSUER: issuer,
    BUSINESSOS_AUTH_AUDIENCE: audience,
    BUSINESSOS_AUTH_TRANSPORT: "bearer",
    BUSINESSOS_AUTH_HTTPS: "loopback-test",
    BUSINESSOS_AUTH_CURRENT_REF: currentRef,
    ...overrides,
  };
}

export function makeKey(version) {
  return { version, material: randomBytes(32), validUntil: now() + 900 };
}

export function createFixtures() {
  const old = makeKey("version-1");
  const previous = makeKey("version-0");
  const slots = new Map([[currentRef, old], [previousRef, previous]]);
  const marker = randomBytes(16).toString("hex");
  const revokedKeys = new Set();
  const sessions = new Map();
  const logs = [];
  const resolution = [];
  let reads = 0;
  for (const actor of ["a", "b"]) {
    for (const transport of ["bearer", "cookie"]) {
      const sessionId = "session-" + actor + "-" + transport;
      const csrf = randomBytes(32).toString("base64url");
      const subject = "fictional-" + actor;
      sessions.set(sessionId, {
        status: "active", binding: { issuer, providerSubject: "provider-" + actor, sessionId },
        subject, purpose: "tenant-session", transport, assurance: "standard", expiresAt: now() + 900,
        csrf, csrfDigest: createHash("sha256").update(csrf).digest("hex"),
      });
    }
  }
  const deps = {
    secrets: {
      async resolve(reference, purpose) {
        resolution.push({ reference, purpose });
        const found = slots.get(reference);
        if (!found) return { status: "missing" };
        if (revokedKeys.has(found.version)) return { status: "revoked" };
        return { status: "available", secret: found };
      },
      async versionStatus(_reference, _purpose, version) {
        return revokedKeys.has(version) ? "revoked" : "active";
      },
    },
    provider: {
      async verify({ credential, trustedKeys }) {
        const [body, tag, ...extra] = credential.split(".");
        if (!body || !tag || extra.length) return { status: "denied" };
        let identity;
        try { identity = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch {
          return { status: "denied" };
        }
        if (!identity || typeof identity !== "object") return { status: "denied" };
        const key = trustedKeys.find(({ version }) => version === identity.keyVersion);
        if (!key) return { status: "denied" };
        const digest = createHmac("sha256", key.material).update(body).digest();
        const actual = Buffer.from(tag, "base64url");
        return actual.length === digest.length && timingSafeEqual(actual, digest)
          && actual.toString("base64url") === tag ? { status: "verified", identity } : { status: "denied" };
      },
    },
    async session({ sessionId }) {
      reads++;
      return sessions.get(sessionId) ?? { status: "denied" };
    },
    async memberships(subject) {
      const actor = subject === "fictional-a" ? "a" : subject === "fictional-b" ? "b" : undefined;
      return actor ? [{ id: "membership-" + actor, tenantId: "tenant-" + actor }] : undefined;
    },
    log: (entry) => logs.push(entry),
  };

  function credential(actor, transport = "bearer", key = old, claims = {}) {
    const issuedAt = now() - 1;
    const identity = {
      issuer, audience, purpose: "tenant-session", transport, providerSubject: "provider-" + actor,
      sessionId: "session-" + actor + "-" + transport, keyVersion: key.version,
      issuedAt, expiresAt: issuedAt + 600, assurance: "standard", ...claims,
    };
    const body = Buffer.from(JSON.stringify(identity)).toString("base64url");
    return body + "." + createHmac("sha256", key.material).update(body).digest("base64url");
  }

  return { deps, old, previous, slots, sessions, revokedKeys, logs, resolution, marker, credential, reads: () => reads };
}
