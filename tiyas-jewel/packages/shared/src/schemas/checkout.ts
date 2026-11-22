import { z } from "zod";
import { cartRequestSchema } from "./shopping.js";
import { couponCodeSchema } from "./experience.js";
export const indianStates = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, "Please complete this field.")
    .max(max, "Please shorten this field.")
    .refine(
      (v) => !/[\u0000-\u001f\u007f]/.test(v),
      "Control characters are not allowed",
    );
export const pinCodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, "Enter a valid six-digit PIN code");
export const guestSchema = z
  .object({
    fullName: text(2, 100).refine(
      (v) => /\p{L}/u.test(v),
      "Enter your name, including at least one letter.",
    ),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    mobile: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s()-]/g, "").replace(/^\+91/, ""))
      .pipe(
        z
          .string()
          .regex(/^[6-9][0-9]{9}$/, "Enter a valid Indian mobile number"),
      ),
  })
  .strict();
export const addressSchema = z
  .object({
    line1: text(5, 160),
    line2: text(0, 160).default(""),
    landmark: text(0, 120).default(""),
    city: text(2, 80).refine(
      (v) => /\p{L}/u.test(v),
      "Enter a valid city name.",
    ),
    state: z.enum(indianStates),
    pinCode: pinCodeSchema,
    country: z.literal("IN").default("IN"),
  })
  .strict();
export const checkoutQuoteRequestSchema = z
  .object({
    items: cartRequestSchema.shape.items.min(1),
    pinCode: pinCodeSchema,
    couponCode: couponCodeSchema.optional(),
    customerEmail: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email().max(254))
      .optional(),
    paymentMethod: z.enum(["ONLINE", "COD"]).optional(),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.items.map((i) => i.productId + ":" + (i.variantId ?? "")))
        .size === v.items.length,
    "Duplicate selections are not allowed",
  );
export const confirmationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const amount = z.number().int().min(0).max(100000000);
export const checkoutRequestSchema = checkoutQuoteRequestSchema
  .safeExtend({
    customer: guestSchema,
    address: addressSchema,
    paymentMethod: z.enum(["ONLINE", "COD"]),
    expectedTotalPaise: amount,
    quoteFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    idempotencyKey: z.uuid(),
    confirmationToken: confirmationTokenSchema,
  })
  .strict()
  .refine((v) => v.pinCode === v.address.pinCode, {
    message: "PIN codes must match",
    path: ["address.pinCode"],
  });
export const tokenRequestSchema = z
  .object({ token: confirmationTokenSchema })
  .strict();
export const verificationRequestSchema = tokenRequestSchema
  .extend({
    razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
    razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
    razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const developmentPaymentSchema = tokenRequestSchema
  .extend({ outcome: z.enum(["success", "failure"]) })
  .strict();
export const orderLineSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable(),
  slug: z.string(),
  name: z.string(),
  variant: z.string().nullable(),
  sku: z.string().nullable(),
  image: z.string().nullable(),
  concept: z.boolean(),
  quantity: z.number().int().min(1).max(99),
  unitPricePaise: amount,
  lineTotalPaise: amount,
  discountPaise: amount.optional(),
});
export const totalsSchema = z.object({
  subtotalPaise: amount,
  shippingPaise: amount,
  taxPaise: amount,
  discountPaise: amount.default(0),
  couponCode: z.string().nullable().optional(),
  totalPaise: amount,
  taxMode: z.enum(["inclusive", "exclusive"]),
  taxBps: z.number().int().min(0).max(10000),
  currency: z.literal("INR"),
});
export const checkoutQuoteSchema = z.object({
  data: totalsSchema.extend({
    items: z.array(orderLineSchema),
    fingerprint: z.string(),
    codEnabled: z.boolean(),
    paymentAdapter: z.enum(["disabled", "development", "razorpay"]),
    freeShippingThresholdPaise: amount.nullable(),
    reservationMinutes: z.number(),
  }),
});
export const orderViewSchema = z.object({
  data: totalsSchema.extend({
    orderNumber: z.string(),
    createdAt: z.iso.datetime().optional(),
    completedAt: z.iso.datetime().nullable().optional(),
    customer: guestSchema,
    address: addressSchema,
    items: z.array(orderLineSchema),
    paymentMethod: z.enum(["ONLINE", "COD"]),
    paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "COD_PENDING"]),
    operationalStatus: z.enum(["NEW", "COMPLETED"]).nullable(),
    accepted: z.boolean(),
    needsReview: z.boolean(),
    reservationExpiresAt: z.string().nullable(),
    paymentAdapter: z.enum(["disabled", "development", "razorpay"]),
    gatewayOrderId: z.string().nullable(),
    keyId: z.string().nullable(),
  }),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>["data"];
export type OrderView = z.infer<typeof orderViewSchema>["data"];
export type OrderLine = z.infer<typeof orderLineSchema>;
