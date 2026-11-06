import "server-only";
import { randomBytes } from "node:crypto";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Invoice from "@/models/Invoice";
import PromotionUsage from "@/models/PromotionUsage";

export interface PaymentConfirmation {
  gateway: string;
  transactionId: string;
  amount?: number;
  currency?: string;
}

/**
 * Atomically transitions a pending order to paid, then performs the
 * fulfillment side effects. Safe to call more than once (webhook retries).
 */
export async function markOrderPaid(
  orderNumber: string,
  payment: PaymentConfirmation,
): Promise<
  | { ok: true; alreadyPaid: boolean; orderNumber: string }
  | { ok: false; error: string }
> {
  const order = await Order.findOne({ orderNumber });
  if (!order) return { ok: false, error: "Order not found" };

  if (order.paymentStatus === "paid") {
    // A previous confirmation may have marked the order paid before
    // fulfillment completed (e.g. a transient DB error). Retry the
    // side effects once, without deducting stock twice.
    if (!order.inventoryDeducted && order.inventoryStatus === "pending") {
      await fulfillOrder(order).catch((err) => {
        console.error("[markOrderPaid] retry fulfillment failed:", err);
      });
    }
    return { ok: true, alreadyPaid: true, orderNumber };
  }

  if (order.paymentStatus === "refunded" || order.paymentStatus === "cancelled") {
    return { ok: false, error: `Order is ${order.paymentStatus}` };
  }

  if (payment.currency && payment.currency.toUpperCase() !== "XAF") {
    return { ok: false, error: "Unexpected currency" };
  }
  if (
    typeof payment.amount === "number" &&
    Number.isFinite(payment.amount) &&
    Math.abs(payment.amount - Number(order.total)) > 1
  ) {
    return { ok: false, error: "Payment amount does not match the order total" };
  }

  const updated = await Order.updateOne(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentStatus: "paid",
        paidAt: new Date(),
        transaction_id: payment.transactionId,
        paymentGateway: payment.gateway,
        paymentReference: payment.transactionId,
      },
    },
  );

  if (updated.modifiedCount === 0) {
    const current = await Order.findById(order._id).select("paymentStatus").lean();
    if (current?.paymentStatus === "paid") {
      return { ok: true, alreadyPaid: true, orderNumber };
    }
    return { ok: false, error: "Order could not be marked paid" };
  }

  const paidOrder = await Order.findById(order._id);
  if (!paidOrder) return { ok: false, error: "Order not found" };

  try {
    await fulfillOrder(paidOrder);
  } catch (err) {
    // Payment is captured; keep the order paid and leave inventoryStatus
    // as "pending" so a retry/cron can complete fulfillment.
    console.error("[markOrderPaid] fulfillment failed:", err);
  }
  return { ok: true, alreadyPaid: false, orderNumber };
}

export async function markOrderFailed(
  orderNumber: string,
  reason: string,
): Promise<{ ok: boolean }> {
  await Order.updateOne(
    { orderNumber, paymentStatus: { $nin: ["paid", "refunded"] } },
    { $set: { paymentStatus: "failed", notes: reason.slice(0, 500) } },
  );
  return { ok: true };
}

async function fulfillOrder(order: any): Promise<void> {
  // Claim fulfillment atomically so two concurrent webhooks cannot
  // deduct the same stock twice.
  const claim = await Order.updateOne(
    { _id: order._id, inventoryStatus: "pending" },
    { $set: { inventoryStatus: "processing" } },
  );
  if (claim.modifiedCount === 0) return;

  let shortage = false;

  for (const item of order.products ?? []) {
    const quantity = Number(item.quantity) || 0;
    if (!item.productId || quantity <= 0) continue;

    // Atomic decrement: the filter guarantees we never go negative even
    // if two payments are confirmed concurrently.
    const result = await Product.updateOne(
      { _id: item.productId, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
    );

    if (result.modifiedCount === 0) {
      shortage = true;
      continue;
    }

    const product: any = await Product.findById(item.productId)
      .select("quantity lowStockThreshold")
      .lean();
    if (!product) continue;

    const remaining = Number(product.quantity) || 0;
    const low = Number(product.lowStockThreshold) || 5;
    await Product.updateOne(
      { _id: item.productId },
      {
        $set: {
          stock_quantity: remaining,
          stockQuantity: remaining,
          stockStatus:
            remaining <= 0 ? "out_of_stock" : remaining <= low ? "low_stock" : "in_stock",
          stock_status:
            remaining <= 0 ? "out_of_stock" : remaining <= low ? "low_stock" : "in_stock",
          lastInventoryUpdate: new Date(),
          last_inventory_update: new Date(),
        },
      },
    );
  }

  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        inventoryDeducted: !shortage,
        inventoryStatus: shortage ? "shortage" : "deducted",
        orderStatus: "processing",
      },
    },
  );

  await createInvoice(order).catch((err) => {
    console.error("[fulfillOrder] invoice failed:", err?.message ?? err);
  });

  await recordPromotionUsage(order).catch((err) => {
    console.error("[fulfillOrder] promotion usage failed:", err?.message ?? err);
  });
}

async function createInvoice(order: any): Promise<void> {
  const existing = await Invoice.findOne({ orderNumber: order.orderNumber })
    .select("_id")
    .lean();
  if (existing) return;

  const year = new Date().getFullYear();
  const invoiceNumber = `INV-${year}-${randomBytes(4).toString("hex").toUpperCase()}`;

  try {
    await Invoice.findOneAndUpdate(
      { orderNumber: order.orderNumber },
      {
        $setOnInsert: {
          invoiceNumber,
          orderNumber: order.orderNumber,
          orderId: order._id,
          userId: order.userId ?? null,
          email: order.email,
          firstName: order.firstName,
          lastName: order.lastName,
          products: order.products,
          subtotal: order.subtotal,
          tax: order.tax,
          shippingCost: order.shippingCost,
          discount: order.discount,
          total: order.total,
          billingAddress: order.billingAddress,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod,
          notes: order.notes,
          status: "paid",
          issuedAt: new Date(),
          paidAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (err: any) {
    // A concurrent confirmation may have won the unique orderNumber race.
    if (err?.code !== 11000) throw err;
  }
}

async function recordPromotionUsage(order: any): Promise<void> {
  const applied = Array.isArray(order.appliedPromotions)
    ? order.appliedPromotions
    : [];
  if (applied.length === 0) return;

  for (const promotion of applied) {
    await PromotionUsage.updateOne(
      {
        promotionId: promotion.promotionId,
        orderId: order._id,
      },
      {
        $setOnInsert: {
          promotionId: promotion.promotionId,
          orderId: order._id,
          customerId: order.userId ?? null,
          discountAmount: Math.max(0, Number(promotion.discount) || 0),
          code: promotion.code,
        },
      },
      { upsert: true },
    );
  }
}

