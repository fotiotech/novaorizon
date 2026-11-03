// components/content/CardAddToCart.tsx
"use client";

import React, { useState } from "react";
import { ShoppingCart, Check } from "@mui/icons-material";
import { useCart } from "@/app/context/CartContext";

interface CardAddToCartProps {
  productId: string;
  name: string;
  image?: string;
  price: number;
  size?: "sm" | "md";
}

export function CardAddToCart({
  productId,
  name,
  image,
  price,
  size = "md",
}: CardAddToCartProps) {
  const cart = useCart() as any;
  const items: any[] = Array.isArray(cart?.items) ? cart.items : [];
  const addItem = cart?.addItem;
  const loading = !!cart?.loading;
  const [isAdding, setIsAdding] = useState(false);

  const line = items.find(
    (it: any) =>
      it?._id === productId ||
      it?.productId === productId ||
      it?.product?._id === productId,
  );

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!addItem || isAdding || loading) return;
    setIsAdding(true);
    try {
      await addItem(productId, undefined, 1);
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "AddToCart", {
          content_ids: productId,
          content_type: "product",
          content_name: name,
          value: price,
          currency: "XAF",
        });
      }
    } catch (err) {
      console.error("[CardAddToCart] add failed:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const dim = size === "sm" ? "h-8" : "h-9";
  const iconFs = size === "sm" ? 14 : 16;

  // In cart → non-interactive success badge. Clicks fall through to the
  // surrounding <Link> so tapping it still opens the product page.
  if (line) {
    return (
      <span
        className={`${dim} ${
          size === "sm" ? "w-8" : "w-9"
        } pointer-events-none flex items-center justify-center rounded-full bg-emerald-600 text-white shadow-md ring-2 ring-background`}
        aria-label="In cart"
      >
        <Check style={{ fontSize: iconFs }} />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={isAdding || loading}
      aria-label={`Add ${name} to cart`}
      className={`${dim} ${
        size === "sm" ? "w-8" : "w-9"
      } flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition hover:bg-primary/90 active:scale-95 disabled:opacity-50`}
    >
      {isAdding ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
      ) : (
        <ShoppingCart style={{ fontSize: iconFs }} />
      )}
    </button>
  );
}

export default CardAddToCart;
