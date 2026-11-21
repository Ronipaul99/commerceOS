import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  close: vi.fn(),
  createTransport: vi.fn(),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}));
import { adminEmail } from "../src/integrations/admin-email.js";
import { parseEnv } from "../src/config/env.js";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.createTransport.mockReturnValue({
    sendMail: mocks.sendMail,
    close: mocks.close,
  });
  mocks.sendMail.mockResolvedValue({ accepted: ["admin@example.test"] });
});
const config = () =>
  parseEnv({
    DATABASE_URL: "postgresql://test:test@127.0.0.1:5433/test",
    SMTP_HOST: "smtp.example.test",
    SMTP_USER: "sender@example.test",
    SMTP_PASSWORD: "local-test-placeholder",
    SMTP_FROM: "sender@example.test",
    ADMIN_OTP_SECRET: "a".repeat(64),
  });
describe("admin SMTP delivery adapter", () => {
  it("fails clearly when SMTP is absent", async () => {
    await expect(
      adminEmail(
        parseEnv({
          DATABASE_URL: "postgresql://test:test@127.0.0.1:5433/test",
        }),
      ).sendOtp("admin@example.test", "123456", "RESET"),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
  it("requires TLS, disables content fetching and sends the actual code", async () => {
    await adminEmail(config()).sendOtp(
      "admin@example.test",
      "123456",
      "INVITE",
      "Welcome to the team",
    );
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.test",
        requireTLS: true,
        disableFileAccess: true,
        disableUrlAccess: true,
        debug: false,
        logger: false,
      }),
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@example.test",
        from: "sender@example.test",
        text: expect.stringContaining("123456"),
      }),
    );
    expect(mocks.sendMail.mock.calls[0]![0].text).toContain(
      "Welcome to the team",
    );
    expect(mocks.close).toHaveBeenCalledOnce();
  });
  it("sanitizes provider errors and closes the connection", async () => {
    mocks.sendMail.mockRejectedValue(Error("secret transport details"));
    await expect(
      adminEmail(config()).sendOtp("admin@example.test", "123456", "RESET"),
    ).rejects.toThrow("Email could not be sent");
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
