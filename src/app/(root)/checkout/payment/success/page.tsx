"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useCart } from "@/app/context/CartContext";
import { toast } from "react-hot-toast";
import { createOrUpdateOrder, findOrders } from "@/app/actions/order";
import { CartItem } from "@/app/reducer/cartReducer";
import { calculateShippingPrice } from "@/app/actions/carrier";
import { useSession } from "next-auth/react";
import { useUser } from "@/app/context/UserContext";
import { CalcShippingPrice } from "../../page";
import { generateOrderPDF } from "@/app/actions/generatePDF";

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
  const [isDownloading, setIsDownloading] = useState(false);
  const orderSummaryRef = useRef<HTMLDivElement>(null);

  const transaction_id = params.get("transaction_id");
  const payment_ref = params.get("payment_ref");
  const email = params.get("email");
  const firstName = params.get("first_name");
  const lastName = params.get("last_name");
  const status = params.get("status");
  const [shippingPrice, setShippingPrice] = useState<CalcShippingPrice | null>(
    null
  );
  const [order, setOrder] = useState<any>({});

  useEffect(() => {
    async function fetchOrder() {
      if (payment_ref) {
        const response = await findOrders(payment_ref);
        console.log("Fetched order:", response);
        setOrder(response);
      }
    }
    fetchOrder();
  }, [payment_ref]);

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
          userId: order?.userId || user?.id,
          email: order?.email || customerInfos.billingAddress?.email,
          firstName:
            order?.firstName || customerInfos.billingAddress?.firstName,
          lastName: order?.lastName || customerInfos.billingAddress?.lastName,
          products:
            order?.products ||
            cart.map((item) => ({
              productId: item.id,
              name: item.name,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              price: item.price,
            })),
          subtotal: order?.subtotal || subtotal,
          tax: order?.tax || tax,
          shippingCost: order?.shippingCost || shippingCost,
          total: order?.total || total,
          paymentStatus: status,
          transactionId: transaction_id,
          paymentMethod:
            order?.paymentMethod || customerInfos.billingMethod?.methodType,
          shippingAddress: order?.shippingAddress || {
            street: customerInfos.shippingAddress.street,
            region: customerInfos.shippingAddress.region,
            city: customerInfos.shippingAddress.city,
            carrier: customerInfos.shippingAddress.carrier,
            address: customerInfos.shippingAddress.address || "excellence1",
            country: customerInfos.shippingAddress.country,
          },
          shippingStatus: order?.shippingStatus || "pending",
          shippingDate: order?.shippingDate || estimatedShippingDate,
          deliveryDate: order?.deliveryDate || estimatedDeliveryDate,
          orderStatus: order?.orderStatus || "processing",
          notes: order?.notes || "",
          couponCode: order?.couponCode || "",
          discount: order?.discount || 0,
        });

        if (!res) {
          throw new Error("Failed to create or update order");
        }

        setOrder(res?.order);

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
    cart,
    order,
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
        customerName: `${firstName} ${lastName}`,
        email: email || order.email || "",
        orderDate: new Date().toLocaleDateString(),
        products:
          order?.products ||
          cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.imageUrl,
          })),
        subtotal: order?.subtotal || calculateTotal(cart),
        shippingCost: order?.shippingCost || shippingPrice?.shippingPrice || 0,
        tax: order?.tax || 0,
        total:
          order.total ||
          calculateTotal(cart) + (shippingPrice?.shippingPrice || 0),
        shippingAddress: order.shippingAddress ||
          customerInfos?.shippingAddress || {
            street: "",
            city: "",
            region: "",
            country: "",
            address: "",
          },
        paymentMethod:
          order.paymentMethod ||
          customerInfos?.billingMethod?.methodType ||
          "Credit Card",
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

  // Component to render the order summary for PDF generation
  const OrderSummary = () => (
    <div
      ref={orderSummaryRef}
      className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto mt-8"
      style={{ display: "none" }} // Hidden from view, only for PDF
    >
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
            <strong>Customer:</strong> {firstName} {lastName}
          </p>
          <p>
            <strong>Email:</strong> {email}
          </p>
          <p>
            <strong>Payment Status:</strong>{" "}
            {status === "paid" ? "Paid" : status}
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Shipping Address</h2>
          <p>{customerInfos?.shippingAddress?.street}</p>
          <p>
            {customerInfos?.shippingAddress?.city},{" "}
            {customerInfos?.shippingAddress?.region}
          </p>
          <p>{customerInfos?.shippingAddress?.country}</p>
          {customerInfos?.shippingAddress?.address && (
            <p>{customerInfos.shippingAddress.address}</p>
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
                Date.now() + 8 * 24 * 60 * 60 * 1000
              ).toLocaleDateString()}
        </p>
      </div>
    </div>
  );

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

              {/* Download PDF Button */}
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download Order Summary (PDF)
                  </>
                )}
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
                  `/checkout/payment?payment_ref=${payment_ref}&paymentMethod=${customerInfos?.billingMethod?.methodType}`
                )
              }
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Hidden Order Summary for PDF generation */}
      <OrderSummary />
    </div>
  );
}
