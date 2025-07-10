// OrderButton.tsx
"use client";

import React, { useState, useEffect } from "react";
import { triggerNotification } from "@/app/actions/notifications";
import { useUser } from "@/app/context/UserContext";
import { useRouter } from "next/navigation";

interface OrderButtonProps {
  paymentMethod?: string;
}

const ProceedPaymentButton: React.FC<OrderButtonProps> = ({
  paymentMethod,
}) => {
  const { user } = useUser();
  const router = useRouter();
  const [isOrderPlaced, setIsOrderPlaced] = useState<boolean>(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!paymentMethod) return;

    router.push(
      `/checkout/payment?paymentMethod=${encodeURIComponent(paymentMethod)}`
    );

    setIsOrderPlaced(true);
    if (user?._id) {
      await triggerNotification(
        user._id,
        `${user.name} is proceeding payment!`
      );
    }
  };

  const isDisabled = !paymentMethod;

  return (
    <div className="text-center">
      <button
        type="button"
        disabled={isDisabled}
        onClick={handleClick}
        className={`w-full p-2 font-bold text-white rounded-2xl ${
          isDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        Proceed to Payment...
      </button>
    </div>
  );
};

export default ProceedPaymentButton;
