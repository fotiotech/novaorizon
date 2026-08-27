"use client";

import { useCart } from "@/app/context/CartContext";
import { Delete } from "@mui/icons-material";
import Image from "next/image";
import { Prices } from "./Prices";
import { useCallback, useState } from "react";

const CartItem = ({ item, onUpdate, onRemove }: any) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => onRemove(item._id), 300);
  }, [item._id, onRemove]);

  const handleDecrease = useCallback(() => {
    if (item.quantity > 1) onUpdate(item._id, item.quantity - 1);
  }, [item._id, item.quantity, onUpdate]);

  const handleIncrease = useCallback(() => {
    onUpdate(item._id, item.quantity + 1);
  }, [item._id, item.quantity, onUpdate]);

  return (
    <div
      className={`flex justify-between p-3 bg-background rounded-lg border border-border shadow-sm transition-all duration-300 ${
        isRemoving ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="flex gap-3 flex-1 min-w-0">
        {item.imageUrl && (
          <div className="relative flex-shrink-0">
            <Image
              src={item.imageUrl}
              width={80}
              height={80}
              alt={item.name || "Cart item"}
              className="w-20 h-20 object-contain rounded-md bg-muted"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjBGMEYwIi8+CjxwYXRoIGQ9Ik00MCA0MEM0MCA0MCA0My4xIDQ0IDQ4IDQ0QzUyLjkgNDQgNTYgNDAgNTYgNDBNMjQgNDBDMjQgNDAgMjcuMSAzNiAzMiAzNkMzNi45IDM2IDQwIDQwIDQwIDQwIiBzdHJva2U9IiNDOEM4QzgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo="
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{item.name}</h3>
          <p className="text-muted-foreground mt-1">
            <span className="font-bold ml-1 text-primary">
              <Prices amount={item.price} />
            </span>
          </p>
          <div className="flex items-center mt-2">
            <span className="text-muted-foreground mr-2">Quantity:</span>
            <div className="flex items-center border border-input rounded-md">
              <button
                onClick={handleDecrease}
                disabled={item.quantity <= 1}
                className="px-2 py-1 text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                -
              </button>
              <span className="px-2 py-1 text-foreground font-medium min-w-[2rem] text-center">
                {item.quantity}
              </span>
              <button
                onClick={handleIncrease}
                className="px-2 py-1 text-foreground hover:bg-muted transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between pl-2">
        <button
          onClick={handleRemove}
          className="text-destructive hover:text-destructive/80 p-1 rounded-full hover:bg-destructive/10 transition-colors"
        >
          <Delete fontSize="small" />
        </button>
        <div className="text-lg hidden lg:block font-bold text-foreground whitespace-nowrap">
          <Prices amount={item.price * item.quantity} />
        </div>
      </div>
    </div>
  );
};

const Cart = () => {
  const {
    items,
    subtotal,
    tax,
    discount,
    shippingCost,
    total,
    loading,
    updateItem,
    removeItem,
    clearCart,
  } = useCart();

  const handleUpdate = useCallback(
    (id: string, quantity: number) => updateItem(id, quantity),
    [updateItem],
  );
  const handleRemove = useCallback(
    (id: string) => removeItem(id),
    [removeItem],
  );
  const handleClear = useCallback(() => {
    if (
      items.length > 0 &&
      confirm("Are you sure you want to clear your cart?")
    )
      clearCart();
  }, [items, clearCart]);

  if (loading && items.length === 0)
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading cart...
      </div>
    );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Your cart is empty
        </h3>
        <p className="text-muted-foreground">
          Add some products to get started
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <span className="text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
        <button
          onClick={handleClear}
          className="text-sm text-destructive hover:text-destructive/80 transition-colors"
        >
          Clear Cart
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <CartItem
            key={item._id}
            item={item}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-4 space-y-1">
        <div className="flex justify-between text-sm text-foreground">
          <span>Subtotal</span>
          <span>
            <Prices amount={subtotal} />
          </span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-sm text-foreground">
            <span>Tax</span>
            <span>
              <Prices amount={tax} />
            </span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span>Discount</span>
            <span>
              -<Prices amount={discount} />
            </span>
          </div>
        )}
        {shippingCost > 0 && (
          <div className="flex justify-between text-sm text-foreground">
            <span>Shipping</span>
            <span>
              <Prices amount={shippingCost} />
            </span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t border-border pt-2 text-foreground">
          <span>Total</span>
          <span>
            <Prices amount={total} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default Cart;
