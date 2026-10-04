"use client";

import { useState } from "react";
import { createAddress, updateAddress } from "@/app/actions/address";
import { IAddress } from "@/models/Address";

interface AddressFormProps {
  initialData?: IAddress | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FieldProps {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  name,
  required,
  placeholder,
  defaultValue,
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
      type="text"
      id={name}
      name={name}
      required={required}
      placeholder={placeholder}
      defaultValue={defaultValue}
      className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>
);

export default function AddressForm({
  initialData = null,
  onSuccess,
  onCancel,
}: AddressFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUpdate = !!initialData;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const result =
        isUpdate && initialData?._id
          ? await updateAddress(initialData._id.toString(), formData)
          : await createAddress(formData);

      if (result.success) {
        form.reset();
        onSuccess?.();
      } else {
        setError("Failed to save address. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Field
        label="Label"
        name="label"
        required
        placeholder="Home, Office…"
        defaultValue={initialData?.label || ""}
      />

      <Field
        label="Street"
        name="street"
        required
        placeholder="Street address"
        defaultValue={initialData?.street || ""}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="City"
          name="city"
          required
          placeholder="City"
          defaultValue={initialData?.city || ""}
        />
        <Field
          label="State"
          name="state"
          placeholder="Optional"
          defaultValue={initialData?.state || ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Postal code"
          name="postalCode"
          required
          placeholder="00000"
          defaultValue={initialData?.postalCode || ""}
        />
        <Field
          label="Country"
          name="country"
          placeholder="Country"
          defaultValue={initialData?.country || "Cameroon"}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground">
        <input
          type="checkbox"
          id="isDefault"
          name="isDefault"
          defaultChecked={initialData?.isDefault || false}
          className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
        />
        Set as default address
      </label>

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
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Saving…" : isUpdate ? "Update address" : "Add address"}
        </button>
      </div>
    </form>
  );
}
