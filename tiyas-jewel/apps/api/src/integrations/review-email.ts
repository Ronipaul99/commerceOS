import nodemailer from "nodemailer";
import type { ApiConfig } from "../config/env.js";
import { AdminError } from "../modules/admin/errors.js";
export interface ReviewEmail {
  available?: boolean;
  sendCode(email: string, code: string): Promise<void>;
}
export function reviewEmail(config: ApiConfig): ReviewEmail {
  return {
    available: Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASSWORD && config.SMTP_FROM),
    async sendCode(email, code) {
      if (
        !config.SMTP_HOST ||
        !config.SMTP_USER ||
        !config.SMTP_PASSWORD ||
        !config.SMTP_FROM
      )
        throw new AdminError(
          "EMAIL_UNAVAILABLE",
          "Review email verification is temporarily unavailable.",
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
        const sent = await transport.sendMail({
          from: config.SMTP_FROM,
          to: email,
          subject: "Your Tiyas Jewel review verification code",
          text: `Your review verification code is ${code}. It expires in ten minutes. This verifies your email for customer feedback only, not a purchase or an admin login. If you did not request it, ignore this message.`,
        });
        if (!sent.accepted.length) throw new Error("Not accepted");
      } catch {
        throw new AdminError(
          "EMAIL_UNAVAILABLE",
          "The verification email could not be delivered. Please try again later.",
          503,
        );
      } finally {
        transport.close();
      }
    },
  };
}
