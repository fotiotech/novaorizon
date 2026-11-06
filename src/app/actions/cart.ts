"use server";

import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import Product from "@/models/Product";
import Cart from "@/models/Cart";
import Order from "@/models/Order";
import { getAuthUser, requireUser } from "@/lib/authz";
import { getGuestId, getOrCreateGuestId } from "@/lib/guest";

/**
 * Resolve the cart owner from the request, never from a caller-supplied
 * userId/sessionId. Signed-in users own their cart by userId; guests own
 * theirs by the HttpOnly guestId cookie.
 */
async function resolveCartOwner(): Promise<{
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
}> {
  const user = await getAuthUser();
  if (user) return { userId: new mongoose.Types.ObjectId(user.id) };
  return { sessionId: await getOrCreateGuestId() };
}

// Types
export interface CartItemInput {
  productId: string;
  variant?: string;
  quantity: number;
}

function getProductQuantity(product: any) {
  return Number(product?.quantity ?? 0);
}

// Helper to calculate totals
async function recalculateCart(cart: any) {
  const itemTotals = cart.items.map((item: any) => ({
    ...item,
    totalPrice: item.price * item.quantity - (item.discount || 0),
  }));
  const subtotal = itemTotals.reduce(
    (sum: number, item: any) => sum + item.totalPrice,
    0,
  );
  const tax = subtotal * 0;
  const discount = cart.discount || 0;
  const shippingCost = cart.shippingCost || 0;
  const total = subtotal + tax + shippingCost - discount;
  cart.subtotal = subtotal;
  cart.tax = tax;
  cart.total = total;
  return cart;
}

// Helper to populate product details and convert to plain object
async function populateAndLean(cart: any) {
  await cart.populate("items.productId", "name images slug price");
  return cart.toObject();
}

// Retrieve the current cart for the request's owner.
export async function getCart(_identifier?: {
  userId?: string;
  sessionId?: string;
}) {
  await connection();
  const owner = await resolveCartOwner();

  let cart: any = await Cart.findOne(owner)
    .populate("items.productId", "name images slug price")
    .lean();

  if (!cart) {
    cart = await Cart.create({
      ...owner,
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      shippingCost: 0,
      total: 0,
    });
    cart = cart?.toObject();
  }

  return {
    ...cart,
    _id: cart?._id.toString(),
    userId: cart?.userId?.toString(),
    items: cart?.items.map((item: any) => ({
      ...item,
      _id: item._id.toString(),
      name: item.productId?.name || item.name || "",
      image: item.productId?.images?.[0] || item.image || null,
      price: item.productId?.price || item.price || 0,
      productId: item.productId?._id?.toString() || item.productId?.toString(),
    })),
  };
}

export async function mergeGuestSessionData(_args?: {
  guestId?: string;
  sessionId?: string;
  userId?: string;
}) {
  const user = await requireUser();
  await connection();

  // Only merge the browser's own guest cart. Caller-supplied IDs are
  // ignored so one user cannot claim another user's cart/orders.
  const guestId = await getGuestId();
  if (!guestId) {
    return { success: true, merged: false };
  }

  const userObjectId = new mongoose.Types.ObjectId(user.id);
  let targetCart = await Cart.findOne({ userId: userObjectId });
  const guestCarts = await Cart.find({ sessionId: guestId }).exec();

  if (!targetCart && guestCarts.length > 0) {
    targetCart = guestCarts[0];
    targetCart.userId = userObjectId;
    targetCart.sessionId = undefined;
  }

  if (!targetCart) {
    targetCart = new Cart({
      userId: userObjectId,
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      shippingCost: 0,
      total: 0,
    });
  }

  for (const guestCart of guestCarts) {
    if (guestCart._id.toString() === targetCart._id?.toString()) continue;

    for (const item of guestCart.items) {
      const existingItem = targetCart.items.find(
        (cartItem: any) =>
          cartItem.productId.toString() === item.productId.toString() &&
          (cartItem.variant || null) === (item.variant || null),
      );

      if (existingItem) {
        existingItem.quantity += item.quantity;
        existingItem.price = item.price;
      } else {
        targetCart.items.push({
          productId: item.productId,
          variant: item.variant,
          quantity: item.quantity,
          name: item.name,
          image: item.image,
          price: item.price,
          taxRate: item.taxRate || 0,
          discount: item.discount || 0,
        });
      }
    }

    await Cart.deleteOne({ _id: guestCart._id });
  }

  targetCart.userId = userObjectId;
  targetCart.sessionId = undefined;
  await recalculateCart(targetCart);
  await targetCart.save();

  await Order.updateMany(
    {
      guestId,
      $or: [{ userId: null }, { userId: userObjectId }],
    },
    {
      $set: { userId: userObjectId },
      $unset: { guestId: 1 },
    },
  );

  revalidatePath("/cart");
  return { success: true, merged: true };
}

