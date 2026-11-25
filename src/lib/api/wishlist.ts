import api from "@/lib/api";

export interface WishlistItem {
  _id: string;
  product: any;
  createdAt?: string;
}

export async function getWishlist(): Promise<WishlistItem[]> {
  const res = await api.get<{ data: WishlistItem[] }>("/wishlist");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function isWishlisted(productId: string): Promise<boolean> {
  const res = await api.get<{ data: { wishlisted: boolean } }>(
    `/wishlist/${encodeURIComponent(productId)}`,
  );
  return Boolean(res.data?.data?.wishlisted);
}

export async function addToWishlist(productId: string): Promise<void> {
  await api.post(`/wishlist/${encodeURIComponent(productId)}`);
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await api.delete(`/wishlist/${encodeURIComponent(productId)}`);
}
