"use client";

import { findOrders } from "@/app/actions/order";
import { generatePaymentLink } from "@/app/actions/monetbil_payment";
import { useCart } from "@/app/context/CartContext";
import { useUserData } from "@/app/context/UserDataContext";
import { CartItem } from "@/app/reducer/cartReducer";
import { MonetbilPaymentRequest } from "@/constant/types";
import React, { useEffect, useState } from "react";

interface MonetbilPaymentProps {
  payment_ref?: string;
  orderTotal?: number;
}

const OPERATORS = [
  {
    code: "CM_ORANGEMONEY",
    name: "Orange Money",
    subtitle: "Cameroun S.A",
    initials: "OM",
    accent: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  },
  {
    code: "CM_MTNMOBILEMONEY",
    name: "MTN Mobile Money",
    subtitle: "MTN Cameroon Ltd",
    initials: "MTN",
    accent: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  },
  {
    code: "CM_EUMM",
    name: "Express Union",
    subtitle: "Express Union Finance",
    initials: "EU",
    accent: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
];

function MonetbilPayment({ payment_ref, orderTotal }: MonetbilPaymentProps) {
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const { items } = useCart();
  const { user } = useUserData();
  const [operator, setOperator] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [order, setOrder] = useState<any>(null);

  // Generate a fallback order number if none provided
  useEffect(() => {
    const generateOrderNumber = () => {
      const datePart = new Date()
        .toISOString()
        .replace(/[-:ZT.]/g, "")
        .slice(0, 14);
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      return `ORD${datePart}${randomStr}`;
    };
    if (!payment_ref) {
      setOrderNumber(generateOrderNumber());
    }
  }, [payment_ref]);

  // Fetch order if payment_ref exists
  useEffect(() => {
    async function fetchOrder() {
      if (!payment_ref) return;
      try {
        const response = await findOrders({ orderNumber: payment_ref });
        if (response?.orders?.length > 0) {
          const foundOrder = response.orders[0];
          setOrder(foundOrder);
          if (foundOrder.orderNumber) {
            setOrderNumber(foundOrder.orderNumber);
          }
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      }
    }
    fetchOrder();
  }, [payment_ref]);

  const calculateTotal = (cartItems: CartItem[]) =>
    cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const amount = order?.total ?? orderTotal ?? calculateTotal(items);

  const getBillingDetails = () => {
    if (order?.billingAddress) {
      let phone = "";
      if (order.paymentMethodId && typeof order.paymentMethodId === "object") {
        phone = order.paymentMethodId.details?.phoneNumber || "";
      }
      return {
        phone,
        firstName:
          order.billingAddress.firstName ||
          user?.firstName ||
          user?.name?.split(" ")[0] ||
          "",
        lastName:
          order.billingAddress.lastName ||
          user?.lastName ||
          user?.name?.split(" ").slice(1).join(" ") ||
          "",
        email: order.billingAddress.email || user?.email || "",
      };
    }
    return {
      phone: "",
      firstName: user?.firstName || user?.name?.split(" ")[0] || "",
      lastName:
        user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
    };
  };

  const billing = getBillingDetails();

  const fetchPaymentLink = async (selectedOperator: string) => {
    setOperator(selectedOperator);
    setLoading(true);
    setPaymentLink(null);

    const paymentData: MonetbilPaymentRequest = {
      serviceKey: process.env.NEXT_PUBLIC_MONETBIL_KEY as string,
      orderNumber,
      amount,
      phone: billing.phone,
      user: user?.name || billing.firstName,
      firstName: billing.firstName,
      lastName: billing.lastName,
      email: billing.email,
      operator: selectedOperator,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/payment/success`,
      notifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/payment/notification`,
    };

    try {
      const link = await generatePaymentLink(paymentData);
      setPaymentLink(link);
    } catch (error) {
      console.error("Failed to generate payment link", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Error state: missing phone ----------
  if (!billing.phone) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <svg
            className="h-5 w-5 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-destructive">
          Phone number required
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Mobile money payments need a phone number on your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Amount summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Amount to pay
        </p>
        <p className="mt-1 text-2xl font-bold text-foreground">
          {amount.toLocaleString()}{" "}
          <span className="text-base font-medium text-muted-foreground">
            CFA
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Order #{orderNumber}
        </p>
      </div>

      {/* Operator selection */}
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Choose your operator
        </p>
        <div className="grid gap-2">
          {OPERATORS.map((op) => {
            const isSelected = operator === op.code;
            return (
              <button
                key={op.code}
                type="button"
                onClick={() => fetchPaymentLink(op.code)}
                disabled={loading}
                className={`group flex items-center gap-3 rounded-lg border p-3 text-left transition-all disabled:opacity-60 ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${op.accent}`}
                >
                  {op.initials}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {op.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {op.subtitle}
                  </span>
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30 group-hover:border-primary/50"
                  }`}
                >
                  {isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action area */}
      <div className="pt-1">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 py-3 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            Generating payment link…
          </div>
        ) : paymentLink ? (
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <button
              type="button"
              className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Proceed to Pay
            </button>
          </a>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Select an operator above to generate your payment link.
          </p>
        )}
      </div>
    </div>
  );
}

export default MonetbilPayment;
