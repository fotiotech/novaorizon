"use client";

import React, { useMemo } from "react";
import { CalcShippingPrice } from "@/app/(checkout)/checkout/page";
import { useCart } from "@/app/context/CartContext";
import { Prices } from "@/components/cart/Prices";

interface OrderSummaryProps {
  shippingPrice: CalcShippingPrice | null;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ shippingPrice }) => {
  const { items, subtotal, tax, discount } = useCart();

  // Compute total: subtotal + tax - discount + shipping (provided)
  const shippingCost = shippingPrice?.shippingPrice ?? 0;
  const total = subtotal + tax - discount + shippingCost;

  if (items.length === 0) {
    return (
      <div className="border rounded-lg p-4 text-center text-gray-500">
        Your cart is empty.
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item._id} className="flex justify-between">
            <div>
              <p className="font-medium">{item.name}</p>
              {item.quantity > 1 && (
                <p className="text-sm">
                  Quantity: {item.quantity} | Subtotal:{" "}
                  <Prices amount={item.price * item.quantity} />
                </p>
              )}
            </div>
            <div>
              <Prices amount={item.price} />
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-1 border-t pt-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <Prices amount={subtotal} />
        </div>
        {tax > 0 && (
          <div className="flex justify-between">
            <span>Tax:</span>
            <Prices amount={tax} />
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            -<Prices amount={discount} />
          </div>
        )}
        <div className="flex justify-between">
          <span>Shipping Fees:</span>
          <span className="font-semibold">
            {shippingCost > 0 ? `${shippingCost} CFA` : "Free"}
          </span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>Total:</span>
          <Prices amount={total} />
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Avg. Delivery Time:</span>
          <span className="font-semibold">
            {shippingPrice?.averageDeliveryTime ?? "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
