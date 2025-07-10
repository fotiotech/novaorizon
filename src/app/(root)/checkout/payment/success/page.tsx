"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/app/context/CartContext";
import { toast } from "react-hot-toast";
import { createOrUpdateOrder } from "@/app/actions/order";
import { CartItem } from "@/app/reducer/cartReducer";
import { calculateShippingPrice } from "@/app/actions/carrier";
import { useSession } from "next-auth/react";
import { useUser } from "@/app/context/UserContext";
import { CalcShippingPrice } from "../../page";

const DEFAULT_CARRIER_ID = "675eeda75a81d16c81aca736";

export default function PaymentSuccess() {
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const { dispatch: cartDispatch } = useCart();
  const user = session?.data?.user as any;
  const { customerInfos } = useUser();
  const { cart } = useCart();
  const [isProcessing, setIsProcessing] = useState(true);

  const transaction_id = params.get("transaction_id");
  const payment_ref = params.get("payment_ref");
  const email = params.get("email");
  const firstName = params.get("first_name");
  const lastName = params.get("last_name");
  const status = params.get("status");

  const [shippingPrice, setShippingPrice] = useState<CalcShippingPrice | null>(
    null
  );

  console.log("User data:", user);
  console.log("Customer Infos:", customerInfos);
  console.log("Transaction ID:", transaction_id);
  console.log("Payment Reference:", payment_ref);

  // Fetch shipping price when region changes
  useEffect(() => {
    if (!customerInfos?.shippingAddress?.region) return;
    const fetchCarrier = async () => {
      try {
        const res = await calculateShippingPrice(
          DEFAULT_CARRIER_ID,
          customerInfos.shippingAddress.region,
          0
        );
        setShippingPrice(res ?? null);
      } catch (err) {
        console.error("Error calculating shipping price:", err);
      }
    };
    fetchCarrier();
  }, [customerInfos?.shippingAddress?.region]);

  const calculateTotal = (items: CartItem[]) => {
    return items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );
  };

  useEffect(() => {
    async function updatePaymentInfos() {
      try {
        if (
          !user ||
          !customerInfos ||
          !payment_ref ||
          !transaction_id ||
          !status
        ) {
          throw new Error("Missing payment information");
        }

        const processingDays = 3;
        const transitDays = 5;
        const now = new Date();
        const estimatedShippingDate = new Date(now);
        estimatedShippingDate.setDate(now.getDate() + processingDays);
        const estimatedDeliveryDate = new Date(estimatedShippingDate);
        estimatedDeliveryDate.setDate(
          estimatedShippingDate.getDate() + transitDays
        );

        const subtotal = calculateTotal(cart);
        const shippingCost = shippingPrice?.shippingPrice ?? 0;
        const tax = 0;
        const total = subtotal + shippingCost + tax;

        const res = await createOrUpdateOrder(payment_ref, {
          userId: user?.id,
          email: customerInfos!.billingAddress?.email,
          firstName: customerInfos!.billingAddress?.firstName,
          lastName: customerInfos!.billingAddress?.lastName,
          products: cart.map((item) => ({
            productId: item.id,
            name: item.name,
            imageUrl: item.imageUrl,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal,
          tax,
          shippingCost,
          total,
          paymentStatus: status,
          transactionId: transaction_id,
          paymentMethod: customerInfos!.billingMethod!.methodType,
          shippingAddress: {
            street: customerInfos!.shippingAddress!.street,
            region: customerInfos!.shippingAddress!.region,
            city: customerInfos!.shippingAddress!.city,
            carrier: customerInfos!.shippingAddress!.carrier,
            address: customerInfos!.shippingAddress!.address || "excellence1",
            country: customerInfos!.shippingAddress!.country,
          },
          shippingStatus: "pending",
          shippingDate: estimatedShippingDate,
          deliveryDate: estimatedDeliveryDate,
          orderStatus: "processing",
          notes: "",
          couponCode: "",
          discount: 0,
        });

        if (!res) {
          throw new Error("Failed to create or update order");
        }

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
  }, [
    email,
    transaction_id,
    status,
    cartDispatch,
    user,
    customerInfos,
    payment_ref,
    shippingPrice,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Processing your payment...</p>
          </div>
        ) : status === "paid" ? (
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
              <p className="font-medium">Order #{payment_ref}</p>
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
