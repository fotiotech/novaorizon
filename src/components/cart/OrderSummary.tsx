"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CalcShippingPrice } from "@/app/(root)/checkout/page";
import { useCart } from "@/app/context/CartContext";
import { Prices, TotalPrice } from "@/components/cart/Prices";

interface OrderSummaryProps {
  shippingPrice: CalcShippingPrice | null;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  shippingPrice,
}) => {
  const { cart } = useCart();


  // Calculate subtotal
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  return (
    <div className="border rounded-lg p-4 space-y-4">

      <ul className="space-y-2">
        {cart.map((item) => (
          <li key={item.id} className="flex justify-between">
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

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <Prices amount={subtotal} />
        </div>
        <div className="flex justify-between">
          <span>Shipping Fees:</span>
          <span className="font-semibold">
            {shippingPrice?.shippingPrice ?? 0} CFA
          </span>
        </div>
        <div className="flex justify-between">
          <span>Total:</span>
          <TotalPrice
            cart={cart}
            shippingPrice={shippingPrice?.shippingPrice ?? 0}
          />
        </div>
        <div className="flex justify-between">
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