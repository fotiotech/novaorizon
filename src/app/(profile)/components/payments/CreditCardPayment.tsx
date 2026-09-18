"use client";

import React from "react";

const CreditCardPayment = () => {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-6 w-6 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h2m4 0h6M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground">
        Credit card payments coming soon
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        In the meantime, please choose another payment method.
      </p>
    </div>
  );
};

export default CreditCardPayment;
