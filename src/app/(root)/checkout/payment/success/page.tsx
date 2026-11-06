"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/app/context/CartContext";
import { getCheckoutOrderAction } from "@/app/actions/checkout";

type CheckoutOrder = {
  orderNumber: string;
  paymentStatus: string;
  orderStatus: string;
  total: number;
  subtotal: number;
  discount: number;
  shippingCost: number;
  products: Array<{ name: string; quantity: number; price: number }>;
  firstName?: string;
  lastName?: string;
};

const POLL_MS = 3000;
const MAX_ATTEMPTS = 20;

export default function PaymentSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const { clearCart } = useCart();
  const paymentRef = params.get("payment_ref");
  const gatewayStatus = params.get("status");

  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!paymentRef) {
      setError("Missing payment reference.");
      setLoading(false);
      return;
    }

    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const result = await getCheckoutOrderAction(paymentRef);
        if (!active) return;

        if (!result) {
          setError("We could not find this order for your session.");
          setLoading(false);
          return;
        }

        setOrder(result as CheckoutOrder);
        if (result.paymentStatus === "paid") {
          setLoading(false);
          if (!clearedRef.current) {
            clearedRef.current = true;
            void clearCart();
          }
          return;
        }

        if (result.paymentStatus === "failed" || result.paymentStatus === "cancelled") {
          setLoading(false);
          return;
        }

        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) {
          setLoading(false);
          return;
        }
        timer = setTimeout(poll, POLL_MS);
      } catch {
        if (!active) return;
        setError("We could not load this order.");
        setLoading(false);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [paymentRef, clearCart]);

  const paid = order?.paymentStatus === "paid";
  const failed =
    order?.paymentStatus === "failed" ||
    order?.paymentStatus === "cancelled" ||
    (!loading && !paid && gatewayStatus === "failed");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">
              Confirming your payment with the provider…
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              This can take a few seconds. Do not close this page.
            </p>
          </div>
        ) : error ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              We could not confirm this order
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/contact")}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            >
              Contact support
            </button>
          </div>
        ) : paid ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Payment confirmed
            </h1>
            <p className="mt-2 text-muted-foreground">
              Order #{order?.orderNumber}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              We have emailed your receipt. Thank you for shopping with
              Novaorizon.
            </p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => router.push("/profile/myorders")}
                className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground"
              >
                View my orders
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full rounded-lg bg-muted px-4 py-2 text-muted-foreground"
              >
                Continue shopping
              </button>
            </div>
          </div>
        ) : failed ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Payment not completed
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The provider did not confirm this payment. If you were charged,
              contact support with order #{order?.orderNumber}.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(`/checkout?order=${order?.orderNumber ?? ""}`)
              }
              className="mt-6 w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Payment is still processing
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We have not received the provider confirmation yet. Order #
              {order?.orderNumber}. You can safely close this page; we will
              email you when it is confirmed.
            </p>
            <button
              type="button"
              onClick={() => router.push("/profile/myorders")}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            >
              View my orders
            </button>
          </div>
        )}

        {order && paid && (
          <dl className="mt-6 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{order.subtotal.toLocaleString()} CFA</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{order.shippingCost.toLocaleString()} CFA</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Discount</dt>
              <dd>-{order.discount.toLocaleString()} CFA</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{order.total.toLocaleString()} CFA</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
