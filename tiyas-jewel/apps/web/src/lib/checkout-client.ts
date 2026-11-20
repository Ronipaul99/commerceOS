import { z } from "zod";
import {
  apiErrorSchema,
  checkoutQuoteSchema,
  orderViewSchema,
  type CartItemRef,
  type CheckoutRequest,
} from "@tiyas/shared";
export class CheckoutClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}
async function post<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(20000),
  });
  const json: unknown = await response.json();
  if (!response.ok) {
    const result = apiErrorSchema.safeParse(json);
    throw new CheckoutClientError(
      result.success ? result.data.error.code : "REQUEST_FAILED",
      result.success
        ? result.data.error.message
        : "The request could not be completed. Please try again.",
      result.success ? (result.data.error.issues ?? []) : [],
    );
  }
  return schema.parse(json);
}
export const checkoutApi = {
  quote: (items: CartItemRef[], pinCode: string, signal?: AbortSignal) =>
    post("checkout/quote", { items, pinCode }, checkoutQuoteSchema, signal),
  place: (input: CheckoutRequest) =>
    post("checkout/place", input, orderViewSchema),
  confirmation: (token: string) =>
    post("orders/confirmation", { token }, orderViewSchema),
  reconcile: (token: string) =>
    post("checkout/reconcile", { token }, orderViewSchema),
  verify: (
    token: string,
    response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) => post("checkout/verify", { token, ...response }, orderViewSchema),
  development: (token: string, outcome: "success" | "failure") =>
    post("checkout/development-payment", { token, outcome }, orderViewSchema),
};
export const pendingCheckoutKey = "tiyas.checkout.pending.v1";
const pendingSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.uuid(),
});
export function readPendingCheckout() {
  try {
    return pendingSchema.parse(
      JSON.parse(sessionStorage.getItem(pendingCheckoutKey) ?? "null"),
    );
  } catch {
    return null;
  }
}
export function newCheckoutAttempt() {
  const token = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return { token, idempotencyKey: crypto.randomUUID() };
}
