"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

interface CashOnDeliveryProps {
  orderNumber: string;
  redirectDelay?: number; // milliseconds, default 5000
}

const CashOnDelivery: React.FC<CashOnDeliveryProps> = ({
  orderNumber,
  redirectDelay = 5000,
}) => {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(redirectDelay / 1000),
  );

  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      router.push("/profile");
    }, redirectDelay);

    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(redirectTimer);
      clearInterval(interval);
    };
  }, [router, redirectDelay]);

  return (
    <div className="space-y-5 text-center">
      {/* Success icon */}
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircleIcon className="h-8 w-8 text-green-600" />
      </div>

      {/* Headline */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">
          Order placed successfully
        </h2>
        <p className="text-sm text-muted-foreground">
          Your order has been confirmed.
        </p>
      </div>

      {/* Order reference */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-left">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Order number</span>
          <span className="font-mono font-medium text-foreground">
            #{orderNumber}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Payment method</span>
          <span className="font-medium text-foreground">Cash on Delivery</span>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-blue-700 dark:text-blue-300">
        You'll pay <span className="font-semibold">cash</span> when your order
        arrives.
      </div>

      {/* Redirect notice */}
      <div className="text-xs text-muted-foreground">
        Redirecting to your profile in{" "}
        <span className="font-semibold text-foreground">{secondsLeft}s</span>.{" "}
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Go now
        </button>
      </div>
    </div>
  );
};

export default CashOnDelivery;
