// components/content/CardAddToCart.tsx
"use client";

import React, { useState } from "react";
import { ShoppingCart, Add, Remove } from "@mui/icons-material";
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
  const updateItem = cart?.updateItem;
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

  const handleQty = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!line || typeof updateItem !== "function") return;
    const qty = Number(line.quantity) || 1;
    const lineId = line._id ?? line.productId ?? line.product?._id ?? productId;
    updateItem(lineId, qty + delta);
  };

  const dim = size === "sm" ? "h-8" : "h-9";
  const iconFs = size === "sm" ? 14 : 16;

  if (line) {
    const qty = Number(line.quantity) || 1;
    return (
      <div
        className={`${dim} flex items-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background`}
      >
        <button
          type="button"
          onClick={(e) => handleQty(e, -1)}
          disabled={loading || qty <= 1}
          aria-label="Decrease quantity"
          className="flex h-full w-7 items-center justify-center transition hover:bg-white/15 disabled:opacity-40"
        >
          <Remove style={{ fontSize: iconFs }} />
        </button>
        <span className="min-w-[1.25rem] text-center text-xs font-semibold">
          {qty}
        </span>
        <button
          type="button"
          onClick={(e) => handleQty(e, 1)}
          disabled={loading}
          aria-label="Increase quantity"
          className="flex h-full w-7 items-center justify-center transition hover:bg-white/15 disabled:opacity-40"
        >
          <Add style={{ fontSize: iconFs }} />
        </button>
      </div>
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