// Add item to cart (upsert)
export async function addToCart(
  _identifier: { userId?: string; sessionId?: string },
  input: CartItemInput,
) {
  await connection();
  const owner = await resolveCartOwner();

  if (input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const product: any = await Product.findById(input.productId)
    .select("price name images quantity lowStockThreshold")
    .lean();
  if (!product) throw new Error("Product not found");

  const availableQty = product.quantity || 0;
  const price = product.price;

  let cart: any = await Cart.findOne(owner);

  if (!cart) {
    cart = new Cart({ ...owner, items: [] });
  }

  const currentQtyInCart = cart.items.reduce((sum: number, item: any) => {
    if (item.productId.toString() !== input.productId) return sum;
    if ((item.variant || null) !== (input.variant || null)) return sum;
    return sum + Number(item.quantity || 0);
  }, 0);

  if (availableQty < currentQtyInCart + input.quantity) {
    const remaining = Math.max(0, availableQty - currentQtyInCart);
    throw new Error(
      remaining > 0
        ? `Only ${remaining} unit${remaining > 1 ? "s" : ""} available in stock.`
        : "Insufficient stock available.",
    );
  }

  const existingItemIndex = cart.items.findIndex(
    (item: any) =>
      item.productId.toString() === input.productId &&
      (item.variant || null) === (input.variant || null),
  );

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += input.quantity;
  } else {
    cart.items.push({
      productId: new mongoose.Types.ObjectId(input.productId),
      variant: input.variant || undefined,
      image: product.images?.[0] || null,
      name: product.name,
      quantity: input.quantity,
      price: price,
      taxRate: 0,
      discount: 0,
    });
  }

  await recalculateCart(cart);
  await cart.save();

  const cartObject = await populateAndLean(cart);
  revalidatePath("/pos");
  return { success: true, cart: cartObject };
}

// Update item quantity
export async function updateCartItem(
  _identifier: { userId?: string; sessionId?: string },
  itemId: string,
  quantity: number,
) {
  await connection();
  const owner = await resolveCartOwner();

  const cart = await Cart.findOne(owner);
  if (!cart) throw new Error("Cart not found");

  const item = cart.items.id(itemId);
  if (!item) throw new Error("Item not found");

  if (quantity <= 0) {
    cart.items.pull(itemId);
  } else {
    const product: any = await Product.findById(item.productId)
      .select("quantity lowStockThreshold")
      .lean();
    const availableQty = getProductQuantity(product || {});

    if (quantity > availableQty) {
      throw new Error(
        `Only ${availableQty} unit${availableQty > 1 ? "s" : ""} available in stock.`,
      );
    }

    item.quantity = quantity;
  }

  await recalculateCart(cart);
  await cart.save();

  const cartObject = await populateAndLean(cart);
  revalidatePath("/pos");
  return { success: true, cart: cartObject };
}

// Remove item
export async function removeFromCart(
  identifier: { userId?: string; sessionId?: string },
  itemId: string,
) {
  return updateCartItem(identifier, itemId, 0);
}

// Clear cart
export async function clearCart(_identifier?: {
  userId?: string;
  sessionId?: string;
}) {
  await connection();
  const owner = await resolveCartOwner();

  const cart = await Cart.findOne(owner);
  if (!cart) throw new Error("Cart not found");

  cart.items = [];
  await recalculateCart(cart);
  await cart.save();

  const cartObject = await populateAndLean(cart);
  revalidatePath("/pos");
  return { success: true, cart: cartObject };
}

// Promotions are validated and applied server-side at checkout. This
// legacy action used to accept an arbitrary discount amount from the
// browser, which allowed price tampering.
export async function applyDiscount(
  _identifier?: { userId?: string; sessionId?: string },
  _discountValue?: number,
  _couponCode?: string,
): Promise<{ success: boolean; cart?: any; error?: string }> {
  return {
    success: false,
    error: "Discounts are applied automatically at checkout.",
  };
}
