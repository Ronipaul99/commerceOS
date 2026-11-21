import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { ApiConfig } from "../../config/env.js";
import type { AdminEmail } from "../../integrations/admin-email.js";
import { AdminError } from "./errors.js";
import { hashPassword } from "./auth.js";
import type { z } from "zod";
import type {
  adminUserInputSchema,
  adminUserUpdateSchema,
} from "@tiyas/shared";
const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  invited: true,
  createdAt: true,
} as const;
const view = (u: { createdAt: Date }) => ({
  ...u,
  createdAt: u.createdAt.toISOString(),
});
export function adminAccess(
  db: PrismaClient,
  config: ApiConfig,
  email: AdminEmail,
) {
  const codeHash = (id: string, code: string) =>
    createHmac("sha256", config.ADMIN_OTP_SECRET!)
      .update(`${id}:${code}`)
      .digest("hex");
  function configured() {
    if (!config.ADMIN_OTP_SECRET)
      throw new AdminError(
        "EMAIL_UNAVAILABLE",
        "Email delivery is not configured. Contact the store owner.",
        503,
      );
  }
  async function send(
    address: string,
    purpose: "RESET" | "INVITE",
    message?: string,
  ) {
    configured();
    const user = await db.adminUser.findUnique({ where: { email: address } });
    if (!user?.active || (purpose === "INVITE" ? !user.invited : user.invited))
      return;
    const code = String(randomInt(0, 1000000)).padStart(6, "0"),
      id = randomUUID();
    const otp = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AdminUser" WHERE id=${user.id} FOR UPDATE`;
      const old = await tx.adminOtp.findUnique({
        where: { adminId_purpose: { adminId: user.id, purpose } },
      });
      if (old && Date.now() - old.createdAt.getTime() < 60000) return null;
      return tx.adminOtp.upsert({
        where: { adminId_purpose: { adminId: user.id, purpose } },
        create: {
          id,
          adminId: user.id,
          purpose,
          codeHash: codeHash(id, code),
          expiresAt: new Date(Date.now() + 600000),
        },
        update: {
          id,
          codeHash: codeHash(id, code),
          attempts: 0,
          expiresAt: new Date(Date.now() + 600000),
          createdAt: new Date(),
        },
      });
    });
    if (!otp) return;
    try {
      await email.sendOtp(address, code, purpose, message);
    } catch (e) {
      await db.adminOtp.deleteMany({ where: { id } });
      throw e;
    }
  }
  async function complete(
    address: string,
    purpose: "RESET" | "INVITE",
    code: string,
    password: string,
  ) {
    configured();
    // Expensive password derivation happens before locks, keeping transactions short.
    const passwordHash = await hashPassword(password);
    const ok = await db.$transaction(async (tx) => {
      const user = await tx.adminUser.findUnique({ where: { email: address } });
      if (!user) return false;
      await tx.$queryRaw`SELECT id FROM "AdminUser" WHERE id=${user.id} FOR UPDATE`;
      const current = await tx.adminUser.findUnique({ where: { id: user.id } });
      const otp = await tx.adminOtp.findUnique({
        where: { adminId_purpose: { adminId: user.id, purpose } },
      });
      if (
        !current?.active ||
        !otp ||
        otp.expiresAt <= new Date() ||
        otp.attempts >= 5 ||
        (purpose === "INVITE" ? !current.invited : current.invited)
      )
        return false;
      const expected = Buffer.from(otp.codeHash, "hex"),
        actual = Buffer.from(codeHash(otp.id, code), "hex");
      if (!timingSafeEqual(expected, actual)) {
        await tx.adminOtp.update({
          where: { id: otp.id },
          data: { attempts: { increment: 1 } },
        });
        return false;
      }
      await tx.adminUser.update({
        where: { id: user.id },
        data: { passwordHash, invited: false },
      });
      await tx.adminOtp.deleteMany({ where: { adminId: user.id } });
      await tx.adminSession.deleteMany({ where: { adminId: user.id } });
      return true;
    });
    if (!ok)
      throw new AdminError(
        "INVALID_OTP",
        "Code is invalid or expired. Request a new code.",
        400,
      );
    return { data: { ok: true } };
  }
  async function list() {
    return {
      data: (
        await db.adminUser.findMany({
          select: publicUser,
          orderBy: { createdAt: "asc" },
        })
      ).map(view),
    };
  }
  async function invite(input: z.infer<typeof adminUserInputSchema>) {
    configured();
    const user = await db.adminUser.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        active: input.active,
        invited: true,
        passwordHash: await hashPassword(randomBytes(48).toString("hex")),
      },
      select: publicUser,
    });
    // The account stays pending if SMTP fails. Owner can resend from its row.
    if (user.active)
      try {
        await send(user.email, "INVITE", input.message);
      } catch {
        throw new AdminError(
          "EMAIL_UNAVAILABLE",
          "The invitation is saved, but email could not be sent. Open Admin Users and resend the invitation after checking SMTP settings.",
          503,
        );
      }
    return { data: view(user) };
  }
  async function update(
    id: string,
    input: z.infer<typeof adminUserUpdateSchema>,
  ) {
    const user = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AdminUser" WHERE id=${id} FOR UPDATE`;
      const existing = await tx.adminUser.findUnique({ where: { id } });
      if (!existing) throw new AdminError("NOT_FOUND", "Admin not found.", 404);
      if (existing.role === "OWNER")
        throw new AdminError(
          "OWNER_PROTECTED",
          "Owner access cannot be changed here.",
          403,
        );
      const updated = await tx.adminUser.update({
        where: { id },
        data: input,
        select: publicUser,
      });
      await tx.adminSession.deleteMany({ where: { adminId: id } });
      await tx.adminOtp.deleteMany({ where: { adminId: id } });
      return updated;
    });
    return { data: view(user) };
  }
  return { send, complete, list, invite, update };
}
