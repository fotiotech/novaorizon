"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Close, ShoppingCart } from "@mui/icons-material";
import { useCart } from "@/app/context/CartContext";
import CheckoutButton from "@/components/CheckoutButton";

/** Adjust to match your store's currency / locale. */
const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

type NormalizedItem = {
  id: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
};

/**
 * Normalizes different cart item shapes into one predictable structure.
 * ⚠️ If your cart items use different field names, tweak this function only.
 */
function normalizeItem(raw: any, index: number): NormalizedItem {
  const product = raw?.product ?? raw?.variant ?? {};

  return {
    id: String(raw?._id ?? raw?.id ?? product?._id ?? product?.id ?? index),
    name: raw?.name ?? raw?.title ?? product?.name ?? product?.title ?? "Item",
    image:
      raw?.image ??
      raw?.imageUrl ??
      product?.image ??
      product?.imageUrl ??
      product?.images?.[0] ??
      undefined,
    price: Number(
      raw?.price ?? raw?.unitPrice ?? product?.price ?? product?.salePrice ?? 0,
    ),
    quantity: Number(raw?.quantity ?? raw?.qty ?? 1) || 1,
  };
}

function ItemThumb({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
        <ShoppingCart
          style={{ fontSize: 20 }}
          className="text-muted-foreground"
        />
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
      <Image src={src} alt={alt} fill sizes="56px" className="object-cover" />
    </div>
  );
}

type CartPopoverProps = {
  open: boolean;
  onClose: () => void;
  /** Wrapper element that contains the trigger + this panel. */
  anchorRef: React.RefObject<HTMLElement>;
};

/** Matches the Tailwind `duration-200` used below. */
const ANIMATION_DURATION_MS = 200;

const CartPopover = ({ open, onClose, anchorRef }: CartPopoverProps) => {
  const { items } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);

  // `mounted` keeps the panel in the DOM during the exit animation.
  // `visible` toggles the transition classes.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  const normalized = useMemo(
    () => (items ?? []).map((item: any, i: number) => normalizeItem(item, i)),
    [items],
  );

  const subtotal = useMemo(
    () => normalized.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [normalized],
  );

  // Handle enter / exit animation lifecycle
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Next frame → apply "visible" so the browser animates from the
      // initial (hidden) styles instead of jumping straight to the end.
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    // Closing: hide first, then unmount after the transition finishes.
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), ANIMATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose, anchorRef]);

  if (!mounted) return null;

  return (
    <div
      ref={panelRef}
      id="cart-popover-panel"
      role="dialog"
      aria-label="Cart preview"
      aria-hidden={!visible}
      className={[
        "absolute right-0 top-[calc(100%+10px)] z-[60]",
        "w-[min(22rem,calc(100vw-2rem))] overflow-hidden",
        "rounded-xl border border-border bg-background text-foreground shadow-xl",
        "origin-top-right",
        "transition-all duration-200 ease-out",
        "will-change-transform will-change-opacity",
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "pointer-events-none opacity-0 -translate-y-1 scale-95",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Your Cart{" "}
          <span className="font-normal text-muted-foreground">
            ({normalized.length})
          </span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart preview"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Close style={{ fontSize: 18 }} />
        </button>
      </div>

      {normalized.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <ShoppingCart
            style={{ fontSize: 34 }}
            className="text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <Link
            href="/"
            onClick={onClose}
            className="mt-1 text-sm font-medium text-primary hover:underline"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          {/* Items */}
          <ul className="max-h-72 divide-y divide-border overflow-y-auto">
            {normalized.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <ItemThumb src={item.image} alt={item.name} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Qty {item.quantity}
                  </p>
                </div>

                <div className="whitespace-nowrap text-sm font-semibold text-foreground">
                  {item.price * item.quantity} F
                </div>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">
                {subtotal} F
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Shipping &amp; taxes calculated at checkout.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Link
                href="/cart"
                onClick={onClose}
                className="flex-1 rounded-md border border-border px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              >
                View Cart
              </Link>
              <CheckoutButton width="flex-1" height="h-9">
                Checkout
              </CheckoutButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(CartPopover);
