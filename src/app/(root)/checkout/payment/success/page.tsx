"use client";

import { updateOrderStatus } from "@/app/actions/monetbil_payment";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function PaymentSuccess() {
  const params = useSearchParams();
  const transaction_id = params.get("transaction_id");
  const email = params.get("email");
  const firstName = params.get("first_name");
  const LastName = params.get("last_name");
  const status = params.get("status");

  useEffect(() => {
    async function updatePaymentInfos() {
      if (email && transaction_id && status) {
        await updateOrderStatus(email,  transaction_id as string, status as string);
      }
    }
    updatePaymentInfos();
  }, [email, transaction_id, status]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-screen p-4">
      <h1 className="text-lg font-bold text-gray-800">Payment Details!</h1>
      <p>Transaction ID: {transaction_id}</p>
      <p>
        Initialized by: {firstName} {LastName} {email ? `(${email})` : ""}
      </p>
      <p>Payment status: {status}</p>
    </div>
  );
}
