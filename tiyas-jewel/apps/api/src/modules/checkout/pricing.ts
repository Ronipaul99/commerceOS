import { createHash } from "node:crypto";
import type { OrderLine } from "@tiyas/shared";
import type { ApiConfig } from "../../config/env.js";
import { CheckoutError } from "./errors.js";
export const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
function roundRatio(value: number, numerator: number, denominator: number) {
  return Number(
    (BigInt(value) * BigInt(numerator) + BigInt(Math.floor(denominator / 2))) /
      BigInt(denominator),
  );
}
export function calculateTotals(
  subtotalPaise: number,
  config: ApiConfig,
  discountPaise = 0,
) {
  if (
    !Number.isSafeInteger(subtotalPaise) ||
    subtotalPaise < 1 ||
    subtotalPaise > 100000000
  )
    throw new CheckoutError(
      "ORDER_LIMIT",
      "Please keep your order total below INR 10,00,000.",
    );
  const shippingPaise =
    subtotalPaise >= config.FREE_SHIPPING_THRESHOLD_PAISE
      ? 0
      : config.SHIPPING_FEE_PAISE;
  if (
    !Number.isSafeInteger(discountPaise) ||
    discountPaise < 0 ||
    discountPaise > subtotalPaise
  )
    throw new CheckoutError("INVALID_DISCOUNT", "The discount is invalid.");
  const taxPaise = roundRatio(
    subtotalPaise - discountPaise,
    config.TAX_BPS,
    config.TAX_MODE === "inclusive" ? 10000 + config.TAX_BPS : 10000,
  );
  const totalPaise =
    subtotalPaise -
    discountPaise +
    shippingPaise +
    (config.TAX_MODE === "exclusive" ? taxPaise : 0);
  if (totalPaise > 100000000)
    throw new CheckoutError(
      "ORDER_LIMIT",
      "The order exceeds the checkout amount limit.",
    );
  return {
    subtotalPaise,
    shippingPaise,
    taxPaise,
    discountPaise,
    totalPaise,
    taxBps: config.TAX_BPS,
    taxMode: config.TAX_MODE,
    currency: "INR" as const,
  };
}
export function quoteFingerprint(
  items: OrderLine[],
  pinCode: string,
  totals: ReturnType<typeof calculateTotals>,
  config: ApiConfig,
) {
  return hash(
    JSON.stringify({
      items,
      pinCode,
      totals,
      cod: config.COD_ENABLED,
      adapter: config.PAYMENT_ADAPTER,
    }),
  );
}
