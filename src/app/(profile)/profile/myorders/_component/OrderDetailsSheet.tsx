"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getOrderByNumber } from "@/app/actions/order";
import BottomSheet from "@/components/ux/BottomSheet";
import Spinner from "@/components/Spinner";
import InvoiceDisplay from "@/components/InvoiceDisplay";

const ORDER_STEPS = [
  "pending",
  "processing",
  "shipped",
  "in transit",
  "completed",
] as const;
type OrderStep = (typeof ORDER_STEPS)[number];

const stepIndex = (status: string): number => {
  const idx = ORDER_STEPS.indexOf(status as OrderStep);
  return idx === -1 ? -1 : idx;
};

const isTerminal = (status: string) =>
  status === "cancelled" || status === "returned";

// ------------------------------------------------------------------
// Sheet — fetches the full order and renders the details UI
// ------------------------------------------------------------------
interface OrderDetailsSheetProps {
  open: boolean;
  orderNumber: string | null;
  onClose: () => void;
}

const OrderDetailsSheet: React.FC<OrderDetailsSheetProps> = ({
  open,
  orderNumber,
  onClose,
}) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch on open / when the order number changes
  useEffect(() => {
    if (!open || !orderNumber) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getOrderByNumber(orderNumber);
        if (cancelled) return;
        if (!data) setError("Order not found");
        else setOrder(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, orderNumber]);

  // Reset data when the sheet closes so the next open starts fresh
  useEffect(() => {
    if (!open) {
      setOrder(null);
      setError(null);
    }
  }, [open]);

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
    <BottomSheet
      open={open}
      onClose={onClose}
      title={orderNumber ? `Order #${orderNumber}` : "Order Details"}
      panelClassName="md:max-w-3xl md:mx-auto"
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Close
          </button>
        </div>
      ) : !order ? null : (
        <OrderDetailsContent
          order={order}
          statusColor={statusColor}
          paymentStatusColor={paymentStatusColor}
        />
      )}
    </BottomSheet>
  );
};

// ------------------------------------------------------------------
// Content — moved from the OrderTracking page (no page-level wrappers)
// ------------------------------------------------------------------
interface OrderDetailsContentProps {
  order: any;
  statusColor: (status: string) => string;
  paymentStatusColor: (status: string) => string;
}

const OrderDetailsContent: React.FC<OrderDetailsContentProps> = ({
  order,
  statusColor,
  paymentStatusColor,
}) => {
  const currentStatus = order.orderStatus;
  const currentStepIdx = stepIndex(currentStatus);
  const isTerminalState = isTerminal(currentStatus);

  return (
    <div className="space-y-6">
      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(
            currentStatus,
          )}`}
        >
          Order: {currentStatus}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${paymentStatusColor(
            order.paymentStatus,
          )}`}
        >
          Payment: {order.paymentStatus}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
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

      {/* Progress / terminal message */}
      {!isTerminalState && currentStepIdx >= 0 ? (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Order Progress
          </h3>
          <div className="relative">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-muted">
              <div
                style={{
                  width: `${
                    (currentStepIdx / (ORDER_STEPS.length - 1)) * 100
                  }%`,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
              />
            </div>
            <div className="flex justify-between relative">
              {ORDER_STEPS.map((step, idx) => {
                const isActive = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div
                    key={step}
                    className="flex flex-col items-center flex-1 min-w-0"
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium border-2 ${
                        isActive
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-muted border-border text-muted-foreground"
                      } ${
                        isCurrent
                          ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-background"
                          : ""
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`mt-1.5 text-[10px] sm:text-xs font-medium capitalize text-center leading-tight ${
                        isActive ? "text-blue-600" : "text-muted-foreground"
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
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium capitalize text-sm">
            This order has been {currentStatus}.
          </p>
          <p className="text-xs text-destructive/80 mt-1">
            {currentStatus === "cancelled"
              ? "The order was cancelled and will not be processed."
              : "The order was returned. Please contact support if you have any questions."}
          </p>
        </div>
      ) : null}

      {/* Details + Address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Order Details
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Date:</span>{" "}
              {new Date(order.createdAt).toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Total:</span> {order.total} CFA
            </p>
            <p>
              <span className="font-medium">Subtotal:</span> {order.subtotal}{" "}
              CFA
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
                <span className="font-medium">Discount:</span> -{order.discount}{" "}
                CFA
              </p>
            )}
            {order.couponCode && (
              <p>
                <span className="font-medium">Coupon:</span> {order.couponCode}
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Shipping Address
          </h3>
          <div className="text-sm space-y-0.5">
            <p>{order.shippingAddress?.street}</p>
            <p>{order.shippingAddress?.city}</p>
            <p>{order.shippingAddress?.region}</p>
            <p>{order.shippingAddress?.country}</p>
            {order.shippingAddress?.carrier && (
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
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Products
        </h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.products?.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{item.price} CFA</td>
                    <td className="px-3 py-2">
                      {item.price * item.quantity} CFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Complete Payment CTA */}
      {order.paymentStatus !== "paid" && (
        <Link
          href={`/checkout/payment?payment_ref=${order.orderNumber}&paymentMethod=${order.paymentMethod}`}
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-colors font-medium"
        >
          Complete Payment
        </Link>
      )}

      {/* Invoice */}
      {order.paymentStatus === "paid" && (
        <InvoiceDisplay orderNumber={order.orderNumber} />
      )}

      {/* Returns CTA */}
      {order.paymentStatus === "paid" &&
        !["returned", "return_requested", "cancelled"].includes(
          order.orderStatus,
        ) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-medium text-amber-700">
              Need to return this order?
            </h3>
            <p className="mt-1 text-sm text-amber-700">
              Visit our Returns &amp; Refunds page to submit a return request
              for this order.
            </p>
            <Link
              href={`/returns?order=${order.orderNumber}`}
              className="mt-3 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Go to Returns &amp; Refunds →
            </Link>
          </div>
        )}

      {/* Return Reason */}
      {order.returnReason && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-medium text-amber-700">Return Reason</h3>
          <p className="mt-1 text-sm text-amber-800">{order.returnReason}</p>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Notes
          </h3>
          <p className="text-sm bg-muted/50 p-3 rounded">{order.notes}</p>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsSheet;
