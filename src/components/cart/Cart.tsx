"use client";

import { useCart } from "@/app/context/CartContext";
import { Delete } from "@mui/icons-material";
import Image from "next/image";
import { Prices } from "./Prices";
import { useCallback, useMemo, useState } from "react";

interface CartItemProps {
  item: any;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

// Memoized CartItem component to prevent unnecessary re-renders
const CartItem = ({ item, onUpdateQuantity, onRemove }: CartItemProps) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    // Small delay for smooth animation
    setTimeout(() => onRemove(item.id), 300);
  }, [item.id, onRemove]);

  const handleDecrease = useCallback(() => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  }, [item.id, item.quantity, onUpdateQuantity]);

  const handleIncrease = useCallback(() => {
    onUpdateQuantity(item.id, item.quantity + 1);
  }, [item.id, item.quantity, onUpdateQuantity]);

  return (
    <div
      className={`flex justify-between p-3 bg-white rounded-lg shadow-sm border transition-all duration-300 ${
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
              className="w-20 h-20 object-contain rounded-md bg-gray-100"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjBGMEYwIi8+CjxwYXRoIGQ9Ik00MCA0MEM0MCA0MCA0My4xIDQ0IDQ4IDQ0QzUyLjkgNDQgNTYgNDAgNTYgNDBNMjQgNDBDMjQgNDAgMjcuMSAzNiAzMiAzNkMzNi45IDM2IDQwIDQwIDQwIDQwIiBzdHJva2U9IiNDOEM4QzgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo="
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
          <p className="text-gray-600 mt-1">
            Price:{" "}
            <span className="font-bold ml-1">
              <Prices amount={item.price} />
            </span>
          </p>
          <div className="flex items-center mt-2">
            <span className="text-gray-600 mr-2">Quantity:</span>
            <div className="flex items-center border rounded-md">
              <button
                onClick={handleDecrease}
                disabled={item.quantity <= 1}
                className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="px-2 py-1 text-gray-800 font-medium min-w-[2rem] text-center">
                {item.quantity}
              </span>
              <button
                onClick={handleIncrease}
                className="px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Increase quantity"
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
          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
          aria-label="Remove item"
        >
          <Delete fontSize="small" />
        </button>
        <div className="text-lg font-bold text-gray-900 whitespace-nowrap">
          <Prices amount={item.price * item.quantity} />
        </div>
      </div>
    </div>
  );
};

// Main Cart component
const Cart = () => {
  const { cart, dispatch } = useCart();
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  const handleRemove = useCallback(
    (id: string) => {
      dispatch({ type: "REMOVE_ITEM", payload: id });
    },
    [dispatch]
  );

  const handleUpdateQuantity = useCallback(
    (id: string, quantity: number) => {
      dispatch({
        type: "UPDATE_QUANTITY",
        payload: { id, quantity },
      });
    },
    [dispatch]
  );

  // Calculate total using useMemo to avoid recalculating on every render
  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-gray-400"
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Your cart is empty
        </h3>
        <p className="text-gray-500">Add some products to get started</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-600">
          {cart.length} {cart.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="space-y-4">
        {cart.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span>
            <Prices amount={total} />
          </span>
        </div>

        
      </div>
    </div>
  );
};

export default Cart;
