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
      className="border border-border rounded-lg p-2 bg-accent text-primary-foreground hover:bg-primary/90 w-full shadow-lg font-semibold transition disabled:opacity-50"
    >
      {isAdding ? "Adding..." : "Add To Cart"}
    </button>
  );
};

export default AddToCart;
