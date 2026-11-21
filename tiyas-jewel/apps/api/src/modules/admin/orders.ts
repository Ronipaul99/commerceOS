import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { AdminError } from "./errors.js";
export const acceptedOrders: Prisma.OrderWhereInput = {
  accepted: true,
  needsReview: false,
  reservationState: "FINALIZED",
  operationalStatus: { not: null },
  OR: [
    { paymentMethod: "ONLINE", paymentStatus: "PAID" },
    { paymentMethod: "COD", paymentStatus: "COD_PENDING" },
  ],
};
const summarySelect = {
  id: true,
  orderNumber: true,
  createdAt: true,
  completedAt: true,
  customerName: true,
  customerMobile: true,
  totalPaise: true,
  paymentMethod: true,
  paymentStatus: true,
  operationalStatus: true,
} as const;
type Summary = Prisma.OrderGetPayload<{ select: typeof summarySelect }>;
const summary = (o: Summary) => ({
  ...o,
  createdAt: o.createdAt.toISOString(),
  completedAt: o.completedAt?.toISOString() ?? null,
});
export function adminOrders(db: PrismaClient) {
  async function dashboard() {
    return db.$transaction(
      async (tx) => {
        const totalProducts = await tx.product.count(),
          activeProducts = await tx.product.count({ where: { active: true } });
        const newOrders = await tx.order.count({
            where: { ...acceptedOrders, operationalStatus: "NEW" },
          }),
          completedOrders = await tx.order.count({
            where: { ...acceptedOrders, operationalStatus: "COMPLETED" },
          });
        const recentOrders = await tx.order.findMany({
          where: acceptedOrders,
          select: summarySelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 8,
        });
        return {
          data: {
            totalProducts,
            activeProducts,
            newOrders,
            completedOrders,
            recentOrders: recentOrders.map(summary),
          },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  async function list(q: {
    page: number;
    limit: number;
    status: "NEW" | "COMPLETED" | "ALL";
    q?: string;
    payment?: "ALL" | "ONLINE" | "COD";
  }) {
    const where = {
      ...acceptedOrders,
      ...(q.status === "ALL" ? {} : { operationalStatus: q.status }),
      ...(q.payment && q.payment !== "ALL" ? { paymentMethod: q.payment } : {}),
      ...(q.q
        ? {
            AND: [
              {
                OR: [
                  {
                    orderNumber: {
                      contains: q.q,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    customerName: {
                      contains: q.q,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    customerEmail: {
                      contains: q.q,
                      mode: "insensitive" as const,
                    },
                  },
                  { customerMobile: { contains: q.q } },
                ],
              },
            ],
          }
        : {}),
    };
    return db.$transaction(
      async (tx) => {
        const total = await tx.order.count({ where });
        const rows = await tx.order.findMany({
          where,
          select: summarySelect,
          orderBy: [
            { operationalStatus: "asc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
          skip: (q.page - 1) * q.limit,
          take: q.limit,
        });
        return {
          data: rows.map(summary),
          pagination: {
            page: q.page,
            limit: q.limit,
            total,
            totalPages: Math.ceil(total / q.limit),
          },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  async function get(id: string) {
    const o = await db.order.findFirst({
      where: { ...acceptedOrders, id },
      include: { items: { orderBy: { position: "asc" } } },
    });
    if (!o) throw new AdminError("NOT_FOUND", "Accepted order not found.", 404);
    return {
      data: {
        ...summary(o),
        customerEmail: o.customerEmail,
        address: o.address,
        items: o.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          slug: i.slug,
          name: i.name,
          variant: i.variant,
          sku: i.sku,
          image: i.image,
          concept: i.concept,
          quantity: i.quantity,
          unitPricePaise: i.unitPricePaise,
          lineTotalPaise: i.lineTotalPaise,
        })),
        totals: {
          subtotalPaise: o.subtotalPaise,
          shippingPaise: o.shippingPaise,
          taxPaise: o.taxPaise,
          discountPaise: o.discountPaise,
          totalPaise: o.totalPaise,
          taxMode: o.taxMode,
          taxBps: o.taxBps,
          currency: o.currency,
        },
      },
    };
  }
  async function complete(id: string) {
    const changed = await db.order.updateMany({
      where: { ...acceptedOrders, id, operationalStatus: "NEW" },
      data: { operationalStatus: "COMPLETED", completedAt: new Date() },
    });
    const result = await get(id);
    if (!changed.count && result.data.operationalStatus !== "COMPLETED")
      throw new AdminError(
        "INVALID_ORDER_STATE",
        "Only accepted new orders can be completed.",
        409,
      );
    return result;
  }
  return { dashboard, list, get, complete };
}
