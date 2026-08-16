"use client";

import React, { useEffect, useState } from "react";
import PayPalButton from "@/app/(profile)/components/payments/PaypalButton";
import { findOrders } from "@/app/actions/order";
import { useUserData } from "@/app/context/UserDataContext";

interface PaypalPaymentProps {
  payment_ref?: string;
}

const PaypalPayment: React.FC<PaypalPaymentProps> = ({ payment_ref }) => {
  const { user } = useUserData();
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
        const res = await findOrders(payment_ref);
        if (Array.isArray(res) && res.length > 0) {
          setOrder(res[0]);
        } else if (res && !Array.isArray(res)) {
          setOrder(res);
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
    return <p>Loading order details...</p>;
  }

  if (!order && payment_ref) {
    return <p>Order not found.</p>;
  }

  // Determine amount from order or fallback
  const amount = order?.total?.toString() || "0.00";

  return (
    <div className="my-3">
      <PayPalButton
        amount={amount}
        currency="USD"
        onSuccess={handleSuccess}
        onError={handleError}
      />
      {paymentStatus && <p className="mt-2 text-center">{paymentStatus}</p>}
    </div>
  );
};

export default PaypalPayment;
