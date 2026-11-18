import api from "@/lib/api";

/**
 * Billing addresses — `/api/addresses` (signed-in customers).
 *
 * TODO(migration): guest addresses have no backend endpoint; guest carts keep
 * their address inline at checkout.
 */

export interface AddressInput {
  label: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

function readAddressForm(formData: FormData): AddressInput {
  return {
    label: String(formData.get("label") ?? "").trim(),
    street: String(formData.get("street") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim() || undefined,
    postalCode: String(formData.get("postalCode") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim() || "Cameroon",
    isDefault:
      formData.get("isDefault") === "on" ||
      formData.get("isDefault") === "true",
  };
}

export async function createAddress(formData: FormData, _guestId?: string) {
  const input = readAddressForm(formData);

  if (!input.label || !input.street || !input.city || !input.postalCode) {
    throw new Error("Please fill in all required address fields.");
  }

  const res = await api.post<{ data: any }>("/addresses", input);
  return { success: true as const, address: res.data?.data };
}

/** Guest addresses are not supported server-side. */
export async function mergeGuestAddresses(_args?: {
  guestId?: string;
  userId?: string;
}): Promise<{ success: true; merged: false }> {
  return { success: true, merged: false };
}

export async function getUserAddresses(): Promise<any[]> {
  try {
    const res = await api.get<{ data: any[] }>("/addresses");
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch (error) {
    console.error("[getUserAddresses] failed:", error);
    return [];
  }
}

export async function updateAddress(addressId: string, formData: FormData) {
  const input = readAddressForm(formData);

  try {
    const res = await api.patch<{ data: any }>(
      `/addresses/${encodeURIComponent(addressId)}`,
      input,
    );
    return { success: true as const, address: res.data?.data };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      throw new Error("Address not found or unauthorized");
    }
    throw new Error(
      error?.response?.data?.error ?? "Unable to update this address.",
    );
  }
}

export async function deleteAddress(addressId: string) {
  try {
    await api.delete(`/addresses/${encodeURIComponent(addressId)}`);
    return { success: true as const, message: "Address deleted successfully" };
  } catch (error: any) {
    if (error?.response?.status === 409) {
      throw new Error(
        "Cannot delete this address because it is linked to an existing credit card. Please remove the card first.",
      );
    }
    if (error?.response?.status === 404) {
      throw new Error("Address not found or unauthorized");
    }
    throw new Error(
      error?.response?.data?.error ?? "Unable to delete this address.",
    );
  }
}

export async function setDefaultAddress(addressId: string) {
  try {
    const res = await api.patch<{ data: any }>(
      `/addresses/${encodeURIComponent(addressId)}/default`,
    );
    return { success: true as const, address: res.data?.data };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      throw new Error("Address not found or unauthorized");
    }
    throw new Error(
      error?.response?.data?.error ?? "Unable to set this as your default.",
    );
  }
}
