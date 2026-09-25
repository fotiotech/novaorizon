// app/actions/order.ts
"use server";
import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import Order, { OrderDocument } from "@/models/Order";
import Product from "@/models/Product";
import Invoice from "@/models/Invoice";
import { revalidatePath } from "next/cache";
import Shipping from "@/models/Shipping";
import Transaction from "@/models/Transaction";
import "@/models/Address";
import "@/models/PaymentMethod";
import { recordPromotionUsage } from "./promotions";

export async function findOrders(options?: {
  orderNumber?: string;
  userId?: string | null;
  page?: number;
  limit?: number;
  orderStatus?: string;
  paymentStatus?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  carrier?: string;
}) {
  await connection();

  const {
    orderNumber,
    userId,
    page = 1,
    limit = 10,
    orderStatus,
    paymentStatus,
    search,
    dateFrom,
    dateTo,
    carrier,
  } = options || {};

  try {
    let query: any = {};

    if (orderNumber) {
      query.orderNumber = new RegExp(orderNumber, "i");
    }

    if (userId) {
      query.userId = userId;
    }

    if (orderStatus) {
      query.orderStatus = orderStatus;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = dateFrom;
      if (dateTo) query.createdAt.$lte = dateTo;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { orderNumber: searchRegex },
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
      ];
    }

    if (carrier) {
      query["shippingAddress.carrier"] = carrier;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("billingAddressId paymentMethodId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders: orders.map((order) => ({
        ...order,
        _id: order._id.toString(),
        userId: order.userId ? order.userId.toString() : null,
      })),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: any) {
    console.error(`Error fetching orders: ${error.message}`);
    throw error;
  }
}

export async function getOrderByNumber(orderNumber: string) {
  await connection();
  try {
    const order = await Order.findOne({ orderNumber })
      .populate("billingAddressId paymentMethodId")
      .lean();
    if (!order) return null;
    return {
      ...order,
      _id: order._id.toString(),
      userId: order.userId ? order.userId.toString() : null,
    };
  } catch (error: any) {
    console.error(`Error fetching order by number: ${error.message}`);
    throw error;
  }
}

export async function updateOrderStatus(
  orderNumber: string,
  updates: {
    paymentStatus?: OrderDocument["paymentStatus"];
    orderStatus?: OrderDocument["orderStatus"];
  },
): Promise<{ success: boolean; order?: any; error?: string }> {
  await connection();

  if (!orderNumber) {
    return { success: false, error: "Order number is required" };
  }

  if (!updates.paymentStatus && !updates.orderStatus) {
    return { success: false, error: "At least one status must be provided" };
  }

  try {
    // Fetch first so we can detect the *transition* (unpaid → paid).
    const existing: any = await Order.findOne({ orderNumber }).lean();
    if (!existing) {
      return {
        success: false,
        error: `Order with number ${orderNumber} not found`,
      };
    }

    const updateFields: any = {};
    if (updates.paymentStatus)
      updateFields.paymentStatus = updates.paymentStatus;
    if (updates.orderStatus) updateFields.orderStatus = updates.orderStatus;

    const order = await Order.findOneAndUpdate(
      { orderNumber },
      { $set: updateFields },
      { new: true, runValidators: false },
    );

    if (!order) {
      return {
        success: false,
        error: `Order with number ${orderNumber} not found`,
      };
    }

    const wasUnpaid = existing.paymentStatus !== "paid";
    const isNowPaid = updates.paymentStatus === "paid";
    const isPaidTransition = isNowPaid && wasUnpaid;

    // Mirror the createOrUpdateOrder flow: on the pending→paid
    // transition, deduct inventory, advance promotion usage, and
    // issue an invoice. Each step is wrapped so a failure in one
    // doesn't take down the whole status update.
    if (isPaidTransition) {
      // 1. Deduct inventory.
      try {
        await syncInventoryFromOrder(order.toObject(), "deduct");
      } catch (invErr: any) {
        console.error(
          "[updateOrderStatus] syncInventoryFromOrder failed:",
          invErr?.message ?? invErr,
        );
      }

      // 2. Record promotion redemption. Idempotent per (promotion,
      //    order) thanks to the unique index on PromotionUsage, so
      //    re-running this on an already-paid order is safe — but we
      //    only call it on the transition to avoid unnecessary reads.
      try {
        const applied: any[] = (order as any).appliedPromotions ?? [];
        if (applied.length > 0) {
          await recordPromotionUsage(
            order._id.toString(),
            applied.map((a: any) => ({
              _id: a.promotionId?.toString?.() ?? String(a.promotionId),
              discount: a.discount,
              code: a.code,
            })),
            order.userId?.toString?.() ?? null,
          );
        }
      } catch (usageErr: any) {
        console.error(
          "[updateOrderStatus] recordPromotionUsage failed:",
          usageErr?.message ?? usageErr,
        );
      }

      // 3. Issue invoice if one doesn't exist yet.
      try {
        const existingInvoice = await Invoice.findOne({
          orderNumber: order.orderNumber,
        }).lean();
        if (!existingInvoice) {
          const year = new Date().getFullYear();
          const random = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
          const invoiceNumber = `INV-${year}-${random}`;
          await Invoice.create({
            invoiceNumber,
            orderNumber: order.orderNumber,
            orderId: order._id,
            userId: order.userId,
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
          });
        }
      } catch (invoiceError: any) {
        console.error(
          "[updateOrderStatus] Error creating invoice:",
          invoiceError?.message ?? invoiceError,
        );
      }
    }

    if (updates.paymentStatus === "refunded") {
      try {
        const refundTransaction = new Transaction({
          orderId: order._id,
          userId: order.userId,
          amount: order.total,
          type: "refund",
          description: `Refund for order #${order.orderNumber}`,
          status: "completed",
          paymentMethod: order.paymentMethod,
          date: new Date(),
        });
        await refundTransaction.save();
      } catch (refundError: any) {
        console.error(
          "[updateOrderStatus] Error creating refund transaction:",
          refundError?.message ?? refundError,
        );
      }
    }

    revalidatePath("/profile/myorders");
    revalidatePath("/sales/orders");

    return { success: true, order: order.toObject() };
  } catch (error: any) {
    console.error("[updateOrderStatus] Error:", error.message);
    return { success: false, error: error.message };
  }
}

