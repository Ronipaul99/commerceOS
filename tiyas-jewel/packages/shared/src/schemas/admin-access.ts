import { z } from "zod";
import { adminPasswordSchema } from "./admin.js";
export const adminRoleSchema = z.enum(["OWNER", "ADMIN", "CONTENT_MANAGER"]);
export const otpRequestSchema = z
  .object({
    email: z.email().trim().toLowerCase().max(254),
    purpose: z.enum(["RESET", "INVITE"]),
  })
  .strict();
export const otpCompleteSchema = otpRequestSchema
  .extend({
    code: z.string().regex(/^\d{6}$/, "Enter the six-digit code"),
    password: adminPasswordSchema,
  })
  .strict();
export const adminUserInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.email().trim().toLowerCase().max(254),
    role: z.enum(["ADMIN", "CONTENT_MANAGER"]),
    active: z.boolean(),
    message: z.string().trim().max(500).default(""),
  })
  .strict();
export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: adminRoleSchema,
  active: z.boolean(),
  invited: z.boolean(),
  createdAt: z.iso.datetime(),
});
export const adminUsersResponseSchema = z.object({
  data: z.array(adminUserSchema),
});
export const adminUserResponseSchema = z.object({ data: adminUserSchema });
export const adminUserUpdateSchema = z
  .object({ role: z.enum(["ADMIN", "CONTENT_MANAGER"]), active: z.boolean() })
  .strict();
export type AdminRole = z.infer<typeof adminRoleSchema>;
