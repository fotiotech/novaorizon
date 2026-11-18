import api from "@/lib/api";

/**
 * Product reviews — `POST /api/reviews/products/:id`.
 * The backend upserts one row per signed-in user on the product document.
 */
export async function addProductReview(input: {
  productId: string;
  userId?: string;
  rating: number;
  comment?: string;
}): Promise<{ success: true }> {
  try {
    await api.post(`/reviews/products/${encodeURIComponent(input.productId)}`, {
      rating: input.rating,
      comment: (input.comment ?? "").trim().slice(0, 1000),
    });

    return { success: true };
  } catch (error: any) {
    const message =
      error?.response?.data?.error ??
      error?.response?.data?.fieldErrors?.rating?.[0] ??
      error?.message ??
      "Unable to save your review.";
    throw new Error(message);
  }
}
