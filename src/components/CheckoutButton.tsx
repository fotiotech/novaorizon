"use client";

import React, { FC, ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useCart } from "@/app/context/CartContext";
import { triggerNotification } from "@/app/actions/notifications";

interface Product {
  _id: string;
  identification_branding?: { name?: string };
  media_visuals?: { main_image?: string };
  pricing_availability?: { price?: number };
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
  bgColor = "bg-[#00002a]",
  textColor = "text-white",
  product,
  children,
}) => {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { dispatch, cart } = useCart();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const addProductToCart = () => {
    if (product && addedProductId !== product._id) {
      dispatch({
        type: "ADD_ITEM",
        payload: {
          id: product._id,
          name: product.identification_branding?.name ?? "",
          imageUrl: product.media_visuals?.main_image ?? "",
          price: product.pricing_availability?.price ?? 0,
          quantity: 1,
        },
      });
      setAddedProductId(product._id);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (product) addProductToCart();

    if (user?.id) {
      triggerNotification(user.id, `${user.name} is checking out!`).catch(
        console.error
      );
    }

    setProcessing(true);
  };

  useEffect(() => {
    if (processing && cart.length > 0) {
      router.push("/checkout");
    } else if (processing) {
      // Wait briefly to allow cart update before checking again
      const timeout = setTimeout(() => {
        if (cart.length > 0) router.push("/checkout");
        else setProcessing(false);
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [processing, cart, router]);

  return (
    <button
      title="Check Out"
      type="button"
      onClick={handleClick}
      className={`${width} ${height} ${bgColor} ${textColor} mx-auto rounded-lg shadow-lg font-semibold flex items-center justify-center p-2 hover:opacity-90`}
    >
      {processing ? "Processing..." : children}
    </button>
  );
};

export default CheckoutButton;
