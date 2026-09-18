"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getUserPaymentMethods,
  deletePaymentMethod,
} from "@/app/actions/payment";
import { getUserAddresses } from "@/app/actions/address";
import { toast } from "react-hot-toast";
import PaymentMethodForm from "../../components/PaymentMethodForm";
import Modal from "@/components/ui/Modal";

// ---------- Small helpers for display ----------
function getMethodMeta(pm: any) {
  switch (pm.methodType) {
    case "CreditCard":
      return {
        icon: (
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
              d="M3 10h18M7 15h2m4 0h6M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
            />
          </svg>
        ),
        title: `Card •••• ${pm.details?.cardNumber?.slice(-4) || "XXXX"}`,
        subtitle: pm.details?.cardholderName || "Credit / Debit card",
        accent: "bg-blue-500/10 text-blue-600",
      };
    case "MobileMoney": {
      const providerName =
        pm.details?.provider === "CM_MTNMOBILEMONEY"
          ? "MTN"
          : pm.details?.provider === "CM_ORANGEMONEY"
            ? "Orange"
            : pm.details?.provider === "CM_EUMM"
              ? "Express Union"
              : pm.details?.provider || "Mobile Money";
      return {
        icon: (
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
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        ),
        title: providerName,
        subtitle: pm.details?.phoneNumber || "",
        accent: "bg-orange-500/10 text-orange-600",
      };
    }
    case "PayPal":
      return {
        icon: (
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
              d="M17 9V7a5 5 0 00-10 0v2M5 9h14l-1 11H6L5 9z"
            />
          </svg>
        ),
        title: "PayPal",
        subtitle: pm.details?.email || "",
        accent: "bg-indigo-500/10 text-indigo-600",
      };
    default:
      return {
        icon: null,
        title: pm.methodType,
        subtitle: "",
        accent: "bg-muted text-muted-foreground",
      };
  }
}

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [addrs, methods] = await Promise.all([
        getUserAddresses(),
        getUserPaymentMethods(),
      ]);
      setAddresses(Array.isArray(addrs) ? (addrs as any[]) : []);
      setPaymentMethods(Array.isArray(methods) ? methods : []);
    } catch (err) {
      console.error("Failed to load payment data:", err);
      toast.error("Could not load your payment methods.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this payment method?")) return;
    try {
      await deletePaymentMethod(id);
      toast.success("Payment method removed");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove payment method.");
    }
  };

  const handleSuccess = () => {
    setShowForm(false);
    toast.success("Payment method added");
    loadData();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Payment methods
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage how you pay at checkout.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add method
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            Loading payment methods…
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-6 w-6 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h2m4 0h6M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-foreground">
              No payment methods yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a card, mobile money, or PayPal account to check out faster.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Add your first method
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {paymentMethods.map((pm: any) => {
              const meta = getMethodMeta(pm);
              return (
                <li
                  key={pm._id?.toString()}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.accent}`}
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {meta.title}
                    </p>
                    {meta.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">
                        {meta.subtitle}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(pm._id?.toString())}
                    className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add method modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add payment method"
        description="Choose how you'd like to pay at checkout."
        size="lg"
      >
        <PaymentMethodForm
          addresses={addresses}
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
