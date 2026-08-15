"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useCart } from "@/app/context/CartContext";
import { toast } from "react-hot-toast";
import { createOrUpdateOrder, findOrders } from "@/app/actions/order";
import { CartItem } from "@/app/reducer/cartReducer";
import { calculateShippingPrice } from "@/app/actions/carrier";
import { useSession } from "next-auth/react";
import { CalcShippingPrice } from "../../page";
import { generateOrderPDF } from "@/app/actions/generatePDF";

const DEFAULT_CARRIER_ID = "675eeda75a81d16c81aca736";

export default function PaymentSuccess() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const { dispatch: cartDispatch } = useCart();
  const { cart } = useCart();
  const [isProcessing, setIsProcessing] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const orderSummaryRef = useRef<HTMLDivElement>(null);

  const transaction_id = params.get("transaction_id");
  const payment_ref = params.get("payment_ref");
  const email = params.get("email");
  const firstName = params.get("first_name");
  const lastName = params.get("last_name");
  const status = params.get("status");
  const [shippingPrice, setShippingPrice] = useState<CalcShippingPrice | null>(
    null,
  );
  const [order, setOrder] = useState<any>(null);

  // Fetch existing order
  useEffect(() => {
    async function fetchOrder() {
      if (payment_ref) {
        const response = await findOrders(payment_ref);
        setOrder(response);
      }
    }
    fetchOrder();
  }, [payment_ref]);

  // Fetch shipping price (if needed for PDF)
  useEffect(() => {
    if (!order?.shippingAddress?.region) return;
    const fetchCarrier = async () => {
      try {
        const res = await calculateShippingPrice(
          DEFAULT_CARRIER_ID,
          order.shippingAddress.region,
          0,
        );
        setShippingPrice(res ?? null);
      } catch (err) {
        console.error("Error calculating shipping price:", err);
      }
    };
    fetchCarrier();
  }, [order?.shippingAddress?.region]);

  const calculateTotal = (items: CartItem[]) => {
    return items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0,
    );
  };

  // Update order with payment info
  useEffect(() => {
    async function updatePaymentInfos() {
      try {
        if (!payment_ref || !transaction_id || !status) {
          throw new Error("Missing payment information");
        }

        // If order doesn't exist yet, create a minimal one (fallback)
        // In normal flow, order should already exist from chat finalization.
        if (!order) {
          // You might want to redirect or show error
          throw new Error("Order not found. Please contact support.");
        }

        // Update only payment-related fields
        const updatedOrder = await createOrUpdateOrder(payment_ref, {
          userId: order.userId,
          email: order.email || email || "",
          firstName: order.firstName || firstName || "",
          lastName: order.lastName || lastName || "",
          products: order.products || [],
          subtotal: order.subtotal || 0,
          total: order.total || 0,
          paymentStatus: status,
          transactionId: transaction_id,
          paymentMethod: order.paymentMethod || "Unknown",
          shippingAddress: order.shippingAddress || {},
          // Keep existing billingAddressId and paymentMethodId (already in order)
          billingAddressId: order.billingAddressId,
          paymentMethodId: order.paymentMethodId,
          // other fields remain unchanged
        } as any);

        if (!updatedOrder?.success) {
          throw new Error(updatedOrder?.error || "Failed to update order");
        }

        setOrder(updatedOrder.order);

        if (status === "paid") {
          cartDispatch({ type: "CLEAR_CART" });
          toast.success("Payment successful! Thank you for your purchase.");
        } else {
          toast.error("Payment was not successful. Please try again.");
        }
      } catch (error: any) {
        console.error("Error updating payment status:", error);
        toast.error(
          error.message ||
            "Something went wrong while processing your payment.",
        );
      } finally {
        setIsProcessing(false);
      }
    }

    if (order !== null) {
      updatePaymentInfos();
    }
  }, [
    email,
    transaction_id,
    status,
    cartDispatch,
    payment_ref,
    order,
    firstName,
    lastName,
  ]);

  const handleDownloadPDF = async () => {
    if (!order || !payment_ref) {
      toast.error("Order information not available");
      return;
    }

    setIsDownloading(true);
    try {
      const orderData = {
        orderId: payment_ref,
        transactionId: transaction_id || "",
        customerName: `${order.firstName || firstName || ""} ${order.lastName || lastName || ""}`,
        email: email || order.email || "",
        orderDate: new Date().toLocaleDateString(),
        products:
          order.products ||
          cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.imageUrl,
          })),
        subtotal: order.subtotal || calculateTotal(cart),
        shippingCost: order.shippingCost || shippingPrice?.shippingPrice || 0,
        tax: order.tax || 0,
        total:
          order.total ||
          calculateTotal(cart) + (shippingPrice?.shippingPrice || 0),
        shippingAddress: order.shippingAddress || {
          street: "",
          city: "",
          region: "",
          country: "",
          address: "",
        },
        paymentMethod: order.paymentMethod || "Unknown",
        estimatedDelivery: order.deliveryDate
          ? new Date(order.deliveryDate).toLocaleDateString()
          : new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        paymentStatus: status || "paid",
      };

      await generateOrderPDF(orderData, orderSummaryRef.current || undefined);
      toast.success("Order summary downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to download order summary");
    } finally {
      setIsDownloading(false);
    }
  };

  // Component for PDF generation (unchanged, uses order)
  const OrderSummary = () => (
    <div
      ref={orderSummaryRef}
      className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto mt-8"
      style={{ display: "none" }}
    >
      {/* ... same as before but using order object */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ORDER CONFIRMATION</h1>
        <p className="text-gray-600">Thank you for your purchase!</p>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Order Details</h2>
          <p>
            <strong>Order ID:</strong> {payment_ref}
          </p>
          <p>
            <strong>Transaction ID:</strong> {transaction_id}
          </p>
          <p>
            <strong>Order Date:</strong> {new Date().toLocaleDateString()}
          </p>
          <p>
            <strong>Customer:</strong> {order?.firstName || firstName}{" "}
            {order?.lastName || lastName}
          </p>
          <p>
            <strong>Email:</strong> {email || order?.email}
          </p>
          <p>
            <strong>Payment Status:</strong>{" "}
            {status === "paid" ? "Paid" : status}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Shipping Address</h2>
          <p>{order?.shippingAddress?.street}</p>
          <p>
            {order?.shippingAddress?.city}, {order?.shippingAddress?.region}
          </p>
          <p>{order?.shippingAddress?.country}</p>
          {order?.shippingAddress?.address && (
            <p>{order.shippingAddress.address}</p>
          )}
        </div>
      </div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Order Items</h2>
        <div className="border rounded-lg">
          {(order?.products || cart).map((item: any, index: number) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 border-b"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium">
                ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t pt-4">
        <div className="flex justify-between mb-2">
          <span>Subtotal:</span>
          <span>
            ${order?.subtotal?.toFixed(2) || calculateTotal(cart).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Shipping:</span>
          <span>
            $
            {order?.shippingCost?.toFixed(2) ||
              shippingPrice?.shippingPrice?.toFixed(2) ||
              "0.00"}
          </span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Tax:</span>
          <span>${order?.tax?.toFixed(2) || "0.00"}</span>
        </div>
        <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
          <span>Total:</span>
          <span>
            $
            {order?.total?.toFixed(2) ||
              (
                calculateTotal(cart) + (shippingPrice?.shippingPrice || 0)
              ).toFixed(2)}
          </span>
        </div>
      </div>
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>
          Estimated Delivery:{" "}
          {order?.deliveryDate
            ? new Date(order.deliveryDate).toLocaleDateString()
            : new Date(
                Date.now() + 8 * 24 * 60 * 60 * 1000,
              ).toLocaleDateString()}
        </p>
      </div>
    </div>
  );

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Processing your payment...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render success/failure UI (same as before, but uses order data)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {status === "paid" ? (
          // Success UI – unchanged
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
                Thank you, {order?.firstName || firstName}{" "}
                {order?.lastName || lastName}!
              </p>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDownloading
                  ? "Generating PDF..."
                  : "Download Order Summary (PDF)"}
              </button>
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
          // Failure UI – unchanged
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
              onClick={() =>
                router.push(
                  `/checkout/payment?payment_ref=${payment_ref}&paymentMethod=${order?.paymentMethod || ""}`,
                )
              }
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
      <OrderSummary />
    </div>
  );
}
