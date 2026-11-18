import api from "@/lib/api";

/** Profile — `/api/users/me`. */

export interface UserProfilePayload {
  name?: string;
  image?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
  phone?: {
    countryCode?: string | null;
    number?: string | null;
    e164?: string | null;
  };
  preferences?: Record<string, any>;
}

export async function getUserProfile(): Promise<any | null> {
  try {
    const res = await api.get<{ data: any }>("/users/me");
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

export async function updateUserProfile(payload: UserProfilePayload) {
  try {
    const res = await api.patch<{ data: any }>("/users/me", payload);
    return { user: res.data?.data };
  } catch (error: any) {
    console.error("[updateUserProfile] Error:", error);
    return {
      error:
        error?.response?.data?.error ?? "Unable to update your profile.",
    };
  }
}
