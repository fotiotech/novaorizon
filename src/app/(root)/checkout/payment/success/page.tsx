"use client";

import { updateOrderStatus } from "@/app/actions/monetbil_payment";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/app/context/CartContext";
import { toast } from "react-hot-toast";

export default function PaymentSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const { dispatch: cartDispatch } = useCart();
  const [isProcessing, setIsProcessing] = useState(true);

  const transaction_id = params.get("transaction_id");
  const orderNumber = params.get("orderNumber");
  const email = params.get("email");
  const firstName = params.get("first_name");
  const lastName = params.get("last_name");
  const status = params.get("status");

  useEffect(() => {
    async function updatePaymentInfos() {
      try {
        if (!email || !transaction_id || !status) {
          throw new Error("Missing payment information");
        }

        // Update order status
        await updateOrderStatus(email, transaction_id, status);

        // Clear cart if payment was successful
        if (status === "paid") {
          cartDispatch({ type: "CLEAR_CART" });
          toast.success("Payment successful! Thank you for your purchase.");
        } else {
          toast.error("Payment was not successful. Please try again.");
        }
      } catch (error) {
        console.error("Error updating payment status:", error);
        toast.error("Something went wrong while processing your payment.");
      } finally {
        setIsProcessing(false);
      }
    }
    updatePaymentInfos();
  }, [email, transaction_id, status, cartDispatch]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Processing your payment...</p>
          </div>
        ) : status === "success" ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <div className="space-y-3 text-gray-600">
              <p className="font-medium">Order #{orderNumber}</p>
              <p>Transaction ID: {transaction_id}</p>
              <p>
                Thank you, {firstName} {lastName}!
              </p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => router.push("/orders")}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Orders
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
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
              We couldn't process your payment. Please try again or contact
              support.
            </p>
            <button
              onClick={() => router.push("/checkout")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
