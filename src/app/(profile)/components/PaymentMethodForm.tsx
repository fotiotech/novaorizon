"use client";

import { useState } from "react";
import { createPaymentMethod } from "@/app/actions/payment";
import type { IAddress } from "@/models/Address";

interface PaymentMethodFormProps {
  addresses: IAddress[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

type MethodType = "CreditCard" | "MobileMoney" | "PayPal";

const METHOD_OPTIONS: { value: MethodType; label: string; hint: string }[] = [
  {
    value: "CreditCard",
    label: "Credit / Debit Card",
    hint: "Visa, Mastercard",
  },
  {
    value: "MobileMoney",
    label: "Mobile Money",
    hint: "MTN, Orange, Express Union",
  },
  { value: "PayPal", label: "PayPal", hint: "Pay with your PayPal account" },
];

/**
 * IMPORTANT: these values must match MOBILE_MONEY_PROVIDERS
 * in `@/models/PaymentMethod` and the Zod enum in `@/app/actions/payment`.
 */
const MOBILE_MONEY_OPTIONS = [
  { value: "CM_MTNMOBILEMONEY", label: "MTN Mobile Money" },
  { value: "CM_ORANGEMONEY", label: "Orange Money" },
  { value: "CM_EUMM", label: "Express Union Mobile Money" },
] as const;

const inputClass =
  "block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring";

interface FieldProps {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  name,
  required,
  type = "text",
  placeholder,
  hint,
  inputMode,
  autoComplete,
}) => (
  <div>
    <label
      htmlFor={name}
      className="mb-1 block text-sm font-medium text-foreground"
    >
      {label}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      required={required}
      placeholder={placeholder}
      inputMode={inputMode}
      autoComplete={autoComplete}
      className={inputClass}
    />
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export default function PaymentMethodForm({
  addresses,
  onSuccess,
  onCancel,
}: PaymentMethodFormProps) {
  const [methodType, setMethodType] = useState<MethodType>("CreditCard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload =
      methodType === "CreditCard"
        ? {
            methodType: "CreditCard" as const,
            details: {
              cardNumber: (formData.get("cardNumber") as string) ?? "",
              expiryDate: (formData.get("expiryDate") as string) ?? "",
              cardholderName: (formData.get("cardholderName") as string) ?? "",
              billingAddressId:
                (formData.get("billingAddressId") as string) ?? "",
            },
          }
        : methodType === "MobileMoney"
          ? {
              methodType: "MobileMoney" as const,
              details: {
                phoneNumber: (formData.get("phoneNumber") as string) ?? "",
                provider: (formData.get("provider") as string) ?? "",
                reference: (formData.get("reference") as string) || undefined,
              },
            }
          : {
              methodType: "PayPal" as const,
              details: {
                email: (formData.get("email") as string) ?? "",
              },
            };

    try {
      const result = await createPaymentMethod(payload);

      if (result.success) {
        form.reset();
        onSuccess?.();
      } else {
        const firstFieldError = result.fieldErrors
          ? Object.values(result.fieldErrors)[0]
          : undefined;
        setError(
          firstFieldError ?? result.error ?? "Failed to add payment method.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  const cardBlocked = methodType === "CreditCard" && addresses.length === 0;

  const handleMethodChange = (next: MethodType) => {
    setMethodType(next);
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Method type selector as pill tabs */}
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Payment method <span className="text-destructive">*</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {METHOD_OPTIONS.map((opt) => {
            const selected = methodType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleMethodChange(opt.value)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <span className="block text-sm font-medium text-foreground">
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden input so FormData always carries the method type */}
      <input type="hidden" name="methodType" value={methodType} />

      {/* Dynamic fields */}
      {methodType === "CreditCard" && (
        <div className="space-y-4">
          <Field
            label="Card number"
            name="cardNumber"
            required
            placeholder="4111 1111 1111 1111"
            inputMode="numeric"
            autoComplete="cc-number"
            hint="Digits only – spaces are ignored."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Expiry date"
              name="expiryDate"
              required
              placeholder="MM/YY"
              inputMode="numeric"
              autoComplete="cc-exp"
            />
            <Field
              label="Cardholder name"
              name="cardholderName"
              required
              placeholder="John Doe"
              autoComplete="cc-name"
            />
          </div>
          <div>
            <label
              htmlFor="billingAddressId"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Billing address <span className="text-destructive">*</span>
            </label>
            <select
              id="billingAddressId"
              name="billingAddressId"
              required
              className={inputClass}
            >
              <option value="">Select an address</option>
              {addresses.map((addr) => (
                <option key={addr._id?.toString()} value={addr._id?.toString()}>
                  {addr.label} – {addr.street}, {addr.city}
                </option>
              ))}
            </select>
            {addresses.length === 0 && (
              <p className="mt-1 text-xs text-destructive">
                You need to add a billing address first.
              </p>
            )}
          </div>
        </div>
      )}

      {methodType === "MobileMoney" && (
        <div className="space-y-4">
          <Field
            label="Phone number"
            name="phoneNumber"
            type="tel"
            required
            placeholder="699999999"
            inputMode="tel"
            autoComplete="tel"
            hint="Cameroon format, e.g. 699999999"
          />
          <div>
            <label
              htmlFor="provider"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Mobile operator <span className="text-destructive">*</span>
            </label>
            <select
              id="provider"
              name="provider"
              required
              className={inputClass}
            >
              <option value="">Select operator</option>
              {MOBILE_MONEY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Reference"
            name="reference"
            placeholder="Transaction ID (optional)"
          />
        </div>
      )}

      {methodType === "PayPal" && (
        <Field
          label="PayPal email"
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          autoComplete="email"
        />
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || cardBlocked}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Add payment method"}
        </button>
      </div>
    </form>
  );
}
