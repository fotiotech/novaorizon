"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function PaymentError() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");
  const orderNumber = params.get("orderNumber");

  useEffect(() => {
    toast.error(error || "Payment failed. Please try again.");
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Failed
        </h1>
        <p className="text-gray-600 mb-6">
          {error ||
            "We couldn't process your payment. Please try again or contact support."}
        </p>
        <div className="space-y-3">
          <button
            onClick={() =>
              orderNumber
                ? router.push(`/checkout?orderNumber=${orderNumber}`)
                : router.push("/checkout")
            }
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/contact")}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
