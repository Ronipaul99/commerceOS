import nodemailer from "nodemailer";
import type { ApiConfig } from "../config/env.js";
import { AdminError } from "../modules/admin/errors.js";
export interface AdminEmail {
  sendOtp(
    email: string,
    code: string,
    purpose: "RESET" | "INVITE",
    message?: string,
  ): Promise<void>;
}
export function adminEmail(config: ApiConfig): AdminEmail {
  return {
    async sendOtp(email, code, purpose, message) {
      if (
        !config.SMTP_HOST ||
        !config.SMTP_USER ||
        !config.SMTP_PASSWORD ||
        !config.SMTP_FROM ||
        !config.ADMIN_OTP_SECRET
      )
        throw new AdminError(
          "EMAIL_UNAVAILABLE",
          "Email delivery is not configured. Contact the store owner.",
          503,
        );
      const transport = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        requireTLS: !config.SMTP_SECURE,
        auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        disableFileAccess: true,
        disableUrlAccess: true,
        logger: false,
        debug: false,
      });
      try {
        const result = await transport.sendMail({
          from: config.SMTP_FROM,
          to: email,
          subject:
            purpose === "RESET"
              ? "Tiyas Jewel password reset code"
              : "Your Tiyas Jewel admin invitation",
          text: `${message ? `${message}\n\n` : ""}Your Tiyas Jewel ${purpose === "RESET" ? "password reset" : "admin invitation"} code is ${code}.\n\nEnter it at ${config.CORS_ORIGINS[0] ?? ""}/admin/${purpose === "RESET" ? "forgot-password" : "accept-invitation"}.\n\nIt expires in 10 minutes and can only be used once. Do not share this code. If you did not request it, ignore this email.`,
        });
        if (!result.accepted.length) throw Error("Recipient not accepted");
      } catch {
        throw new AdminError(
          "EMAIL_UNAVAILABLE",
          "Email could not be sent. Please try again shortly.",
          503,
        );
      } finally {
        transport.close();
      }
    },
  };
}