function getProductQuantity(product: any) {
  return Number(
    product?.quantity ?? product?.stock_quantity ?? product?.stockQuantity ?? 0,
  );
}

async function syncInventoryFromOrder(
  order: any,
  action: "deduct" | "restore" = "deduct",
) {
  if (!order?.products || !Array.isArray(order.products)) return;

  for (const item of order.products) {
    const productId = item.productId?.toString?.() || item.productId;
    if (!productId) continue;

    const product: any = await Product.findById(productId);
    if (!product) continue;

    const currentQty = getProductQuantity(product);
    const requestedQty = Number(item.quantity || 0);

    if (action === "deduct") {
      if (requestedQty > currentQty) {
        throw new Error(
          `Insufficient stock for ${product.name || "one of the items"}. Only ${currentQty} available.`,
        );
      }

      const nextQty = Math.max(0, currentQty - requestedQty);
      product.quantity = nextQty;
      product.stock_quantity = nextQty;
      product.stockQuantity = nextQty;

      if (nextQty <= 0) {
        product.stockStatus = "out_of_stock";
        product.stock_status = "out_of_stock";
      } else if (
        nextQty <=
        Number(product.lowStockThreshold ?? product.low_stock_threshold ?? 10)
      ) {
        product.stockStatus = "low_stock";
        product.stock_status = "low_stock";
      } else {
        product.stockStatus = "in_stock";
        product.stock_status = "in_stock";
      }

      product.lastInventoryUpdate = new Date();
      product.last_inventory_update = product.lastInventoryUpdate;
      await product.save();
    }
  }
}

export async function requestReturn(
  orderNumber: string,
  reason: string,
): Promise<{ success: boolean; error?: string; order?: any }> {
  await connection();

  if (!orderNumber) {
    return { success: false, error: "Order number is required." };
  }

  try {
    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return { success: false, error: "Order not found." };
    }

    if (order.paymentStatus !== "paid") {
      return {
        success: false,
        error: "Only paid orders can be returned or refunded.",
      };
    }

    if (
      ["returned", "return_requested", "cancelled"].includes(order.orderStatus)
    ) {
      return {
        success: false,
        error:
          "This order already has a return request or has already been returned.",
      };
    }

    const updated = await Order.findOneAndUpdate(
      { orderNumber },
      {
        $set: {
          orderStatus: "return_requested",
          returnReason: reason || "Customer requested a return.",
          returnRequestedAt: new Date(),
        },
      },
      { new: true },
    );

    revalidatePath("/profile/myorders");
    return { success: true, order: updated?.toObject() };
  } catch (error: any) {
    console.error("[requestReturn] Error:", error);
    return {
      success: false,
      error: error.message || "Unable to request return.",
    };
  }
}

