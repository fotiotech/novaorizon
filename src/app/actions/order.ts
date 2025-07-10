"use server";
import { connection } from "@/utils/connection";
import Order from "@/models/Order";
import { revalidatePath } from "next/cache";
import Shipping from "@/models/Shipping";

export interface OrderData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  products: Array<{
    productId: string;
    name: string;
    imageUrl?: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  total: number;
  transactionId?: string;
  paymentMethod?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    region?: string;
    address?: string;
    country?: string;
    carrier?: string;
  };
  shippingDate?: Date;
  deliveryDate?: Date;
  notes?: string;
  couponCode?: string;
  // optional fields with defaults:
  tax?: number;
  shippingCost?: number;
  paymentStatus?: string;
  shippingStatus?: string;
  orderStatus?: string;
  discount?: number;
}

export async function findOrders(orderNumber?: string, userId?: string | null) {
  await connection();

  try {
    if (orderNumber !== undefined && orderNumber !== null) {
      // Explicitly check for non-null and non-undefined values
      const regex = new RegExp(orderNumber, "i"); // Case-insensitive regex
      const order = await Order.findOne({
        orderNumber: { $regex: regex },
      });
      if (order) {
        return {
          ...order.toObject(),
          _id: order._id.toString(),
          userId: order.userId.toString(),
        };
      }
      // Explicitly return null if no order is found
    } else if (userId) {
      // Find all orders for a specific user by user ID
      const orders = await Order.find({ userId });
      return orders.map((order) => ({
        ...order.toObject(),
        _id: order._id.toString(),
        userId: order.userId.toString(),
      }));
    } else {
      // Return all orders (usually for admin view)
      const orders = await Order.find();
      return orders.map((order) => ({
        ...order.toObject(),
        _id: order._id.toString(),
        userId: order.userId.toString(),
      }));
    }
  } catch (error: any) {
    console.error(`Error fetching orders: ${error.message}`);
    throw error; // Re-throw the error for proper handling
  }
}

export async function createOrUpdateOrder(
  payment_ref: string,
  data: OrderData
) {
  await connection();

  console.log('data', data);

  if (!payment_ref || !data) {
    console.error("[createOrUpdateOrder] Missing payment_ref or data");
    return false;
  }

  console.log(
    `[createOrUpdateOrder] Creating/updating order with orderNumber: ${payment_ref}`
  );

  // Destructure defaults for optional fields
  const {
    tax = 0,
    shippingCost = 0,
    paymentStatus = "pending",
    shippingStatus = "pending",
    orderStatus = "processing",
    discount = 0,
    shippingAddress = {
      street: "",
      city: "",
      region: "",
      address: "",
      country: "",
      carrier: "Novaorizon", // Default carrier
    },
    ...rest
  } = data;

  // Build payload including defaults and only valid shippingAddress
  const payload: any = {
    ...rest,
    orderNumber: payment_ref,
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
      carrier: shippingAddress.carrier || "Novaorizon", // Default carrier
      country: shippingAddress.country || "",
    },
  };

  try {
    const savedOrder = await Order.findOneAndUpdate(
      { orderNumber: payment_ref },
      payload,
      {
        upsert: true, // create if not found
        new: true, // return the updated/created document
        runValidators: true, // apply schema validation
        setDefaultsOnInsert: true, // apply schema defaults on insert
      }
    );

    console.log(
      `[createOrUpdateOrder] Order ${savedOrder} saved/updated successfully`
    );

    if (savedOrder && savedOrder.paymentStatus === "cancelled") {
      const createShipping = new Shipping({
        orderId: savedOrder._id,
        userId: savedOrder.userId,
        address: {
          street: savedOrder.shippingAddress.street,
          city: savedOrder.shippingAddress.city,
          region: savedOrder.shippingAddress.region,
          address: savedOrder.shippingAddress.address,
          country: savedOrder.shippingAddress.country,
          carrier: savedOrder.shippingAddress.carrier || "Novaorizon",
        },
        trackingNumber: savedOrder.orderNumber,
        shippingCost: savedOrder.shippingCost || 2,
        status: "pending",
      });
      const res = await createShipping.save();

      console.log(
        savedOrder.shippingAddress,
        `Shipping created for order ${savedOrder.orderNumber}:`,
        res
      );
    }
    return true;
  } catch (err: any) {
    console.error("[createOrUpdateOrder] Error saving order:", err);
    return false;
  }
}

export async function deleteOrder(orderNumber: string) {
  await connection();

  if (!orderNumber) {
    console.error("Missing order number");
    return null;
  }

  try {
    // Find and delete the order by its orderNumber
    const deletedOrder = await Order.findOneAndDelete({ orderNumber });

    if (!deletedOrder) {
      console.error(`Order with order number ${orderNumber} not found`);
      return null;
    }

    console.log(`Order with order number ${orderNumber} deleted successfully`);
    revalidatePath("/admin/orders");
  } catch (error: any) {
    console.error("Error deleting order:", error.message);
    return null;
  }
}
