"use client";

import React, { useEffect, useState } from "react";
import PayPalButton from "@/app/(profile)/components/payments/PaypalButton";
import { findOrders } from "@/app/actions/order";

interface PaypalPaymentProps {
  payment_ref?: string;
}

const PaypalPayment: React.FC<PaypalPaymentProps> = ({ payment_ref }) => {
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!payment_ref) {
      setLoading(false);
      return;
    }
    const fetchOrder = async () => {
      try {
        // ✅ Correct usage: pass an object with orderNumber
        const response = await findOrders({ orderNumber: payment_ref });
        if (response?.orders && response.orders.length > 0) {
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
    setPaymentStatus(
      `Payment successful! Transaction completed by ${details.payer.name.given_name}`,
    );
  };

  const handleError = (error: any) => {
    setPaymentStatus(`Payment failed: ${error}`);
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading order details...</p>;
  }

  if (!order && payment_ref) {
    return <p className="text-destructive">Order not found.</p>;
  }

  const amount = order?.total?.toString() || "0.00";

  return (
    <div className="my-3">
      <PayPalButton
        amount={amount}
        currency="USD"
        onSuccess={handleSuccess}
        onError={handleError}
      />
      {paymentStatus && (
        <p className="mt-2 text-center text-foreground">{paymentStatus}</p>
      )}
    </div>
  );
};

export default PaypalPayment;