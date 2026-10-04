// app/cart/page.tsx
import type { Metadata } from "next";
import Cart from "./_component/Cart";
import CheckoutButton from "@/components/CheckoutButton";
import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review the items in your Novaorizon cart before checkout.",
  // Utility page — never index. `follow: true` lets Google follow the
  // "Continue Shopping" and product links without indexing the cart itself.
  robots: {
    index: false,
    follow: true,
    nocache: true,
  },
  // No canonical — contradictory with noindex.
};

const CartPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Your Cart
            </h1>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="bg-background rounded-lg py-4 md:p-6">
          <Cart />
        </div>

        <div className="mt-6 bg-background rounded-lg py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <p>Ready to place your order?</p>
          </div>
          <CheckoutButton width="w-full sm:w-auto" height="h-11">
            Proceed to Checkout
          </CheckoutButton>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
