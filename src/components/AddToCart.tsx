"use client";

import { useCart } from "@/app/context/CartContext";
import { useState } from "react";
import { useTrackEvent } from "./EventTracker";

interface Product {
  _id: string;
  name: string;
  image?: string;
  gallery?: string[];
  price: number;
}

interface AddToCartProps {
  product: Product | null;
  showQuantityWhenInCart?: boolean;
}

// Try several shapes in case the cart line doesn't key on the product _id.
function findCartLine(items: any[], productId: string) {
  if (!Array.isArray(items)) return undefined;
  return items.find(
    (it: any) =>
      it?._id === productId ||
      it?.productId === productId ||
      it?.product?._id === productId,
  );
}

const AddToCart = ({
  product,
  showQuantityWhenInCart = true,
}: AddToCartProps) => {
  const track = useTrackEvent();
  const cart = useCart() as any;
  const items: any[] = Array.isArray(cart?.items) ? cart.items : [];
  const addItem = cart?.addItem;
  const updateItem = cart?.updateItem;
  const removeItem = cart?.removeItem;
  const loading = !!cart?.loading;
  const [isAdding, setIsAdding] = useState(false);

  if (!product) return null;

  const line = showQuantityWhenInCart
    ? findCartLine(items, product._id)
    : undefined;

  // Log once per render so you can see what's happening in the console.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[AddToCart]", {
      productId: product._id,
      line: line ?? null,
      itemIds: items.map((it) => it?._id),
      hasAddItem: typeof addItem,
      hasUpdateItem: typeof updateItem,
    });
  }

  const handleAddToCart = async () => {
    if (!addItem) {
      console.error("[AddToCart] cart context has no addItem()");
      return;
    }
    setIsAdding(true);
    try {
      await addItem(product._id, undefined, 1);
      await track({
        itemId: product._id,
        eventType: "cart_add",
        metadata: { quantity: 1 },
      });
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (line && typeof updateItem === "function") {
    const busy = loading;
    const qty = Number(line.quantity) || 1;
    const lineId =
      line._id ?? line.productId ?? line.product?._id ?? product._id;

    return (
      <div className="flex w-full items-center justify-between rounded-md border border-input bg-background">
        <button
          type="button"
          onClick={() => updateItem(lineId, qty - 1)}
          disabled={busy || qty <= 1}
          aria-label="Decrease quantity"
          className="px-3 py-2 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className="px-3 py-2 text-sm font-medium text-foreground">
          {qty} in cart
        </span>
        <button
          type="button"
          onClick={() => updateItem(lineId, qty + 1)}
          disabled={busy}
          aria-label="Increase quantity"
          className="px-3 py-2 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={isAdding || loading}
      className="border border-border rounded-lg p-2 bg-accent text-primary-foreground hover:bg-primary/90 w-full shadow-lg font-semibold transition disabled:opacity-50"
    >
      {isAdding ? "Adding..." : "Add To Cart"}
    </button>
  );
};

export default AddToCart;
