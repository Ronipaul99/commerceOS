"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmationTokenSchema, type OrderView } from "@tiyas/shared";
import {
  checkoutApi,
  pendingCheckoutKey,
  readPendingCheckout,
} from "@/lib/checkout-client";
import { useStorefront } from "@/components/storefront/storefront-provider";

export function orderDestination(order: OrderView) {
  return !order.accepted &&
    !order.needsReview &&
    order.paymentStatus === "FAILED"
    ? "/payment-failed"
    : "/order-confirmation";
}

export function usePrivateOrder(screen: "confirmation" | "failure") {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const { completePurchase, hydrated } = useStorefront();
  const complete = useRef(completePurchase);
  useEffect(() => {
    complete.current = completePurchase;
  }, [completePurchase]);
  useEffect(() => {
    const change = () => {
      setLoading(true);
      setOrder(null);
      setError("");
      setReload((value) => value + 1);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    let active = true;
    const parsed = confirmationTokenSchema.safeParse(
      window.location.hash.slice(1) || readPendingCheckout()?.token || "",
    );
    void (async () => {
      if (!parsed.success)
        throw new Error("This private order link is missing or invalid.");
      const response = await checkoutApi.confirmation(parsed.data);
      if (active) {
        setToken(parsed.data);
        setOrder(response.data);
      }
    })()
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Your order could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  const destination = order ? orderDestination(order) : null;
  const redirecting =
    !!destination &&
    destination !==
      (screen === "failure" ? "/payment-failed" : "/order-confirmation");
  useEffect(() => {
    if (redirecting && destination && token)
      router.replace(`${destination}#${token}`);
  }, [redirecting, destination, token, router]);
  useEffect(() => {
    if (!hydrated || !order?.accepted || readPendingCheckout()?.token !== token)
      return;
    complete.current(
      order.items.map(({ productId, slug, variantId, quantity }) => ({
        productId,
        slug,
        variantId,
        quantity,
      })),
      order.orderNumber,
    );
    try {
      sessionStorage.removeItem(pendingCheckoutKey);
    } catch {
      /* Browser persistence is optional. */
    }
  }, [order, token, hydrated]);
  const shouldPoll =
    order?.paymentAdapter === "razorpay" &&
    !order.accepted &&
    (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED");
  useEffect(() => {
    if (!shouldPoll || !token) return;
    let active = true,
      busy = false;
    const interval = setInterval(() => {
      if (busy || document.hidden) return;
      busy = true;
      checkoutApi
        .reconcile(token)
        .then((response) => {
          if (active) {
            setOrder(response.data);
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError(
              "Automatic status checking is delayed. Please check payment status again.",
            );
        })
        .finally(() => {
          busy = false;
        });
    }, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [shouldPoll, token]);
  return {
    token,
    order,
    setOrder,
    error,
    loading: loading || redirecting,
    retry: () => {
      setLoading(true);
      setError("");
      setReload((value) => value + 1);
    },
  };
}
