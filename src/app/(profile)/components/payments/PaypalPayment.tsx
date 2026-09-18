"use client";

import React, { useEffect, useState } from "react";
import PayPalButton from "@/app/(profile)/components/payments/PaypalButton";
import { findOrders } from "@/app/actions/order";

interface PaypalPaymentProps {
  payment_ref?: string;
}

const PaypalPayment: React.FC<PaypalPaymentProps> = ({ payment_ref }) => {
  const [paymentStatus, setPaymentStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!payment_ref) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await findOrders({ orderNumber: payment_ref });
        if (response?.orders?.length > 0) {
          setOrder(response.orders[0]);
        } else {
          console.warn("No order found for payment_ref:", payment_ref);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [payment_ref]);

  const handleSuccess = (details: any) => {
    setPaymentStatus({
      type: "success",
      message: `Payment completed by ${details.payer.name.given_name}`,
    });
  };

  const handleError = (error: any) => {
    setPaymentStatus({
      type: "error",
      message: `Payment failed: ${error}`,
    });
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        Loading order details…
      </div>
    );
  }

  // ---------- Order not found ----------
  if (!order && payment_ref) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
        We couldn't find this order. Please contact support.
      </div>
    );
  }

  const amount = order?.total?.toString() || "0.00";

  return (
    <div className="space-y-5">
      {/* Amount summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Amount to pay
        </p>
        <p className="mt-1 text-2xl font-bold text-foreground">
          ${amount}
          <span className="ml-1 text-base font-medium text-muted-foreground">
            USD
          </span>
        </p>
        {payment_ref && (
          <p className="mt-1 text-xs text-muted-foreground">
            Order #{payment_ref}
          </p>
        )}
      </div>

      {/* PayPal button */}
      <div className="rounded-lg border border-border bg-background p-3">
        <PayPalButton
          amount={amount}
          currency="USD"
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>

      {/* Status */}
      {paymentStatus && (
        <div
          className={`rounded-lg border p-3 text-center text-sm ${
            paymentStatus.type === "success"
              ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {paymentStatus.message}
        </div>
      )}
    </div>
  );
};

export default PaypalPayment;
