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
  calculationType?: string;
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

  const baseShippingCost = shippingPrice?.shippingPrice ?? 0;

  // Split free_shipping promotions out so their discount reduces the
  // shipping line directly, instead of appearing as a separate negative.
  const shippingPromos = appliedPromotions.filter(
    (p) => p.calculationType === "free_shipping",
  );
  const itemPromos = appliedPromotions.filter(
    (p) => p.calculationType !== "free_shipping",
  );
  const shippingDiscount = shippingPromos.reduce((s, p) => s + p.discount, 0);
  const effectiveShipping = Math.max(0, baseShippingCost - shippingDiscount);

  // Item-level discounts — used both for rendering the lines and for
  // computing the total when appliedPromotions isn't provided.
  const itemDiscountFromPromos = itemPromos.reduce((s, p) => s + p.discount, 0);
  const fallbackDiscount = discount ?? cart.discount ?? 0;
  const effectiveItemDiscount =
    appliedPromotions.length > 0 ? itemDiscountFromPromos : fallbackDiscount;

  const total = Math.max(
    0,
    subtotal + tax - effectiveItemDiscount + effectiveShipping,
  );

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

        {/* Item-level discount lines only */}
        {itemPromos.length > 0 ? (
          itemPromos.map((p) => (
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
        ) : effectiveItemDiscount > 0 && appliedPromotions.length === 0 ? (
          // Fallback path — no promotion list, just a number from context.
          <div className="flex justify-between text-emerald-600">
            <span>Discount</span>
            <span>
              −<Prices amount={effectiveItemDiscount} />
            </span>
          </div>
        ) : null}

        {/* Shipping — reflects free_shipping promos inline */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          {baseShippingCost <= 0 ? (
            <span className="text-muted-foreground">Free</span>
          ) : effectiveShipping <= 0 ? (
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground line-through">
                <Prices amount={baseShippingCost} />
              </span>
              <span className="font-semibold text-emerald-600">Free</span>
            </span>
          ) : (
            <Prices amount={effectiveShipping} />
          )}
        </div>

        {/* Note which promotion made shipping free */}
        {shippingPromos.length > 0 && baseShippingCost > 0 && (
          <p className="pl-1 text-[11px] text-emerald-600">
            {shippingPromos.map((p) => p.name).join(", ")} applied
          </p>
        )}

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
