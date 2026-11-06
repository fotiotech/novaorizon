"use client";

import {
  getCheckoutOrderAction,
  startMonetbilPayment,
} from "@/app/actions/checkout";
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
  const [operator, setOperator] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(orderTotal ?? 0);
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!payment_ref) return;
    getCheckoutOrderAction(payment_ref)
      .then((order) => {
        if (cancelled || !order) return;
        setAmount(order.total);
        setOrderStatus(order.paymentStatus);
      })
      .catch(() => {
        if (!cancelled) setError("We could not load this order.");
      });
    return () => {
      cancelled = true;
    };
  }, [payment_ref]);

  const fetchPaymentLink = async (selectedOperator: string) => {
    if (!payment_ref) {
      setError("This order has no payment reference.");
      return;
    }

    setOperator(selectedOperator);
    setLoading(true);
    setPaymentLink(null);
    setError(null);

    try {
      const result = await startMonetbilPayment(payment_ref, selectedOperator);
      setAmount(result.amount);
      setPaymentLink(result.paymentUrl);
    } catch (err: any) {
      setError(err?.message ?? "Could not start the mobile money payment.");
    } finally {
      setLoading(false);
    }
  };

  if (!payment_ref) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
        This order has no payment reference.
      </div>
    );
  }

  if (orderStatus === "paid") {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center text-sm text-green-700">
        This order is already paid.
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
          Order #{payment_ref}
        </p>
      </div>

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
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}

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
            <span className="block w-full rounded-lg bg-primary px-4 py-3 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Proceed to Pay
            </span>
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
