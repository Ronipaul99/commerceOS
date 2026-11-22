import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import {
  addressSchema,
  type CartItemRef,
  type CheckoutRequest,
  type OrderLine,
  type OrderView,
} from "@tiyas/shared";
import type { ApiConfig } from "../../config/env.js";
import {
  type GatewayOrder,
  type GatewayPayment,
  type PaymentGateway,
  razorpayGateway,
  validSignature,
} from "../../integrations/payments.js";
import { CheckoutError } from "./errors.js";
import { calculateTotals, hash, quoteFingerprint } from "./pricing.js";
import { resolveCoupon, couponIdentity } from "../coupons/service.js";
type Tx = Prisma.TransactionClient;
const include = {
  items: { orderBy: { position: "asc" as const } },
  payment: true,
};
type RecordOrder = Prisma.OrderGetPayload<{ include: typeof include }>;
export function checkoutService(
  db: PrismaClient,
  config: ApiConfig,
  gateway: PaymentGateway = razorpayGateway(config),
) {
  async function lockCatalog(tx: Tx, ids: string[]) {
    const sorted = [...new Set(ids)].sort();
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "Product" WHERE id IN (${Prisma.join(sorted)}) ORDER BY id FOR UPDATE`,
    );
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "ProductVariant" WHERE "productId" IN (${Prisma.join(sorted)}) ORDER BY id FOR UPDATE`,
    );
  }
  async function lines(
    tx: Tx,
    refs: CartItemRef[],
    lock = false,
  ): Promise<OrderLine[]> {
    if (lock)
      await lockCatalog(
        tx,
        refs.map((r) => r.productId),
      );
    const products = await tx.product.findMany({
      where: { id: { in: refs.map((r) => r.productId) } },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
    });
    return refs.map((ref) => {
      const p = products.find((p) => p.id === ref.productId);
      const v = p?.variants.find((v) => v.id === ref.variantId && v.active);
      if (
        !p?.active ||
        !p.category.active ||
        p.slug !== ref.slug ||
        (p.variants.length ? !v : ref.variantId !== null)
      )
        throw new CheckoutError(
          "UNAVAILABLE",
          "A selection is no longer available. Please review your bag.",
        );
      const stock = v ? v.stockQuantity : p.stockQuantity;
      if (stock < ref.quantity)
        throw new CheckoutError(
          "INSUFFICIENT_STOCK",
          "There is not enough stock for your selected quantity. Please review your bag.",
        );
      const price = v?.pricePaise ?? p.pricePaise;
      const image = p.images.find((i) => i.id === v?.imageId) ?? p.images[0];
      return {
        productId: p.id,
        variantId: v?.id ?? null,
        slug: p.slug,
        name: p.name,
        variant: v?.name ?? null,
        sku: v?.sku ?? p.sku,
        image: image?.url ?? null,
        concept: image?.concept ?? false,
        quantity: ref.quantity,
        unitPricePaise: price,
        lineTotalPaise: price * ref.quantity,
      };
    });
  }
  async function makeQuote(
    tx: Tx,
    items: OrderLine[],
    pinCode: string,
    context: {
      couponCode?: string;
      email?: string;
      paymentMethod?: "ONLINE" | "COD";
    } = {},
    lock = false,
  ) {
    if (
      config.SERVICEABLE_PIN_CODES.length &&
      !config.SERVICEABLE_PIN_CODES.includes(pinCode)
    )
      throw new CheckoutError(
        "UNSERVICEABLE_PIN",
        "Delivery is not available to this PIN code yet.",
        422,
      );
    if (context.couponCode && !config.COUPONS_ENABLED)
      throw new CheckoutError(
        "COUPONS_DISABLED",
        "Coupons are not available yet.",
        422,
      );
    const promotion = await resolveCoupon(
      tx,
      context.couponCode,
      items,
      {
        email: context.email,
        paymentMethod: context.paymentMethod ?? "ONLINE",
      },
      lock,
    );
    const totals = calculateTotals(
      items.reduce((n, i) => n + i.lineTotalPaise, 0),
      config,
      promotion?.discount ?? 0,
    );
    if (promotion && totals.totalPaise < 100)
      throw new CheckoutError(
        "COUPON_TOTAL",
        "This coupon makes the payable amount below the supported minimum of INR 1.",
        422,
      );
    const pricedItems = promotion
      ? items.map((i, n) => ({ ...i, discountPaise: promotion.allocations[n] }))
      : items;
    const fingerprintTotals = {
      ...totals,
      ...(promotion
        ? {
            couponCode: promotion.coupon.code,
            couponVersion: promotion.coupon.version,
            paymentMethod: context.paymentMethod ?? "ONLINE",
            emailKey:
              promotion.coupon.perCustomerLimit && context.email
                ? couponIdentity(context.email)
                : null,
          }
        : {}),
    };
    return {
      ...totals,
      items: pricedItems,
      couponCode: promotion?.coupon.code ?? null,
      promotion,
      fingerprint: quoteFingerprint(
        pricedItems,
        pinCode,
        fingerprintTotals,
        config,
      ),
      codEnabled: config.COD_ENABLED,
      paymentAdapter: config.PAYMENT_ADAPTER,
      freeShippingThresholdPaise: config.FREE_SHIPPING_THRESHOLD_PAISE,
      reservationMinutes: config.RESERVATION_MINUTES,
    };
  }
  async function quote(
    refs: CartItemRef[],
    pinCode: string,
    context: {
      couponCode?: string;
      email?: string;
      paymentMethod?: "ONLINE" | "COD";
    } = {},
  ) {
    await expireReservations();
    return db.$transaction(
      async (tx) => {
        const { promotion: _, ...q } = await makeQuote(
          tx,
          await lines(tx, refs),
          pinCode,
          context,
        );
        return q;
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  async function decrement(tx: Tx, items: OrderLine[]) {
    for (const i of [...items].sort((a, b) =>
      (a.variantId ?? a.productId).localeCompare(b.variantId ?? b.productId),
    )) {
      const result = i.variantId
        ? await tx.productVariant.updateMany({
            where: {
              id: i.variantId,
              productId: i.productId,
              active: true,
              stockQuantity: { gte: i.quantity },
            },
            data: { stockQuantity: { decrement: i.quantity } },
          })
        : await tx.product.updateMany({
            where: {
              id: i.productId,
              active: true,
              stockQuantity: { gte: i.quantity },
            },
            data: { stockQuantity: { decrement: i.quantity } },
          });
      if (result.count !== 1)
        throw new CheckoutError(
          "INSUFFICIENT_STOCK",
          "Stock changed. Please review your bag.",
        );
    }
  }
  async function release(tx: Tx, order: RecordOrder) {
    if (order.reservationState !== "HELD") return;
    await tx.couponRedemption.updateMany({
      where: { orderId: order.id, state: "RESERVED" },
      data: { state: "RELEASED", expiresAt: null },
    });
    for (const i of [...order.items].sort((a, b) =>
      (a.variantId ?? a.productId).localeCompare(b.variantId ?? b.productId),
    )) {
      if (i.variantId)
        await tx.productVariant.updateMany({
          where: { id: i.variantId, productId: i.productId },
          data: { stockQuantity: { increment: i.quantity } },
        });
      else
        await tx.product.updateMany({
          where: { id: i.productId },
          data: { stockQuantity: { increment: i.quantity } },
        });
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        reservationState: "RELEASED",
        paymentStatus: "FAILED",
        reservationExpiresAt: null,
      },
    });
    await tx.payment.update({
      where: { orderId: order.id },
      data: { status: "FAILED" },
    });
  }
  async function lockedOrder(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
    return tx.order.findUniqueOrThrow({ where: { id }, include });
  }
  async function expireReservations() {
    const expired = await db.order.findMany({
      where: {
        reservationState: "HELD",
        reservationExpiresAt: { lte: new Date() },
      },
      select: { id: true },
      orderBy: { reservationExpiresAt: "asc" },
      take: 50,
    });
    for (const { id } of expired)
      await db.$transaction(async (tx) => {
        const order = await lockedOrder(tx, id);
        if (
          order.reservationState === "HELD" &&
          order.reservationExpiresAt &&
          order.reservationExpiresAt <= new Date()
        )
          await release(tx, order);
      });
  }
  async function byToken(token: string) {
    const order = await db.order.findUnique({
      where: { tokenHash: hash(token) },
      include,
    });
    if (!order)
      throw new CheckoutError(
        "NOT_FOUND",
        "This order link could not be found.",
        404,
      );
    return order;
  }
  function view(order: RecordOrder): OrderView {
    return {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      completedAt: order.completedAt?.toISOString() ?? null,
      customer: {
        fullName: order.customerName,
        email: order.customerEmail,
        mobile: order.customerMobile,
      },
      address: addressSchema.parse(order.address),
      items: order.items.map(
        ({
          productId,
          variantId,
          slug,
          name,
          variant,
          sku,
          image,
          concept,
          quantity,
          unitPricePaise,
          lineTotalPaise,
          discountPaise,
        }) => ({
          productId,
          variantId,
          slug,
          name,
          variant,
          sku,
          image,
          concept,
          quantity,
          unitPricePaise,
          lineTotalPaise,
          discountPaise,
        }),
      ),
      subtotalPaise: order.subtotalPaise,
      shippingPaise: order.shippingPaise,
      taxPaise: order.taxPaise,
      discountPaise: order.discountPaise,
      couponCode: order.couponCode,
      totalPaise: order.totalPaise,
      currency: "INR",
      taxBps: order.taxBps,
      taxMode: order.taxMode as "inclusive" | "exclusive",
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      operationalStatus: order.operationalStatus,
      accepted: order.accepted,
      needsReview: order.needsReview,
      reservationExpiresAt: order.reservationExpiresAt?.toISOString() ?? null,
      paymentAdapter: order.payment?.adapter as OrderView["paymentAdapter"],
      gatewayOrderId: order.payment?.gatewayOrderId ?? null,
      keyId:
        order.payment?.adapter === "razorpay" &&
        order.paymentStatus === "PENDING"
          ? (config.RAZORPAY_KEY_ID ?? null)
          : null,
    };
  }
  function sameRequest(order: RecordOrder, input: CheckoutRequest) {
    if (
      order.requestHash !== hash(JSON.stringify(input)) ||
      order.tokenHash !== hash(input.confirmationToken)
    )
      throw new CheckoutError(
        "IDEMPOTENCY_CONFLICT",
        "This checkout key has already been used for a different request.",
      );
  }
  async function place(input: CheckoutRequest) {
    await expireReservations();
    let order = await db.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include,
    });
    if (order) sameRequest(order, input);
    else {
      if (input.paymentMethod === "COD" && !config.COD_ENABLED)
        throw new CheckoutError(
          "COD_DISABLED",
          "Cash on delivery is not available.",
          422,
        );
      if (
        input.paymentMethod === "ONLINE" &&
        config.PAYMENT_ADAPTER === "disabled"
      )
        throw new CheckoutError(
          "ONLINE_DISABLED",
          "Online payments are not available.",
          503,
        );
      try {
        order = await db.$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${input.idempotencyKey}, 0))`;
            const existing = await tx.order.findUnique({
              where: { idempotencyKey: input.idempotencyKey },
              include,
            });
            if (existing) {
              sameRequest(existing, input);
              return existing;
            }
            const items = await lines(tx, input.items, true);
            const q = await makeQuote(
              tx,
              items,
              input.pinCode,
              {
                couponCode: input.couponCode,
                email: input.customer.email,
                paymentMethod: input.paymentMethod,
              },
              true,
            );
            if (
              q.fingerprint !== input.quoteFingerprint ||
              q.totalPaise !== input.expectedTotalPaise
            )
              throw new CheckoutError(
                "QUOTE_CHANGED",
                "Prices or delivery charges changed. Review the updated total before placing your order.",
              );
            await decrement(tx, items);
            const cod = input.paymentMethod === "COD";
            const created = await tx.order.create({
              data: {
                orderNumber: `TJ-${randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`,
                idempotencyKey: input.idempotencyKey,
                requestHash: hash(JSON.stringify(input)),
                tokenHash: hash(input.confirmationToken),
                customerName: input.customer.fullName,
                customerEmail: input.customer.email,
                customerMobile: input.customer.mobile,
                address: input.address,
                subtotalPaise: q.subtotalPaise,
                shippingPaise: q.shippingPaise,
                taxPaise: q.taxPaise,
                discountPaise: q.discountPaise,
                couponCode: q.couponCode,
                ...(q.promotion
                  ? { couponSnapshot: q.promotion.snapshot }
                  : {}),
                totalPaise: q.totalPaise,
                taxBps: q.taxBps,
                taxMode: q.taxMode,
                paymentMethod: input.paymentMethod,
                paymentStatus: cod ? "COD_PENDING" : "PENDING",
                operationalStatus: cod ? "NEW" : null,
                accepted: cod,
                reservationState: cod ? "FINALIZED" : "HELD",
                reservationExpiresAt: cod
                  ? null
                  : new Date(Date.now() + config.RESERVATION_MINUTES * 60000),
                items: {
                  create: q.items.map((i, position) => ({ ...i, position })),
                },
                payment: {
                  create: {
                    adapter: cod ? "disabled" : config.PAYMENT_ADAPTER,
                    status: cod ? "COD_PENDING" : "PENDING",
                    amountPaise: q.totalPaise,
                  },
                },
              },
              include,
            });
            if (q.promotion)
              await tx.couponRedemption.create({
                data: {
                  couponId: q.promotion.coupon.id,
                  orderId: created.id,
                  emailKey: couponIdentity(input.customer.email),
                  state: cod ? "REDEEMED" : "RESERVED",
                  amountPaise: q.discountPaise,
                  expiresAt: created.reservationExpiresAt,
                },
              });
            return created;
          },
          { timeout: 15000 },
        );
      } catch (e) {
        if (
          !(e instanceof Prisma.PrismaClientKnownRequestError) ||
          e.code !== "P2002"
        )
          throw e;
        order = await db.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include,
        });
        if (!order)
          throw new CheckoutError(
            "IDEMPOTENCY_CONFLICT",
            "This checkout token is already in use.",
          );
        sameRequest(order, input);
      }
    }
    if (
      order.paymentMethod === "ONLINE" &&
      order.paymentStatus === "PENDING" &&
      order.payment?.adapter === "razorpay" &&
      !order.payment.gatewayOrderId
    ) {
      await initiateGateway(order);
      order = await db.order.findUniqueOrThrow({
        where: { id: order.id },
        include,
      });
    }
    return view(order);
  }
  function assertGateway(order: RecordOrder, remote: GatewayOrder) {
    if (
      remote.receipt !== order.orderNumber ||
      remote.amount !== order.totalPaise ||
      remote.currency !== "INR" ||
      (order.payment?.gatewayOrderId &&
        order.payment.gatewayOrderId !== remote.id)
    )
      throw new CheckoutError(
        "PAYMENT_MISMATCH",
        "The provider order does not match this checkout.",
        409,
      );
  }
  async function attachGateway(order: RecordOrder, remote: GatewayOrder) {
    assertGateway(order, remote);
    await db.payment.update({
      where: { orderId: order.id },
      data: { gatewayOrderId: remote.id },
    });
  }
  async function initiateGateway(order: RecordOrder) {
    const claim = await db.payment.updateMany({
      where: {
        orderId: order.id,
        initiationStartedAt: null,
        gatewayOrderId: null,
        status: "PENDING",
      },
      data: { initiationStartedAt: new Date() },
    });
    // Once a network create starts, retries only recover by exact receipt. Never create twice after an ambiguous timeout/crash.
    const remote = claim.count
      ? await gateway.createOrder(order.totalPaise, order.orderNumber)
      : await gateway.findOrder(order.orderNumber);
    if (!remote)
      throw new CheckoutError(
        "PAYMENT_INITIATING",
        "The payment attempt is being checked. Retry this same checkout shortly.",
        503,
      );
    await attachGateway(order, remote);
  }
  async function applyPayment(
    id: string,
    payment: GatewayPayment | null,
    source: string,
    event?: { id: string; bodyHash: string; type: string },
  ) {
    return db.$transaction(
      async (tx) => {
        const order = await lockedOrder(tx, id);
        if (event) {
          const previous = await tx.paymentWebhook.findUnique({
            where: { eventId: event.id },
          });
          if (previous) {
            if (previous.bodyHash !== event.bodyHash)
              throw new CheckoutError(
                "WEBHOOK_CONFLICT",
                "Webhook event does not match.",
                400,
              );
            return;
          }
        }
        if (
          payment &&
          (payment.order_id !== order.payment?.gatewayOrderId ||
            payment.amount !== order.totalPaise ||
            payment.currency !== "INR")
        )
          throw new CheckoutError(
            "PAYMENT_MISMATCH",
            "Payment does not match this order.",
            409,
          );
        if (order.paymentStatus !== "PAID" && payment?.status === "captured") {
          let accepted = true;
          if (order.reservationState === "RELEASED") {
            // A released promotion is not silently reacquired after its capacity was reused.
            if (order.couponCode) accepted = false;
            try {
              await lines(
                tx,
                order.items.map((i) => ({
                  productId: i.productId,
                  slug: i.slug,
                  variantId: i.variantId,
                  quantity: i.quantity,
                })),
                true,
              );
            } catch (e) {
              if (e instanceof CheckoutError) accepted = false;
              else throw e;
            }
            if (accepted) await decrement(tx, order.items);
          }
          if (accepted)
            await tx.couponRedemption.updateMany({
              where: { orderId: id, state: "RESERVED" },
              data: { state: "REDEEMED", expiresAt: null },
            });
          await tx.order.update({
            where: { id },
            data: {
              paymentStatus: "PAID",
              accepted,
              operationalStatus: accepted ? "NEW" : null,
              needsReview: !accepted,
              reservationState: accepted ? "FINALIZED" : "RELEASED",
              reservationExpiresAt: null,
            },
          });
          await tx.payment.update({
            where: { orderId: id },
            data: {
              status: "PAID",
              gatewayPaymentId: payment.id,
              verifiedAt: new Date(),
              verificationMetadata: {
                source,
                providerStatus: payment.status,
                amountMatched: true,
                needsRefundReview: !accepted,
              },
            },
          });
        } else if (
          order.paymentStatus !== "PAID" &&
          (payment?.status === "failed" ||
            (order.reservationExpiresAt &&
              order.reservationExpiresAt <= new Date()))
        ) {
          await release(tx, order);
          if (payment?.status === "failed")
            await tx.payment.update({
              where: { orderId: id },
              data: {
                gatewayPaymentId: payment.id,
                verificationMetadata: {
                  source,
                  providerStatus: "failed",
                  amountMatched: true,
                },
              },
            });
        }
        await tx.payment.update({
          where: { orderId: id },
          data: { lastReconciledAt: new Date() },
        });
        if (event)
          await tx.paymentWebhook.create({
            data: {
              eventId: event.id,
              bodyHash: event.bodyHash,
              eventType: event.type,
            },
          });
      },
      { timeout: 15000 },
    );
  }
  async function reconcileRecord(order: RecordOrder) {
    if (
      order.paymentMethod !== "ONLINE" ||
      order.payment?.adapter !== "razorpay" ||
      order.paymentStatus === "PAID"
    )
      return;
    let remote: GatewayOrder | null;
    if (!order.payment.gatewayOrderId) {
      remote = order.payment.initiationStartedAt
        ? await gateway.findOrder(order.orderNumber)
        : null;
      if (remote) {
        await attachGateway(order, remote);
        order = await db.order.findUniqueOrThrow({
          where: { id: order.id },
          include,
        });
      }
    } else remote = await gateway.getOrder(order.payment.gatewayOrderId);
    if (!remote) {
      await applyPayment(order.id, null, "reconcile");
      return;
    }
    assertGateway(order, remote);
    const payments = await gateway.payments(remote.id);
    const payment =
      payments.find((p) => p.status === "captured") ??
      payments.find((p) => p.status === "authorized") ??
      payments.find((p) => p.status === "failed") ??
      null;
    await applyPayment(order.id, payment, "reconcile");
  }
  async function reconcile(token: string) {
    const order = await byToken(token);
    await reconcileRecord(order);
    await expireReservations();
    return view(await byToken(token));
  }
  async function verify(
    token: string,
    orderId: string,
    paymentId: string,
    signature: string,
  ) {
    const order = await byToken(token);
    if (
      order.payment?.adapter !== "razorpay" ||
      order.payment.gatewayOrderId !== orderId ||
      !config.RAZORPAY_KEY_SECRET ||
      !validSignature(
        `${order.payment.gatewayOrderId}|${paymentId}`,
        signature,
        config.RAZORPAY_KEY_SECRET,
      )
    )
      throw new CheckoutError(
        "INVALID_SIGNATURE",
        "Payment verification failed.",
        400,
      );
    const remote = await gateway.getOrder(orderId);
    assertGateway(order, remote);
    await applyPayment(
      order.id,
      await gateway.getPayment(paymentId),
      "callback-and-api",
    );
    return view(await byToken(token));
  }
  async function developmentPayment(
    token: string,
    outcome: "success" | "failure",
  ) {
    if (
      config.NODE_ENV === "production" ||
      config.PAYMENT_ADAPTER !== "development"
    )
      throw new CheckoutError("NOT_FOUND", "Resource not found.", 404);
    const order = await byToken(token);
    if (
      order.payment?.adapter !== "development" ||
      order.paymentMethod !== "ONLINE"
    )
      throw new CheckoutError(
        "INVALID_PAYMENT",
        "Not a development payment.",
        400,
      );
    // Development IDs are unmistakable and never used by the real Razorpay adapter.
    const id = `order_dev${order.id.replace(/[^a-zA-Z0-9]/g, "")}`;
    if (!order.payment.gatewayOrderId)
      await db.payment.update({
        where: { orderId: order.id },
        data: { gatewayOrderId: id },
      });
    await applyPayment(
      order.id,
      {
        id: `pay_dev${order.id.replace(/[^a-zA-Z0-9]/g, "")}`,
        order_id: id,
        amount: order.totalPaise,
        currency: "INR",
        status: outcome === "success" ? "captured" : "failed",
      },
      "development-simulation",
    );
    return view(await byToken(token));
  }
  async function webhook(raw: Buffer, signature: string, eventId: string) {
    if (
      config.PAYMENT_ADAPTER !== "razorpay" ||
      !config.RAZORPAY_WEBHOOK_SECRET ||
      !validSignature(raw, signature, config.RAZORPAY_WEBHOOK_SECRET)
    )
      throw new CheckoutError(
        "INVALID_SIGNATURE",
        "Webhook signature verification failed.",
        400,
      );
    const body = JSON.parse(raw.toString("utf8")) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string } };
        order?: { entity?: { id?: string } };
      };
    };
    const supported = ["payment.captured", "payment.failed", "order.paid"];
    if (!body.event || !supported.includes(body.event)) return;
    const bodyHash = hash(raw);
    const previous = await db.paymentWebhook.findUnique({ where: { eventId } });
    if (previous) {
      if (previous.bodyHash !== bodyHash)
        throw new CheckoutError(
          "WEBHOOK_CONFLICT",
          "Webhook event does not match.",
          400,
        );
      return;
    }
    const paymentId = body.payload?.payment?.entity?.id;
    const remotePayment =
      paymentId && /^pay_[A-Za-z0-9]+$/.test(paymentId)
        ? await gateway.getPayment(paymentId)
        : null;
    const gatewayId =
      remotePayment?.order_id ?? body.payload?.order?.entity?.id;
    if (!gatewayId || !/^order_[A-Za-z0-9]+$/.test(gatewayId))
      throw new CheckoutError(
        "INVALID_WEBHOOK",
        "Invalid payment notification.",
        400,
      );
    const remoteOrder = await gateway.getOrder(gatewayId);
    const order = await db.order.findUnique({
      where: { orderNumber: remoteOrder.receipt },
      include,
    });
    if (
      !order ||
      order.payment?.adapter !== "razorpay" ||
      order.paymentMethod !== "ONLINE"
    )
      return;
    await attachGateway(order, remoteOrder);
    const payments = await gateway.payments(gatewayId);
    const payment =
      payments.find((p) => p.status === "captured") ??
      payments.find((p) => p.status === "authorized") ??
      remotePayment;
    try {
      await applyPayment(order.id, payment, "webhook-and-api", {
        id: eventId,
        bodyHash,
        type: body.event,
      });
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== "P2002"
      )
        throw e;
      const existing = await db.paymentWebhook.findUnique({
        where: { eventId },
      });
      if (existing?.bodyHash !== bodyHash) throw e;
    }
  }
  async function maintain() {
    await expireReservations();
    const pending = await db.order.findMany({
      where: {
        paymentMethod: "ONLINE",
        paymentStatus: { in: ["PENDING", "FAILED"] },
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
        payment: { adapter: "razorpay" },
      },
      include,
      orderBy: {
        payment: { lastReconciledAt: { sort: "asc", nulls: "first" } },
      },
      take: 25,
    });
    for (const order of pending) {
      try {
        await reconcileRecord(order);
      } catch {
        await db.payment.update({
          where: { orderId: order.id },
          data: { lastReconciledAt: new Date() },
        });
      }
    }
  }
  return {
    quote,
    place,
    verify,
    reconcile,
    developmentPayment,
    webhook,
    maintain,
    expireReservations,
    confirmation: async (token: string) => {
      await expireReservations();
      return view(await byToken(token));
    },
  };
}
