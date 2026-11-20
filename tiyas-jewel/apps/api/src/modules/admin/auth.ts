import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ApiConfig } from "../../config/env.js";
import { AdminError } from "./errors.js";

const cost = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, cost, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$131072$8$1$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, hash?: string) {
  const parts = hash?.split("$");
  const valid =
    parts?.length === 6 &&
    parts[0] === "scrypt" &&
    parts[1] === "131072" &&
    parts[2] === "8" &&
    parts[3] === "1" &&
    /^[a-f0-9]{32}$/.test(parts[4]!) &&
    /^[a-f0-9]{128}$/.test(parts[5]!);
  const derived = await derive(
    password,
    valid ? Buffer.from(parts![4]!, "hex") : Buffer.alloc(16),
  );
  return (
    timingSafeEqual(
      derived,
      valid ? Buffer.from(parts![5]!, "hex") : Buffer.alloc(64),
    ) && Boolean(valid)
  );
}
export const cookieName = (config: ApiConfig) =>
  config.NODE_ENV === "production" ? "__Host-tiyas_admin" : "tiyas_admin";
export const csrfFor = (token: string) => digest(`tiyas-admin-csrf:${token}`);
declare module "fastify" {
  interface FastifyRequest {
    admin: {
      id: string;
      email: string;
      sessionId: string;
      expiresAt: Date;
      csrfToken: string;
    } | null;
  }
}
export function adminAuth(app: FastifyInstance, config: ApiConfig) {
  const settings = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
  function checkOrigin(req: FastifyRequest) {
    if (
      req.headers["sec-fetch-site"] === "cross-site" ||
      (req.headers.origin && !config.CORS_ORIGINS.includes(req.headers.origin))
    )
      throw new AdminError(
        "ORIGIN_DENIED",
        "Request origin is not allowed.",
        403,
      );
  }
  async function session(req: FastifyRequest) {
    const token = req.cookies[cookieName(config)];
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const entry = await app.db.adminSession.findUnique({
      where: { tokenHash: digest(token) },
      include: { admin: true },
    });
    if (!entry || entry.expiresAt <= new Date() || !entry.admin.active)
      return null;
    return {
      id: entry.adminId,
      email: entry.admin.email,
      sessionId: entry.id,
      expiresAt: entry.expiresAt,
      csrfToken: csrfFor(token),
    };
  }
  async function requireAdmin(req: FastifyRequest) {
    checkOrigin(req);
    req.admin = await session(req);
    if (!req.admin)
      throw new AdminError("UNAUTHORIZED", "Please sign in to continue.", 401);
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const actual = req.headers["x-csrf-token"];
      if (
        typeof actual !== "string" ||
        !/^[a-f0-9]{64}$/.test(actual) ||
        !timingSafeEqual(Buffer.from(actual), Buffer.from(req.admin.csrfToken))
      )
        throw new AdminError(
          "CSRF_DENIED",
          "Refresh the page and try again.",
          403,
        );
    }
  }
  async function login(
    req: FastifyRequest,
    reply: FastifyReply,
    email: string,
    password: string,
  ) {
    checkOrigin(req);
    const admin = await app.db.adminUser.findUnique({ where: { email } });
    const matches = await verifyPassword(password, admin?.passwordHash);
    if (!matches || !admin?.active)
      throw new AdminError(
        "LOGIN_FAILED",
        "Email or password is incorrect.",
        401,
      );
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + config.ADMIN_SESSION_HOURS * 3600000,
    );
    await app.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AdminUser" WHERE id=${admin.id} FOR UPDATE`;
      const current = await tx.adminUser.findUnique({
        where: { id: admin.id },
      });
      if (!current?.active || current.passwordHash !== admin.passwordHash)
        throw new AdminError(
          "LOGIN_FAILED",
          "Email or password is incorrect.",
          401,
        );
      // Rotate all prior sessions on login; single store owner, no public registration.
      await tx.adminSession.deleteMany({
        where: {
          OR: [{ adminId: admin.id }, { expiresAt: { lte: new Date() } }],
        },
      });
      await tx.adminSession.create({
        data: { adminId: admin.id, tokenHash: digest(token), expiresAt },
      });
    });
    reply.setCookie(cookieName(config), token, {
      ...settings,
      expires: expiresAt,
      maxAge: config.ADMIN_SESSION_HOURS * 3600,
    });
    return {
      data: {
        email: admin.email,
        csrfToken: csrfFor(token),
        expiresAt: expiresAt.toISOString(),
      },
    };
  }
  async function logout(req: FastifyRequest, reply: FastifyReply) {
    await app.db.adminSession.deleteMany({
      where: { id: req.admin!.sessionId },
    });
    reply.clearCookie(cookieName(config), settings);
    return { data: { ok: true } };
  }
  return { checkOrigin, session, requireAdmin, login, logout };
}
