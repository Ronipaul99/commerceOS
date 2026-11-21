import { z } from "zod";

const optionalSecret = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");
const money = z.coerce.number().int().min(0).max(100000000);
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    API_HOST: z.string().default("127.0.0.1"),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.url().refine((value) => {
      try {
        return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }),
    ADMIN_SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
    SMTP_HOST: optionalSecret(z.string().min(1)),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: bool,
    SMTP_USER: optionalSecret(z.string().min(1)),
    SMTP_PASSWORD: optionalSecret(z.string().min(1)),
    SMTP_FROM: optionalSecret(z.email()),
    ADMIN_OTP_SECRET: optionalSecret(z.string().min(32)),
    STORAGE_ADAPTER: z.enum(["local", "oci"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().min(1).default("var/uploads"),
    OCI_S3_ENDPOINT: optionalSecret(
      z.url().refine((v) => {
        const u = new URL(v);
        return (
          u.protocol === "https:" &&
          !u.username &&
          !u.password &&
          u.pathname === "/" &&
          !u.search &&
          !u.hash
        );
      }),
    ),
    OCI_REGION: optionalSecret(z.string().min(1)),
    OCI_BUCKET: optionalSecret(z.string().min(1)),
    OCI_ACCESS_KEY_ID: optionalSecret(z.string().min(1)),
    OCI_SECRET_ACCESS_KEY: optionalSecret(z.string().min(16)),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:3000")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(
        z.array(
          z.url().refine((value) => {
            try {
              const url = new URL(value);
              return (
                ["http:", "https:"].includes(url.protocol) &&
                url.origin === value
              );
            } catch {
              return false;
            }
          }, "Use an exact HTTP(S) origin without a path or trailing slash"),
        ),
      ),
    PAYMENT_ADAPTER: z.enum(["disabled", "development", "razorpay"]).optional(),
    RAZORPAY_KEY_ID: optionalSecret(
      z.string().regex(/^rzp_test_[A-Za-z0-9]+$/),
    ),
    RAZORPAY_KEY_SECRET: optionalSecret(z.string().min(16)),
    RAZORPAY_WEBHOOK_SECRET: optionalSecret(z.string().min(16)),
    SHIPPING_FEE_PAISE: money.default(9900),
    FREE_SHIPPING_THRESHOLD_PAISE: money.default(199900),
    SERVICEABLE_PIN_CODES: z
      .string()
      .default("")
      .transform((v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.string().regex(/^[1-9][0-9]{5}$/))),
    COD_ENABLED: bool,
    TAX_BPS: z.coerce.number().int().min(0).max(10000).default(0),
    TAX_MODE: z.enum(["inclusive", "exclusive"]).default("inclusive"),
    RESERVATION_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .transform((v) => ({
    ...v,
    PAYMENT_ADAPTER:
      v.PAYMENT_ADAPTER ??
      (v.RAZORPAY_KEY_ID
        ? "razorpay"
        : v.NODE_ENV === "production"
          ? "disabled"
          : "development"),
  }))
  .superRefine((v, ctx) => {
    if (
      v.STORAGE_ADAPTER === "oci" &&
      (!v.OCI_S3_ENDPOINT ||
        !v.OCI_REGION ||
        !v.OCI_BUCKET ||
        !v.OCI_ACCESS_KEY_ID ||
        !v.OCI_SECRET_ACCESS_KEY)
    )
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_ADAPTER"],
        message: "OCI configuration is required",
      });
    if (v.NODE_ENV === "production" && v.PAYMENT_ADAPTER === "development")
      ctx.addIssue({
        code: "custom",
        path: ["PAYMENT_ADAPTER"],
        message: "Development payments are forbidden in production",
      });
    if (
      v.PAYMENT_ADAPTER === "razorpay" &&
      (!v.RAZORPAY_KEY_ID ||
        !v.RAZORPAY_KEY_SECRET ||
        !v.RAZORPAY_WEBHOOK_SECRET)
    )
      ctx.addIssue({
        code: "custom",
        path: ["RAZORPAY_KEY_ID"],
        message: "All test credentials are required",
      });
  });

export type ApiConfig = z.infer<typeof envSchema>;
export function parseEnv(
  source: Record<string, string | undefined>,
): ApiConfig {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Report names only. Zod issue details can contain sensitive input.
    throw new Error(
      `Invalid API environment: ${[...new Set(result.error.issues.map((issue) => issue.path.join(".")))].join(", ")}`,
    );
  }
  return result.data;
}
