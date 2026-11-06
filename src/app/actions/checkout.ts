"use server";

import { connection } from "@/utils/connection";
import Order from "@/models/Order";
import { PaymentMethod } from "@/models/PaymentMethod";
import {
  createCheckoutOrder,
  getCheckoutOrder,
  type CheckoutOrderSummary,
  type CreateCheckoutOrderInput,
} from "@/lib/checkout";
import { canAccessOrder } from "@/lib/order-access";
import { createMonetbilPaymentLink } from "@/lib/monetbil";
import { consumeRateLimit } from "@/lib/rate-limit";

const OPERATORS = new Set([
  "CM_MTNMOBILEMONEY",
  "CM_ORANGEMONEY",
  "CM_EUMM",
]);

export async function createCheckoutOrderAction(
  input: CreateCheckoutOrderInput,
): Promise<
  | { success: true; order: CheckoutOrderSummary; reused: boolean }
  | { success: false; error: string }
> {
  return createCheckoutOrder(input);
}

export async function getCheckoutOrderAction(
  orderNumber: string,
): Promise<CheckoutOrderSummary | null> {
  return getCheckoutOrder(orderNumber);
}

/**
 * Starts a mobile-money payment for an existing pending order. The amount
 * is read from the order, never from the browser.
 */
export async function startMonetbilPayment(
  orderNumber: string,
  operator: string,
): Promise<{ paymentUrl: string; amount: number }> {
  await connection();

  const limit = await consumeRateLimit(
    `monetbil-start:${orderNumber}`,
    10,
    10 * 60 * 1000,
  );
  if (!limit.ok) {
    throw new Error("Too many payment attempts. Please try again later.");
  }

  if (!OPERATORS.has(operator)) {
    throw new Error("Unsupported mobile money operator.");
  }

  const order: any = await Order.findOne({ orderNumber }).lean();
  if (!order || !(await canAccessOrder(order))) {
    throw new Error("Order not found.");
  }
  if (order.paymentStatus === "paid") {
    throw new Error("This order is already paid.");
  }
  if (order.paymentStatus === "refunded" || order.paymentStatus === "cancelled") {
    throw new Error("This order can no longer be paid.");
  }
  if (!Number.isFinite(Number(order.total)) || Number(order.total) <= 0) {
    throw new Error("This order has no payable total.");
  }

  let phone: string | undefined;
  if (order.paymentMethodId) {
    const method: any = await PaymentMethod.findOne({
      _id: order.paymentMethodId,
      ...(order.userId
        ? { userId: order.userId }
        : order.guestId
          ? { guestId: order.guestId }
          : {}),
    })
      .select("details.phoneNumber")
      .lean();
    phone = method?.details?.phoneNumber;
  }

  const { paymentUrl } = await createMonetbilPaymentLink({
    amount: Number(order.total),
    orderNumber: order.orderNumber,
    operator,
    phone,
    firstName: order.firstName || "Customer",
    lastName: order.lastName || "Customer",
    email: order.email,
  });

  return { paymentUrl, amount: Number(order.total) };
}
