"use client";

import { useCart } from "@/app/context/CartContext";
import { useState } from "react";

interface Product {
  _id: string;
  name: string;
  image?: string;
  gallery?: string[];
  price: number;
}

const AddToCart = ({ product }: { product: Product | null }) => {
  const { addItem, loading } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  if (!product) return null;

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addItem(product._id, undefined, 1);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={isAdding || loading}
      className="border rounded-lg p-2 bg-blue-600 hover:bg-blue-700 w-full shadow-lg font-semibold text-white transition disabled:opacity-50"
    >
      {isAdding ? "Adding..." : "Add To Cart"}
    </button>
  );
};

export default AddToCart;
