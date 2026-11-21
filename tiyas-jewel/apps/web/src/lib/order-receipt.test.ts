import { describe, expect, it } from "vitest";
import type { OrderView } from "@tiyas/shared";
import { createOrderReceipt } from "./order-receipt";
const order: OrderView = {
  orderNumber: "TJ-RECEIPT-TEST",
  createdAt: "2026-11-21T10:00:00.000Z",
  completedAt: null,
  customer: {
    fullName: '<img src=x onerror="alert(1)">',
    email: "guest@example.test",
    mobile: "9876543210",
  },
  address: {
    line1: "12 Garden Road",
    line2: "",
    landmark: "",
    city: "Mumbai",
    state: "Maharashtra",
    pinCode: "400001",
    country: "IN",
  },
  items: [
    {
      productId: "test",
      variantId: null,
      slug: "test",
      name: "Jewellery & <script>bad()</script>",
      variant: null,
      sku: "SKU-1",
      image: null,
      concept: false,
      quantity: 2,
      unitPricePaise: 10001,
      lineTotalPaise: 20002,
    },
  ],
  subtotalPaise: 20002,
  shippingPaise: 9900,
  taxPaise: 0,
  discountPaise: 0,
  totalPaise: 29902,
  taxMode: "inclusive",
  taxBps: 0,
  currency: "INR",
  paymentMethod: "ONLINE",
  paymentStatus: "PAID",
  operationalStatus: "NEW",
  accepted: true,
  needsReview: false,
  reservationExpiresAt: null,
  paymentAdapter: "development",
  gatewayOrderId: null,
  keyId: null,
};
describe("Private order receipt", () => {
  it("escapes personal and product data and includes exact snapshot amounts without an access token", () => {
    const receipt = createOrderReceipt({
      ...order,
      confirmationToken: "PRIVATE_TOKEN_MUST_NOT_APPEAR",
    } as OrderView);
    expect(receipt).toContain("&lt;img");
    expect(receipt).toContain("&lt;script&gt;bad()");
    expect(receipt).not.toContain("<img src=x");
    expect(receipt).not.toContain("PRIVATE_TOKEN_MUST_NOT_APPEAR");
    expect(receipt).toContain("₹299.02");
    expect(receipt).toContain("₹100.01");
    expect(receipt).toContain("Not a tax invoice");
    expect(receipt).toContain("no money collected");
  });
  it("describes COD as money due instead of claiming a paid order", () => {
    const receipt = createOrderReceipt({
      ...order,
      paymentMethod: "COD",
      paymentStatus: "COD_PENDING",
    });
    expect(receipt).toContain("payment due on delivery");
    expect(receipt).not.toContain("Online payment verified");
  });
  it("refuses receipts for pending, failed and unaccepted review cases", () => {
    for (const paymentStatus of ["PENDING", "FAILED", "PAID"] as const)
      expect(() =>
        createOrderReceipt({
          ...order,
          paymentStatus,
          accepted: false,
          needsReview: paymentStatus === "PAID",
        }),
      ).toThrow("accepted orders");
  });
});
