"use client";

import React from "react";
import { CalcShippingPrice } from "@/app/(checkout)/checkout/page";
import { useCart } from "@/app/context/CartContext";
import { Prices } from "@/components/cart/Prices";

interface AppliedPromotion {
  _id: string;
  name: string;
  code?: string;
  label: string;
  discount: number;
}

interface OrderSummaryProps {
  shippingPrice: CalcShippingPrice | null;
  /** Server-computed total discount. Overrides the cart context value when set. */
  discount?: number;
  /** Promotions the server actually applied. Rendered as individual lines. */
  appliedPromotions?: AppliedPromotion[];
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  shippingPrice,
  discount,
  appliedPromotions = [],
}) => {
  const cart = useCart();
  const items = cart.items ?? [];
  const subtotal = cart.subtotal ?? 0;
  const tax = cart.tax ?? 0;

  const shippingCost = shippingPrice?.shippingPrice ?? 0;
  // Server value wins when provided; otherwise fall back to the cart context.
  const effectiveDiscount = discount ?? cart.discount ?? 0;

  const total = Math.max(0, subtotal + tax - effectiveDiscount + shippingCost);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">
        Your cart is empty.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      {/* Line items */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item._id} className="flex justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {item.name}
              </p>
              {item.quantity > 1 && (
                <p className="text-xs text-muted-foreground">
                  Quantity: {item.quantity} · Subtotal:{" "}
                  <Prices amount={item.price * item.quantity} />
                </p>
              )}
            </div>
            <div className="shrink-0">
              <Prices amount={item.price} />
            </div>
          </li>
        ))}
      </ul>

      {/* Totals */}
      <div className="space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <Prices amount={subtotal} />
        </div>

        {tax > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <Prices amount={tax} />
          </div>
        )}

        {/* Per-promotion discount lines when we have them */}
        {appliedPromotions.length > 0 ? (
          appliedPromotions.map((p) => (
            <div key={p._id} className="flex justify-between text-emerald-600">
              <span className="min-w-0 truncate">
                {p.name}
                {p.code ? (
                  <span className="ml-1.5 font-mono text-xs opacity-70">
                    {p.code}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0">
                −<Prices amount={p.discount} />
              </span>
            </div>
          ))
        ) : effectiveDiscount > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <span>Discount</span>
            <span>
              −<Prices amount={effectiveDiscount} />
            </span>
          </div>
        ) : null}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-semibold text-foreground">
            {shippingCost > 0 ? `${shippingCost} CFA` : "Free"}
          </span>
        </div>

        <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
          <span className="text-foreground">Total</span>
          <Prices amount={total} />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Avg. delivery time</span>
          <span className="font-medium">
            {shippingPrice?.averageDeliveryTime ?? "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
