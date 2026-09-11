// app/returns-refunds/page.tsx
"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { getOrderByNumber, requestReturn } from "@/app/actions/order";
import Spinner from "@/components/Spinner";
import { useSearchParams } from "next/navigation";

type LookupState = "idle" | "loading" | "found" | "error";

const ReturnsRefundsPage = () => {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(
    searchParams.get("order") || "",
  );
  const [order, setOrder] = useState<any>(null);
  const [state, setState] = useState<LookupState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [returnReason, setReturnReason] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderNumber.trim();
    if (!trimmed) {
      setError("Please enter an order number.");
      setState("error");
      return;
    }

    setState("loading");
    setError(null);
    setOrder(null);
    setReturnSuccess(false);

    try {
      const data = await getOrderByNumber(trimmed);
      if (!data) {
        setError("No order found with that number.");
        setState("error");
      } else {
        setOrder(data);
        setState("found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load order.");
      setState("error");
    }
  };

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
      setReturnSuccess(true);
    } else {
      alert(result.error || "Unable to submit return request.");
    }
  };

  const canRequestReturn =
    order &&
    order.paymentStatus === "paid" &&
    !["returned", "return_requested", "cancelled"].includes(order.orderStatus);

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-indigo-100 text-indigo-800",
      "in transit": "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      returned: "bg-gray-100 text-gray-800",
      return_requested: "bg-amber-100 text-amber-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Returns &amp; Refunds
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Look up your order to request a return or refund.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 mt-8 max-w-3xl">
          {/* Lookup form */}
          <form
            onSubmit={handleLookup}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <label
              htmlFor="orderNumber"
              className="block text-sm font-medium text-gray-700"
            >
              Order Number
            </label>
            <div className="mt-2 flex gap-3">
              <input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. 6a3f9c2b1d4e8"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {state === "loading" ? "Searching..." : "Find Order"}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <p className="mt-3 text-xs text-gray-400">
              You can find your order number in the confirmation email or on
              your{" "}
              <Link
                href="/profile/myorders"
                className="text-blue-600 hover:underline"
              >
                orders page
              </Link>
              .
            </p>
          </form>

          {/* Loading */}
          {state === "loading" && (
            <div className="mt-8 flex justify-center">
              <Spinner />
            </div>
          )}

          {/* Results */}
          {state === "found" && order && (
            <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
              {/* Status badges */}
              <div className="flex flex-wrap gap-3 mb-6">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor(
                    order.orderStatus,
                  )}`}
                >
                  Order: {order.orderStatus}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.paymentStatus === "paid"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  Payment: {order.paymentStatus}
                </span>
              </div>

              {/* Order summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Order Details
                  </h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Order #:</span>{" "}
                      {order.orderNumber}
                    </p>
                    <p>
                      <span className="font-medium">Date:</span>{" "}
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Total:</span> {order.total}{" "}
                      CFA
                    </p>
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
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Products
                </h3>
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

              {/* Return success message */}
              {returnSuccess && (
                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-green-800">
                    Your return request has been submitted. We&apos;ll review it
                    and get back to you shortly.
                  </p>
                </div>
              )}

              {/* Return request form */}
              {canRequestReturn && !returnSuccess && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
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
                    {submittingReturn
                      ? "Submitting..."
                      : "Submit return request"}
                  </button>
                </div>
              )}

              {/* Not eligible message */}
              {!canRequestReturn && !returnSuccess && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">
                    {order.paymentStatus !== "paid"
                      ? "Only paid orders can be returned or refunded."
                      : `This order is currently marked as "${order.orderStatus}" and cannot be returned. Please contact support if you need help.`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Suspense>
  );
};

export default ReturnsRefundsPage;
