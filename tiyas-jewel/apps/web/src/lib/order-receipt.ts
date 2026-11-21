import type { OrderView } from "@tiyas/shared";
import { formatINR } from "./money";

const escape = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

/** A local, self-contained order record. Never a fabricated tax invoice. */
export function createOrderReceipt(order: OrderView) {
  if (!order.accepted) throw new Error("Only accepted orders have a receipt.");
  const date = order.createdAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(order.createdAt)) + " IST"
    : "";
  const payment =
    order.paymentMethod === "COD"
      ? "Cash on delivery — payment due on delivery"
      : order.paymentAdapter === "development"
        ? "Development payment — no money collected"
        : "Online payment verified";
  const address = [
    order.customer.fullName,
    order.address.line1,
    order.address.line2,
    order.address.landmark,
    `${order.address.city}, ${order.address.state} ${order.address.pinCode}`,
    "India",
    `+91 ${order.customer.mobile}`,
    order.customer.email,
  ]
    .filter(Boolean)
    .map(escape)
    .join("<br>");
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${escape(item.name)}${item.variant ? `<br><small>${escape(item.variant)}</small>` : ""}${item.sku ? `<br><small>SKU: ${escape(item.sku)}</small>` : ""}</td><td>${item.quantity}</td><td>${escape(formatINR(item.unitPricePaise))}</td><td>${escape(formatINR(item.lineTotalPaise))}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Tiyas Jewel — ${escape(order.orderNumber)}</title><style>body{margin:0;background:#fff9f4;color:#30201d;font:15px/1.6 Arial,sans-serif}main{max-width:850px;padding:36px;margin:auto}h1,h2{color:#650f2a}h1{font-size:28px;margin-bottom:0}h2{font-size:18px}p{overflow-wrap:anywhere}address{font-style:normal}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:12px 8px;border-bottom:1px solid #eaded7;text-align:left;vertical-align:top}td:nth-child(n+2),th:nth-child(n+2){text-align:right}small{color:#776a64}dl{max-width:380px;margin-left:auto}dl div{display:flex;justify-content:space-between;gap:20px;padding:6px 0}dd{margin:0;white-space:nowrap}button{background:#650f2a;color:white;padding:12px 20px;border:0;border-radius:6px;cursor:pointer}footer{border-top:1px solid #eaded7;padding-top:16px;font-size:12px}@media print{body{background:white}main{padding:0}button{display:none}tr{break-inside:avoid}thead{display:table-header-group}}@media(max-width:480px){main{padding:20px}table{font-size:11px}th,td{padding:8px 3px}}</style></head><body><main><h1>TIYAS JEWEL</h1><p>Order receipt · Not a tax invoice</p><p><strong>${escape(order.orderNumber)}</strong><br>${escape(date)}</p><p>${escape(payment)}</p><h2>Delivery address</h2><address>${address}</address><h2>Your pieces</h2><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><dl><div><dt>Subtotal</dt><dd>${escape(formatINR(order.subtotalPaise))}</dd></div><div><dt>Shipping</dt><dd>${escape(formatINR(order.shippingPaise))}</dd></div><div><dt>Tax${order.taxMode === "inclusive" ? " (included)" : ""}</dt><dd>${escape(formatINR(order.taxPaise))}</dd></div><div><dt><strong>${order.paymentMethod === "COD" ? "Due on delivery" : "Order total"}</strong></dt><dd><strong>${escape(formatINR(order.totalPaise))}</strong></dd></div></dl><footer><p>This is a private order record. Fulfillment status: ${escape(order.operationalStatus ?? "NEW")}. Fulfillment completion is not a courier delivery confirmation.</p><button onclick="window.print()">Print or save as PDF</button></footer></main></body></html>`;
}
