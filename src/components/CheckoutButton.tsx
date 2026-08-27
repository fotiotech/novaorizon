"use client";

import React, { FC, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useCart } from "@/app/context/CartContext";
import { triggerNotification } from "@/app/actions/notifications";

interface Product {
  _id: string;
  name?: string;
  main_image?: string;
  price?: number;
}

interface CheckoutProps {
  width?: string;
  height?: string;
  bgColor?: string;
  textColor?: string;
  product?: Product;
  children: ReactNode;
}

const CheckoutButton: FC<CheckoutProps> = ({
  width = "w-44",
  height = "h-10",
  bgColor = "bg-primary-800", // now uses theme primary
  textColor = "text-primary-foreground",
  product,
  children,
}) => {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { addItem } = useCart();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!session) return signIn();

    if (product) {
      setAdding(true);
      try {
        await addItem(product._id, undefined, 1);
      } catch (error) {
        console.error("Failed to add product to cart:", error);
        setAdding(false);
        return;
      } finally {
        setAdding(false);
      }
    }

    if (user?.id) {
      triggerNotification(user.id, `${user.name} is checking out!`).catch(
        console.error,
      );
    }

    setProcessing(true);
    router.push("/checkout");
  };

  return (
    <button
      title="Check Out"
      type="button"
      onClick={handleClick}
      disabled={adding || processing}
      className={`${width} ${height} ${bgColor} ${textColor} mx-auto rounded-lg shadow-lg font-semibold flex items-center justify-center p-2 hover:opacity-90 disabled:opacity-50 transition`}
    >
      {adding ? "Adding..." : processing ? "Processing..." : children}
    </button>
  );
};

export default CheckoutButton;
