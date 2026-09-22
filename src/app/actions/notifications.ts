// app/actions/notification.ts
"use server";

import Notification from "@/models/Notification";
import User from "@/models/User";
import { connection } from "@/utils/connection";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID as string,
  key: process.env.PUSHER_APP_KEY as string,
  secret: process.env.PUSHER_APP_SECRET as string,
  cluster: process.env.PUSHER_APP_CLUSTER as string,
  useTLS: true,
});

const RECIPIENT_ROLES = ["admin"] as const;

export type NotificationKind =
  | "order"
  | "payment"
  | "promotion"
  | "product"
  | "system";

/* -------------------------------------------------------------------------- */
/*                                   Base                                     */
/* -------------------------------------------------------------------------- */

/**
 * Send a notification to every active admin.
 * Creates one document per admin + broadcasts one Pusher event.
 */
async function notifyAdmins(kind: NotificationKind, message: string) {
  try {
    await connection();

    const admins = await User.find({
      role: { $in: RECIPIENT_ROLES },
      status: "active",
      deletedAt: null,
    })
      .select("_id")
      .lean();

    if (admins.length === 0) {
      console.warn(
        `[notify:${kind}] No active admins found — skipping notification.`,
      );
      return { success: false, error: "No admins found" };
    }

    const now = new Date();
    const docs = admins.map((a) => ({
      userId: a._id,
      message,
      type: kind,
      isRead: false,
      timestamp: now,
    }));

    const inserted = await Notification.insertMany(docs);

    await pusher.trigger("admin-notifications", "new-notification", {
      id: inserted[0]._id.toString(),
      message,
      type: kind,
      timestamp: now.toISOString(),
    });

    return { success: true, count: admins.length };
  } catch (error: any) {
    console.error(`[notify:${kind}] Failed:`, error);
    return { success: false, error: error?.message ?? "Unknown error" };
  }
}

/* -------------------------------------------------------------------------- */
/*                             Convenience wrappers                           */
/* -------------------------------------------------------------------------- */

type NewOrderParams = {
  orderNumber: string;
  customerName?: string;
  total?: number;
  currency?: string;
};

/** Fired when an order row is first created (checkout page). */
export async function notifyAdminsAboutNewOrder(params: NewOrderParams) {
  const { orderNumber, customerName, total, currency = "CFA" } = params;

  const pieces = [`New order #${orderNumber}`];
  if (customerName) pieces.push(`from ${customerName}`);
  if (typeof total === "number") {
    pieces.push(`— ${currency} ${total.toFixed(2)}`);
  }

  return notifyAdmins("order", pieces.join(" "));
}

type PaymentSuccessParams = {
  orderNumber: string;
  customerName?: string;
  total?: number;
  currency?: string;
  transactionId?: string;
};

/** Fired when a payment is confirmed paid (payment success page). */
export async function notifyAdminsAboutPaymentSuccess(
  params: PaymentSuccessParams,
) {
  const {
    orderNumber,
    customerName,
    total,
    currency = "CFA",
    transactionId,
  } = params;

  const pieces = [`Payment received for order #${orderNumber}`];
  if (typeof total === "number") {
    pieces.push(`— ${currency} ${total.toFixed(2)}`);
  }
  if (customerName) pieces.push(`from ${customerName}`);
  if (transactionId) pieces.push(`(txn ${transactionId})`);

  return notifyAdmins("payment", pieces.join(" "));
}
