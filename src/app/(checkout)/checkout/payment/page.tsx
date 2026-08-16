"use client";

import { useSearchParams } from "next/navigation";
import React from "react";
import MonetBilPayment from "@/app/(profile)/components/payments/MonetBilPayment";
import PaypalPayment from "@/app/(profile)/components/payments/PaypalPayment";
import CreditCardPayment from "@/app/(profile)/components/payments/CreditCardPayment";

const PaymentPage: React.FC = () => {
  const searchParams = useSearchParams();
  const payment_ref = searchParams?.get("payment_ref") || undefined;
  const paymentMethod = searchParams?.get("paymentMethod") || "";

  let content;

  if (paymentMethod) {
    switch (paymentMethod) {
      case "Mobile Money":
        content = <MonetBilPayment payment_ref={payment_ref} />;
        break;
      case "Paypal":
        content = <PaypalPayment payment_ref={payment_ref} />;
        break;
      case "Credit Card":
        content = <CreditCardPayment />;
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
