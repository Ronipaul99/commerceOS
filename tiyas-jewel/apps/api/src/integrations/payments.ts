import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ApiConfig } from "../config/env.js";
import { CheckoutError } from "../modules/checkout/errors.js";
export function validSignature(
  message: string | Buffer,
  signature: string,
  secret: string,
) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
const gatewayOrderSchema = z.object({
  id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  amount: z.number().int(),
  currency: z.string(),
  receipt: z.string(),
  status: z.string(),
});
const gatewayPaymentSchema = z.object({
  id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  order_id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
});
export type GatewayOrder = z.infer<typeof gatewayOrderSchema>;
export type GatewayPayment = z.infer<typeof gatewayPaymentSchema>;
export interface PaymentGateway {
  createOrder(amount: number, receipt: string): Promise<GatewayOrder>;
  findOrder(receipt: string): Promise<GatewayOrder | null>;
  getOrder(id: string): Promise<GatewayOrder>;
  getPayment(id: string): Promise<GatewayPayment>;
  payments(orderId: string): Promise<GatewayPayment[]>;
}
export function razorpayGateway(
  config: ApiConfig,
  fetcher = fetch,
): PaymentGateway {
  async function call(path: string, body?: unknown): Promise<unknown> {
    try {
      const response = await fetcher(`https://api.razorpay.com/v1${path}`, {
        method: body ? "POST" : "GET",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) throw new Error("Gateway rejected request");
      return await response.json();
    } catch {
      throw new CheckoutError(
        "PAYMENT_UNAVAILABLE",
        "The payment provider could not be reached. Your payment status can be checked again safely.",
        503,
      );
    }
  }
  return {
    createOrder: async (amount, receipt) =>
      gatewayOrderSchema.parse(
        await call("/orders", {
          amount,
          currency: "INR",
          receipt,
          partial_payment: false,
        }),
      ),
    async findOrder(receipt) {
      const result = z
        .object({ items: z.array(gatewayOrderSchema) })
        .parse(
          await call(
            `/orders?${new URLSearchParams({ receipt, count: "100" })}`,
          ),
        );
      const matches = result.items.filter((o) => o.receipt === receipt);
      if (matches.length > 1)
        throw new CheckoutError(
          "PAYMENT_REVIEW",
          "This payment attempt requires review.",
          503,
        );
      return matches[0] ?? null;
    },
    getOrder: async (id) =>
      gatewayOrderSchema.parse(await call(`/orders/${encodeURIComponent(id)}`)),
    getPayment: async (id) =>
      gatewayPaymentSchema.parse(
        await call(`/payments/${encodeURIComponent(id)}`),
      ),
    payments: async (id) =>
      z
        .object({ items: z.array(gatewayPaymentSchema) })
        .parse(await call(`/orders/${encodeURIComponent(id)}/payments`)).items,
  };
}
