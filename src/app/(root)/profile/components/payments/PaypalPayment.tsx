"use client";

import React from "react";

/**
 * PayPal is intentionally disabled until the server-side Orders API
 * integration (create + capture + amount verification) is configured.
 * The previous implementation captured on the client and never persisted
 * the result, so it could neither be trusted nor reconciled.
 */
const PaypalPayment: React.FC = () => (
  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
    <h3 className="text-base font-semibold text-foreground">
      PayPal is temporarily unavailable
    </h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Please choose Mobile Money or Cash on Delivery. PayPal will return once
      server-side payment verification is configured.
    </p>
  </div>
);

export default PaypalPayment;
