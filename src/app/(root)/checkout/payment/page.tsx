"use client";

import { findOrders } from "@/app/actions/order";
import MonetBilPayment from "@/components/payments/MonetBilPayment";
import PaypalPayment from "@/components/payments/PaypalPayment";
import { Orders } from "@/constant/types";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const PaymentPage: React.FC = () => {
  const paymentMethod = useSearchParams()?.get("paymentMethod");

  let content;

  if (paymentMethod) {
    switch (paymentMethod) {
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
            Payment Method:{" "}
            <span className="font-semibold">
              {paymentMethod || "Loading..."}
            </span>
          </p>
        </div>
        <div>{content}</div>
      </div>
    </div>
  );
};

export default PaymentPage;
