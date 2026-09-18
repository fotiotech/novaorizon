"use client";

import React, { useEffect } from "react";
import MonetBilPayment from "@/app/(profile)/components/payments/MonetBilPayment";
import PaypalPayment from "@/app/(profile)/components/payments/PaypalPayment";
import CreditCardPayment from "@/app/(profile)/components/payments/CreditCardPayment";
import CashOnDelivery from "@/app/(profile)/components/payments/CashOnDelivery";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: string;
  paymentRef: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentMethod,
  paymentRef,
}) => {
  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let content: React.ReactNode = null;
  switch (paymentMethod) {
    case "MobileMoney":
      content = <MonetBilPayment payment_ref={paymentRef} />;
      break;
    case "PayPal":
      content = <PaypalPayment payment_ref={paymentRef} />;
      break;
    case "CreditCard":
      content = <CreditCardPayment />;
      break;
    case "CashOnDelivery":
      content = (
        <CashOnDelivery
          orderNumber={paymentRef || "N/A"}
          redirectDelay={5000}
        />
      );
      break;
    default:
      content = (
        <p className="text-center text-destructive">
          Invalid payment method or no payment method selected.
        </p>
      );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Payment"
    >
      <div
        className="scrollbar-hide relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Payment</h2>
            <p className="text-sm text-muted-foreground">
              Method:{" "}
              <span className="font-medium text-foreground">
                {paymentMethod}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close payment"
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Payment content */}
        <div className="p-5">{content}</div>
      </div>
    </div>
  );
};

export default PaymentModal;
