// OrderButton.tsx
"use client";

import React from "react";
import { triggerNotification } from "@/app/actions/notifications";
import { useUserData } from "@/app/context/UserDataContext";
import { useRouter } from "next/navigation";

interface OrderButtonProps {
  paymentMethod?: string;
}

const ProceedPaymentButton: React.FC<OrderButtonProps> = ({
  paymentMethod,
}) => {
  const { user } = useUserData();
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!paymentMethod) return;

    router.push(
      `/checkout/payment?paymentMethod=${encodeURIComponent(paymentMethod)}`,
    );

    // Send notification if user exists
    if (user?.id) {
      const userName = user?.firstName || user?.name?.split(" ")[0] || "A user";
      try {
        await triggerNotification(
          user.id,
          `${userName} is proceeding to payment!`,
        );
      } catch (error) {
        console.error("Failed to send notification:", error);
      }
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
