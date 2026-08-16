"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/outline"; // optional, you can use any icon

interface CashOnDeliveryProps {
  orderNumber: string;
  redirectDelay?: number; // in milliseconds, default 5000 (5s)
}

const CashOnDelivery: React.FC<CashOnDeliveryProps> = ({
  orderNumber,
  redirectDelay = 5000,
}) => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile after the delay
    const timer = setTimeout(() => {
      router.push("/profile");
    }, redirectDelay);

    return () => clearTimeout(timer);
  }, [router, redirectDelay]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="flex justify-center mb-4">
        <CheckCircleIcon className="w-16 h-16 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Order Placed Successfully!
      </h2>
      <p className="text-gray-600 mb-4">
        Your order <span className="font-semibold">#{orderNumber}</span> has
        been confirmed.
      </p>
      <p className="text-gray-600 mb-6">
        You will pay <span className="font-semibold">Cash on Delivery</span>{" "}
        when your order arrives.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
        <p>
          You will be redirected to your profile in a few seconds.
          <br />
          If not,{" "}
          <button
            onClick={() => router.push("/profile")}
            className="underline font-medium"
          >
            click here
          </button>
          .
        </p>
      </div>
    </div>
  );
};

export default CashOnDelivery;