export async function createOrUpdateOrder(
  payment_ref: string,
  data: Partial<OrderDocument>,
): Promise<{ success: boolean; order?: any; error?: string }> {
  await connection();

  if (!payment_ref || !data) {
    console.error("[createOrUpdateOrder] Missing payment_ref or data");
    return { success: false, error: "Missing payment_ref or data" };
  }

  const {
    tax = 0,
    shippingCost = 0,
    paymentStatus = "pending",
    shippingStatus = "pending",
    orderStatus = "processing",
    discount = 0,
    guestId = null,
    appliedPromotions,
    shippingAddress = {
      street: "",
      city: "",
      region: "",
      address: "",
      country: "",
      carrier: "Novaorizon",
    },
    billingAddress = {
      street: "",
      city: "",
      region: "",
      address: "",
      country: "",
    },
    billingAddressId,
    paymentMethodId,
    ...rest
  } = data;

  const payload: any = {
    ...rest,
    orderNumber: payment_ref,
    guestId,
    tax,
    shippingCost,
    paymentStatus,
    shippingStatus,
    orderStatus,
    discount,
    shippingAddress: {
      street: shippingAddress.street || "",
      region: shippingAddress.region || "",
      city: shippingAddress.city || "",
      address: shippingAddress.address || "",
      carrier: shippingAddress.carrier || "Novaorizon",
      country: shippingAddress.country || "",
    },
    billingAddress: {
      street: billingAddress.street || "",
      city: billingAddress.city || "",
      region: billingAddress.region || "",
      address: billingAddress.address || "",
      country: billingAddress.country || "",
    },
    billingAddressId: billingAddressId || null,
    paymentMethodId: paymentMethodId || null,
  };

  // Only set appliedPromotions when the caller actually provided it.
  // A later call (e.g. a payment webhook) omits it, and findOneAndUpdate
  // is a $set under the hood — so the existing snapshot on the order is
  // preserved without us having to re-send it.
  if (appliedPromotions !== undefined) {
    payload.appliedPromotions = appliedPromotions.map((a: any) => ({
      promotionId: a.promotionId ?? a._id,
      name: a.name,
      code: a.code,
      discount: Math.max(0, Number(a.discount) || 0),
    }));
  }

  try {
    const existingOrder = await Order.findOne({
      orderNumber: payment_ref,
    }).lean();

    const savedOrder = await Order.findOneAndUpdate(
      { orderNumber: payment_ref },
      payload,
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    const isPaidTransition =
      payload.paymentStatus === "paid" &&
      (!existingOrder || existingOrder.paymentStatus !== "paid");

    if (isPaidTransition) {
      await syncInventoryFromOrder(savedOrder.toObject(), "deduct");

      // Record redemption so per-customer / total usage limits advance.
      // Idempotent per (promotion, order) thanks to a unique index on
      // PromotionUsage — safe if this runs twice for the same order.
      try {
        const applied: any[] = (savedOrder as any).appliedPromotions ?? [];
        if (applied.length > 0) {
          await recordPromotionUsage(
            savedOrder._id.toString(),
            applied.map((a: any) => ({
              _id: a.promotionId?.toString?.() ?? String(a.promotionId),
              discount: a.discount,
              code: a.code,
            })),
            savedOrder.userId?.toString?.() ?? null,
          );
        }
      } catch (usageError) {
        console.error(
          "[createOrUpdateOrder] Failed to record promotion usage:",
          usageError,
        );
      }

      try {
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const invoiceNumber = `INV-${year}-${random}`;
        await Invoice.create({
          invoiceNumber,
          orderNumber: savedOrder.orderNumber,
          orderId: savedOrder._id,
          userId: savedOrder.userId,
          email: savedOrder.email,
          firstName: savedOrder.firstName,
          lastName: savedOrder.lastName,
          products: savedOrder.products,
          subtotal: savedOrder.subtotal,
          tax: savedOrder.tax,
          shippingCost: savedOrder.shippingCost,
          discount: savedOrder.discount,
          total: savedOrder.total,
          billingAddress: savedOrder.billingAddress,
          shippingAddress: savedOrder.shippingAddress,
          paymentMethod: savedOrder.paymentMethod,
          notes: savedOrder.notes,
          status: "paid",
          issuedAt: new Date(),
          paidAt: new Date(),
        });
      } catch (invoiceError) {
        console.error(
          "[createOrUpdateOrder] Error creating invoice:",
          invoiceError,
        );
      }
    }

    const plainOrder = savedOrder.toObject();
    return { success: true, order: plainOrder };
  } catch (err: any) {
    console.error("[createOrUpdateOrder] Error saving order:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteOrder(orderNumber: string) {
  await connection();

  if (!orderNumber) {
    console.error("Missing order number");
    return null;
  }

  try {
    const deletedOrder = await Order.findOneAndDelete({ orderNumber });

    if (!deletedOrder) {
      console.error(`Order with order number ${orderNumber} not found`);
      return null;
    }

    console.log(`Order with order number ${orderNumber} deleted successfully`);
    revalidatePath("/sales/orders");
    return deletedOrder;
  } catch (error: any) {
    console.error("Error deleting order:", error.message);
    return null;
  }
}

export async function generateTrackingNumber(
  trackingNumber: string,
): Promise<string> {
  const existing = await Shipping.findOne({ trackingNumber });
  if (existing) {
    return trackingNumber;
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < 10; i++) {
    trackingNumber += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return trackingNumber;
}
