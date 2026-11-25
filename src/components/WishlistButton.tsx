"use client";

import { useEffect, useState } from "react";
import { Favorite, FavoriteBorder } from "@mui/icons-material";
import { useSession } from "@/lib/session";
import {
  addToWishlist,
  isWishlisted,
  removeFromWishlist,
} from "@/lib/api/wishlist";

export function WishlistButton({ productId }: { productId: string }) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let cancelled = false;
    isWishlisted(productId)
      .then((value) => {
        if (!cancelled) setWishlisted(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [productId, status, user]);

  if (status === "loading" || !user) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      if (wishlisted) await removeFromWishlist(productId);
      else await addToWishlist(productId);
      setWishlisted((value) => !value);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary disabled:opacity-50"
    >
      {wishlisted ? (
        <Favorite fontSize="small" className="text-primary" />
      ) : (
        <FavoriteBorder fontSize="small" />
      )}
    </button>
  );
}
