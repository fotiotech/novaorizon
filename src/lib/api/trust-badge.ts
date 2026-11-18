import api from "@/lib/api";

/** Matches the backend's serialized trust badge. */
export interface TrustBadgeDTO {
  _id: string;
  name: string;
  icon: string;
  title: string;
  description: string;
  popupText: string;
  link: string;
  isActive: boolean;
  sortOrder: number;
  usageCount?: number;
}

export interface TrustBadgeInput {
  name: string;
  icon: string;
  title: string;
  description?: string;
  popupText?: string;
  link?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

/**
 * GET /api/trust-badges/active — public.
 *
 * Never throws: the storefront renders without the strip when the API is
 * unreachable (e.g. during a CI build where the backend is not running).
 */
export async function listActiveTrustBadges(): Promise<TrustBadgeDTO[]> {
  try {
    const res = await api.get<{ data: TrustBadgeDTO[] }>("/trust-badges/active");
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch (error) {
    console.error("[listActiveTrustBadges] failed:", error);
    return [];
  }
}