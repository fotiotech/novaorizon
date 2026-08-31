"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getOrderByNumber, requestReturn } from "@/app/actions/order";
import InvoiceDisplay from "@/components/InvoiceDisplay";
import Spinner from "@/components/Spinner";

// Order status steps in linear progression
const ORDER_STEPS = [
  "pending",
  "processing",
  "shipped",
  "in transit",
  "completed",
] as const;
type OrderStep = (typeof ORDER_STEPS)[number];

// Maps orderStatus to its step index (only for linear steps)
const stepIndex = (status: string): number => {
  const idx = ORDER_STEPS.indexOf(status as OrderStep);
  return idx === -1 ? -1 : idx;
};

// Check if status is a terminal non‑linear state
const isTerminal = (status: string) =>
  status === "cancelled" || status === "returned";

const OrderTracking = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    async function fetchOrder() {
      setLoading(true);
      try {
        const data = await getOrderByNumber(orderNumber);
        if (!data) setError("Order not found");
        else setOrder(data);
      } catch (err: any) {
        setError(err.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-red-600 text-lg">{error || "Order not found"}</p>
          <Link
            href="/profile/myorders"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = order.orderStatus;
  const currentStepIdx = stepIndex(currentStatus);
  const isTerminalState = isTerminal(currentStatus);

  const handleRequestReturn = async () => {
    if (!order?.orderNumber) return;
    setSubmittingReturn(true);
    const result = await requestReturn(order.orderNumber, returnReason);
    setSubmittingReturn(false);

    if (result.success) {
      setOrder((prev: any) => ({
        ...prev,
        orderStatus: "return_requested",
        returnReason: returnReason || prev.returnReason,
      }));
      setReturnReason("");
      alert("Return request submitted successfully.");
    } else {
      alert(result.error || "Unable to submit return request.");
    }
  };

  // Status badge colors
  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-indigo-100 text-indigo-800",
      "in transit": "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      returned: "bg-gray-100 text-gray-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  const paymentStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      cod_pending: "bg-orange-100 text-orange-800",
      paid: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      refunded: "bg-purple-100 text-purple-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-semibold text-xl text-gray-800">
            Order #{order.orderNumber}
          </div>
          <Link
            href="/profile/myorders"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to My Orders
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden p-6">
          {/* Status badges */}
          <div className="flex flex-wrap gap-3 mb-6">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor(
                currentStatus,
              )}`}
            >
              Order: {currentStatus}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${paymentStatusColor(
                order.paymentStatus,
              )}`}
            >
              Payment: {order.paymentStatus}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                order.shippingStatus === "delivered"
                  ? "bg-green-100 text-green-800"
                  : order.shippingStatus === "shipped"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              Shipping: {order.shippingStatus}
            </span>
          </div>

          {/* Tracking Bar - only show for linear steps, not for cancelled/returned */}
          {!isTerminalState && currentStepIdx >= 0 ? (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-500 mb-4">
                Order Progress
              </h3>
              <div className="relative">
                {/* Progress bar background */}
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                  <div
                    style={{
                      width: `${(currentStepIdx / (ORDER_STEPS.length - 1)) * 100}%`,
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                  />
                </div>
                {/* Step markers */}
                <div className="flex justify-between relative">
                  {ORDER_STEPS.map((step, idx) => {
                    const isActive = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    return (
                      <div key={step} className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                            isActive
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "bg-gray-100 border-gray-300 text-gray-400"
                          } ${isCurrent ? "ring-2 ring-blue-300 ring-offset-2" : ""}`}
                        >
                          {idx + 1}
                        </div>
                        <span
                          className={`mt-2 text-xs font-medium capitalize ${
                            isActive ? "text-blue-600" : "text-gray-400"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : isTerminalState ? (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium capitalize">
                This order has been {currentStatus}.
              </p>
              <p className="text-sm text-red-600 mt-1">
                {currentStatus === "cancelled"
                  ? "The order was cancelled and will not be processed."
                  : "The order was returned. Please contact support if you have any questions."}
              </p>
            </div>
          ) : null}

          {/* Order summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Order Details
              </h3>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="font-medium">Date:</span>{" "}
                  {new Date(order.createdAt).toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Total:</span> {order.total} CFA
                </p>
                <p>
                  <span className="font-medium">Subtotal:</span>{" "}
                  {order.subtotal} CFA
                </p>
                <p>
                  <span className="font-medium">Tax:</span> {order.tax} CFA
                </p>
                <p>
                  <span className="font-medium">Shipping Cost:</span>{" "}
                  {order.shippingCost} CFA
                </p>
                {order.discount > 0 && (
                  <p>
                    <span className="font-medium">Discount:</span> -
                    {order.discount} CFA
                  </p>
                )}
                {order.couponCode && (
                  <p>
                    <span className="font-medium">Coupon:</span>{" "}
                    {order.couponCode}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Shipping Address
              </h3>
              <div className="mt-2 text-sm">
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}</p>
                <p>{order.shippingAddress.region}</p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.carrier && (
                  <p className="mt-1">
                    <span className="font-medium">Carrier:</span>{" "}
                    {order.shippingAddress.carrier}
                  </p>
                )}
                {order.shippingDate && (
                  <p>
                    <span className="font-medium">Shipped on:</span>{" "}
                    {new Date(order.shippingDate).toLocaleDateString()}
                  </p>
                )}
                {order.deliveryDate && (
                  <p>
                    <span className="font-medium">Delivered on:</span>{" "}
                    {new Date(order.deliveryDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Products</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">
                      Product
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">
                      Price
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {order.products.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">{item.price} CFA</td>
                      <td className="px-4 py-2">
                        {item.price * item.quantity} CFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {order.paymentStatus === "paid" && (
            <InvoiceDisplay orderNumber={order.orderNumber} />
          )}

          {order.paymentStatus === "paid" &&
            order.orderStatus !== "returned" &&
            order.orderStatus !== "cancelled" &&
            order.orderStatus !== "return_requested" && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-medium text-amber-700">
                  Request a return
                </h3>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Tell us why you want to return this order..."
                  className="mt-3 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-amber-500"
                  rows={4}
                />
                <button
                  type="button"
                  onClick={handleRequestReturn}
                  disabled={submittingReturn}
                  className="mt-3 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {submittingReturn ? "Submitting..." : "Submit return request"}
                </button>
              </div>
            )}

          {order.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
