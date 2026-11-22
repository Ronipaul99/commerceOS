import type { FastifyInstance } from "fastify";
import {
  checkoutQuoteRequestSchema,
  checkoutRequestSchema,
  tokenRequestSchema,
  verificationRequestSchema,
  developmentPaymentSchema,
} from "@tiyas/shared";
import type { ApiConfig } from "../../config/env.js";
import type { PaymentGateway } from "../../integrations/payments.js";
import { checkoutService } from "./service.js";
import { CheckoutError } from "./errors.js";
export async function checkoutRoutes(
  app: FastifyInstance,
  options: {
    config: ApiConfig;
    gateway?: PaymentGateway;
    background?: boolean;
  },
) {
  const service = checkoutService(app.db, options.config, options.gateway);
  // Bounded, per-process limiter; proxy IPs are never trusted implicitly. One API process is the Stage 04 topology.
  const buckets = new Map<string, { count: number; until: number }>();
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && !options.config.CORS_ORIGINS.includes(origin))
      throw new CheckoutError(
        "ORIGIN_DENIED",
        "Request origin is not allowed.",
        403,
      );
    const path = request.url.split("?")[0] ?? "";
    const webhook = path.endsWith("/webhooks/razorpay");
    const place = path.endsWith("/checkout/place");
    const limit = webhook ? 240 : place ? 12 : 90;
    const key = `${request.ip}:${webhook ? "webhook" : place ? "place" : "read"}`;
    const now = Date.now();
    if (buckets.size >= 10000)
      for (const [key, b] of buckets) if (b.until <= now) buckets.delete(key);
    const bucket = buckets.get(key);
    if (!bucket || bucket.until <= now) {
      if (!bucket && buckets.size >= 10000)
        throw new CheckoutError(
          "RATE_LIMITED",
          "Please try again shortly.",
          429,
        );
      buckets.set(key, { count: 1, until: now + 60000 });
    } else if (++bucket.count > limit) {
      reply.header("Retry-After", Math.ceil((bucket.until - now) / 1000));
      throw new CheckoutError(
        "RATE_LIMITED",
        "Too many requests. Please try again shortly.",
        429,
      );
    }
    reply.header("Referrer-Policy", "no-referrer");
  });
  app.post("/checkout/quote", async (request) => {
    const input = checkoutQuoteRequestSchema.parse(request.body);
    return {
      data: await service.quote(input.items, input.pinCode, {
        couponCode: input.couponCode,
        email: input.customerEmail,
        paymentMethod: input.paymentMethod,
      }),
    };
  });
  app.post("/checkout/place", async (request) => ({
    data: await service.place(checkoutRequestSchema.parse(request.body)),
  }));
  app.post("/checkout/verify", async (request) => {
    const v = verificationRequestSchema.parse(request.body);
    return {
      data: await service.verify(
        v.token,
        v.razorpay_order_id,
        v.razorpay_payment_id,
        v.razorpay_signature,
      ),
    };
  });
  app.post("/checkout/reconcile", async (request) => ({
    data: await service.reconcile(tokenRequestSchema.parse(request.body).token),
  }));
  app.post("/orders/confirmation", async (request) => ({
    data: await service.confirmation(
      tokenRequestSchema.parse(request.body).token,
    ),
  }));
  if (
    options.config.PAYMENT_ADAPTER === "development" &&
    options.config.NODE_ENV !== "production"
  )
    app.post("/checkout/development-payment", async (request) => {
      const input = developmentPaymentSchema.parse(request.body);
      return {
        data: await service.developmentPayment(input.token, input.outcome),
      };
    });
  await app.register(async (hook) => {
    hook.removeContentTypeParser("application/json");
    hook.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_request, body, done) => done(null, body),
    );
    hook.post("/webhooks/razorpay", async (request) => {
      const signature = request.headers["x-razorpay-signature"];
      const eventId = request.headers["x-razorpay-event-id"];
      if (
        !Buffer.isBuffer(request.body) ||
        typeof signature !== "string" ||
        typeof eventId !== "string" ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(eventId)
      )
        throw new CheckoutError(
          "INVALID_WEBHOOK",
          "Invalid payment notification.",
          400,
        );
      try {
        await service.webhook(request.body, signature, eventId);
      } catch (e) {
        if (e instanceof SyntaxError)
          throw new CheckoutError(
            "INVALID_WEBHOOK",
            "Invalid payment notification.",
            400,
          );
        throw e;
      }
      return { received: true };
    });
  });
  if (options.background) {
    let running: Promise<void> | undefined;
    const tick = () => {
      if (!running)
        running = service
          .maintain()
          .catch(() => {
            app.log.warn("Checkout reconciliation deferred; it will retry");
          })
          .finally(() => {
            running = undefined;
          });
    };
    const interval = setInterval(tick, 30000);
    interval.unref();
    app.addHook("onReady", async () => {
      tick();
    });
    app.addHook("onClose", async () => {
      clearInterval(interval);
      await running;
    });
  }
}
