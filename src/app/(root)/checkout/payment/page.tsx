"use client";

import { findOrders } from "@/app/actions/order";
import MonetBilPayment from "@/components/payments/MonetBilPayment";
import PaypalPayment from "@/components/payments/PaypalPayment";
import { Orders } from "@/constant/types";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const PaymentPage: React.FC = () => {
  const orderNumber = useSearchParams()?.get("orderNumber");
  const [order, setOrder] = useState<Orders | null>(null);

  useEffect(() => {
    async function getOrder() {
      if (orderNumber) {
        const response = await findOrders(orderNumber, undefined);
        setOrder(response as any);
      }
    }
    getOrder();
  }, [orderNumber]);

  let content;

  if (order?.paymentMethod) {
    switch (order.paymentMethod) {
      case "Mobile Money":
        content = <MonetBilPayment />;
        break;
      case "Paypal":
        content = <PaypalPayment />;
        break;
      default:
        content = <p>Invalid payment method or no payment method selected.</p>;
        break;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Payment</h2>
        <div className="mb-6 text-center">
          <p className="text-lg">
            Payment Method: <span className="font-semibold">{order?.paymentMethod || "Loading..."}</span>
          </p>
        </div>
        <div>{content}</div>
      </div>
    </div>
  );
};

export default PaymentPage;