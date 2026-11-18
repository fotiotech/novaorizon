import api from "@/lib/api";

/**
 * Customer review history — `/api/reviews/mine`.
 * Reviews are stored on the product document, one row per customer.
 */

export interface CustomerReview {
  _id: string;
  productId: { _id: string; name: string; mainImage?: string };
  rating: number;
  reviewText: string;
  helpfulCount: number;
  mediaUrl?: string[];
  createdAt: string;
}

export async function getCustomerProfile(_userId?: string) {
  try {
    const res = await api.get<{ data: any }>("/users/me");
    return { success: true, customer: res.data?.data ?? null };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.error ?? "Unable to load your profile.",
    };
  }
}

export async function getCustomerReviews(
  _userId?: string,
  options?: { page?: number; limit?: number },
): Promise<{
  success: boolean;
  reviews: CustomerReview[];
  total: number;
  pages: number;
  currentPage?: number;
  error?: string;
}> {
  try {
    const res = await api.get<{
      data: {
        reviews: CustomerReview[];
        total: number;
        pages: number;
        currentPage: number;
      };
    }>("/reviews/mine", {
      params: { page: options?.page ?? 1, limit: options?.limit ?? 8 },
    });

    const d = res.data?.data;
    return {
      success: true,
      reviews: Array.isArray(d?.reviews) ? d.reviews : [],
      total: d?.total ?? 0,
      pages: d?.pages ?? 1,
      currentPage: d?.currentPage ?? 1,
    };
  } catch (error: any) {
    return {
      success: false,
      reviews: [],
      total: 0,
      pages: 0,
      error:
        error?.response?.data?.error ?? "Unable to load your reviews.",
    };
  }
}

export async function deleteCustomerReview(
  reviewId: string,
  _userId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // The page passes `_id` shaped `<productId>-<index>`; the product id is
    // the part before the last dash.
    const productId = reviewId.includes("-")
      ? reviewId.slice(0, reviewId.lastIndexOf("-"))
      : reviewId;

    await api.delete(`/reviews/mine/${encodeURIComponent(productId)}`);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error:
        error?.response?.data?.error ?? "Unable to delete this review.",
    };
  }
}