import type { CouponInput, OrderLine } from "@tiyas/shared";
import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { CheckoutError } from "../checkout/errors.js";
import { AdminError } from "../admin/errors.js";
import { createHash } from "node:crypto";
export const couponIdentity = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
type Tx = Prisma.TransactionClient;
export function allocateDiscount(amounts: number[], discount: number) {
  const total = amounts.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(discount) || discount < 0 || discount > total)
    throw new Error("Invalid discount allocation");
  if (!total) return amounts.map(() => 0);
  const values = amounts.map((a) =>
    Number((BigInt(a) * BigInt(discount)) / BigInt(total)),
  );
  let remaining = discount - values.reduce((a, b) => a + b, 0);
  for (let i = 0; remaining > 0; i = (i + 1) % values.length)
    if (values[i]! < amounts[i]!) {
      values[i]!++;
      remaining--;
    }
  return values;
}
export async function resolveCoupon(
  tx: Tx,
  code: string | undefined,
  items: OrderLine[],
  context: { email?: string; paymentMethod?: "ONLINE" | "COD" },
  lock = false,
) {
  if (!code) return null;
  if (lock)
    await tx.$queryRaw`SELECT id FROM "Coupon" WHERE code=${code} FOR UPDATE`;
  const c = await tx.coupon.findUnique({ where: { code } }),
    now = new Date();
  const invalid = (message = "This coupon is not available for this order.") =>
    new CheckoutError("COUPON_INVALID", message, 422);
  if (!c || !c.active || c.archived || c.startsAt > now || c.endsAt <= now)
    throw invalid();
  if (
    !context.paymentMethod ||
    !c.paymentMethods.includes(context.paymentMethod)
  )
    throw invalid("Choose an eligible payment method for this coupon.");
  if (c.perCustomerLimit && !context.email)
    throw invalid("Enter your email before applying this coupon.");
  const scope = await tx.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: {
      id: true,
      categoryId: true,
      collections: { select: { collectionId: true } },
    },
  });
  const scoped = !!(
    c.productIds.length +
    c.categoryIds.length +
    c.collectionIds.length
  );
  const amounts = items.map((i) => {
    const p = scope.find((p) => p.id === i.productId);
    return !scoped ||
      c.productIds.includes(i.productId) ||
      !!(
        p &&
        (c.categoryIds.includes(p.categoryId) ||
          p.collections.some((x) => c.collectionIds.includes(x.collectionId)))
      )
      ? i.lineTotalPaise
      : 0;
  });
  const eligible = amounts.reduce((a, b) => a + b, 0);
  if (!eligible || eligible < c.minimumPaise)
    throw invalid(
      "Your eligible items do not meet this coupon's minimum spend.",
    );
  const used = { couponId: c.id, state: { in: ["RESERVED", "REDEEMED"] } };
  if (
    c.usageLimit &&
    (await tx.couponRedemption.count({ where: used })) >= c.usageLimit
  )
    throw invalid("This coupon has reached its usage limit.");
  if (
    c.perCustomerLimit &&
    (await tx.couponRedemption.count({
      where: { ...used, emailKey: couponIdentity(context.email!) },
    })) >= c.perCustomerLimit
  )
    throw invalid("This coupon's limit for your email has been reached.");
  const calculated =
    c.type === "FIXED"
      ? c.value
      : Number((BigInt(eligible) * BigInt(c.value) + 5000n) / 10000n);
  const discount = Math.min(
    eligible,
    calculated,
    c.maximumDiscountPaise ?? eligible,
  );
  if (discount <= 0) throw invalid();
  return {
    coupon: c,
    discount,
    allocations: allocateDiscount(amounts, discount),
    snapshot: {
      id: c.id,
      code: c.code,
      version: c.version,
      type: c.type,
      value: c.value,
      eligiblePaise: eligible,
      discountPaise: discount,
      shippingThreshold: "PRE_DISCOUNT",
    },
  };
}
export function couponAdmin(db: PrismaClient) {
  async function list() {
    const data = await db.coupon.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const counts = await db.couponRedemption.groupBy({
      by: ["couponId", "state"],
      where: { couponId: { in: data.map((c) => c.id) } },
      _count: { _all: true },
    });
    return {
      data: data.map((c) => ({
        ...c,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
        reserved:
          counts.find((r) => r.couponId === c.id && r.state === "RESERVED")
            ?._count._all ?? 0,
        redeemed:
          counts.find((r) => r.couponId === c.id && r.state === "REDEEMED")
            ?._count._all ?? 0,
      })),
    };
  }
  async function save(input: CouponInput, adminId: string, id?: string) {
    return db.$transaction(async (tx) => {
      const { version, ...fields } = input;
      if (id)
        await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id=${id} FOR UPDATE`;
      const current = id ? await tx.coupon.findUnique({ where: { id } }) : null;
      if (id && (!current || current.version !== version))
        throw new AdminError(
          "CONFLICT",
          "This coupon changed. Reload before editing.",
          409,
        );
      const used = id
        ? await tx.couponRedemption.count({
            where: { couponId: id, state: { in: ["RESERVED", "REDEEMED"] } },
          })
        : 0;
      if (input.usageLimit && input.usageLimit < used)
        throw new AdminError(
          "LIMIT_IN_USE",
          "The limit is below current reservations and redemptions.",
          409,
        );
      if (current && used) {
        const mutable = new Set([
          "description",
          "active",
          "archived",
          "usageLimit",
          "endsAt",
        ]);
        for (const key of Object.keys(fields) as (keyof typeof fields)[])
          if (
            !mutable.has(key) &&
            JSON.stringify(fields[key]) !==
              JSON.stringify(
                key === "startsAt"
                  ? current.startsAt.toISOString()
                  : current[key],
              )
          )
            throw new AdminError(
              "COUPON_IN_USE",
              "Clone this coupon to change its terms after use.",
              409,
            );
      }
      for (const [ids, delegate] of [
        [input.productIds, "product"],
        [input.categoryIds, "category"],
        [input.collectionIds, "collection"],
      ] as const) {
        if (new Set(ids).size !== ids.length)
          throw new AdminError(
            "DUPLICATE_SCOPE",
            "Remove duplicate scope selections.",
          );
        const count =
          delegate === "product"
            ? await tx.product.count({ where: { id: { in: ids } } })
            : delegate === "category"
              ? await tx.category.count({ where: { id: { in: ids } } })
              : await tx.collection.count({ where: { id: { in: ids } } });
        if (count !== ids.length)
          throw new AdminError(
            "INVALID_SCOPE",
            "A selected catalog record does not exist.",
          );
      }
      try {
        return {
          data: id
            ? await tx.coupon.update({
                where: { id },
                data: {
                  ...fields,
                  startsAt: new Date(input.startsAt),
                  endsAt: new Date(input.endsAt),
                  updatedBy: adminId,
                  version: { increment: 1 },
                },
              })
            : await tx.coupon.create({
                data: {
                  ...fields,
                  startsAt: new Date(input.startsAt),
                  endsAt: new Date(input.endsAt),
                  updatedBy: adminId,
                },
              }),
        };
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        )
          throw new AdminError(
            "CODE_EXISTS",
            "This coupon code already exists.",
            409,
          );
        throw e;
      }
    });
  }
  return { list, save };
}
