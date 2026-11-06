import "server-only";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Address from "@/models/Address";
import { calculateShippingPrice } from "@/app/actions/carrier";
import {
  previewCartDiscounts,
  type Cart as PromotionCart,
} from "@/app/actions/promotions";
import { getAuthUser } from "@/lib/authz";
import { getOrCreateGuestId } from "@/lib/guest";
import { canAccessOrder } from "@/lib/order-access";
import { consumeRateLimit } from "@/lib/rate-limit";

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  variant?: string;
}

export interface CheckoutAddress {
  street?: string;
  city?: string;
  region?: string;
  address?: string;
  country?: string;
  carrier?: string;
}

export interface CreateCheckoutOrderInput {
  idempotencyKey?: string;
  items: CheckoutItemInput[];
  appliedCodes?: string[];
  carrierId?: string;
  shippingAddress: CheckoutAddress;
  billingAddress?: CheckoutAddress;
  billingAddressId?: string | null;
  paymentMethod: string;
  paymentMethodId?: string | null;
  guest?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  notes?: string;
}

export interface CheckoutOrderSummary {
  orderNumber: string;
  orderId: string;
  paymentStatus: string;
  orderStatus: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  products: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: CompleteAddress & { carrier?: string };
  billingAddress: CompleteAddress;
  createdAt?: string;
  paidAt?: string;
}

const PAYMENT_METHODS = new Set(["MobileMoney", "PayPal", "CashOnDelivery"]);
const MAX_ITEMS = 50;
const MAX_QTY = 99;

function clean(value: unknown, max = 200): string {
  return String(value ?? "").trim().slice(0, max);
}

type CompleteAddress = Required<Omit<CheckoutAddress, "carrier">>;

function normalizeAddress(input: CheckoutAddress): CompleteAddress {
  const street = clean(input.street, 300);
  return {
    street,
    city: clean(input.city),
    region: clean(input.region),
    address: clean(input.address, 300) || street,
    country: clean(input.country),
  };
}

function isCompleteAddress(address: CompleteAddress): boolean {
  return Boolean(
    address.street && address.city && address.region && address.country,
  );
}

function makeOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${date}-${random}`;
}

function toSummary(order: any): CheckoutOrderSummary {
  return {
    orderNumber: String(order.orderNumber),
    orderId: String(order._id),
    paymentStatus: String(order.paymentStatus),
    orderStatus: String(order.orderStatus),
    subtotal: Number(order.subtotal) || 0,
    discount: Number(order.discount) || 0,
    shippingCost: Number(order.shippingCost) || 0,
    total: Number(order.total) || 0,
    products: (order.products ?? []).map((p: any) => ({
      productId: String(p.productId),
      name: String(p.name),
      quantity: Number(p.quantity) || 0,
      price: Number(p.price) || 0,
    })),
    shippingAddress: {
      street: String(order.shippingAddress?.street ?? ""),
      city: String(order.shippingAddress?.city ?? ""),
      region: String(order.shippingAddress?.region ?? ""),
      address: String(order.shippingAddress?.address ?? ""),
      country: String(order.shippingAddress?.country ?? ""),
      carrier: order.shippingAddress?.carrier
        ? String(order.shippingAddress.carrier)
        : undefined,
    },
    billingAddress: {
      street: String(order.billingAddress?.street ?? ""),
      city: String(order.billingAddress?.city ?? ""),
      region: String(order.billingAddress?.region ?? ""),
      address: String(order.billingAddress?.address ?? ""),
      country: String(order.billingAddress?.country ?? ""),
    },
    createdAt: order.createdAt
      ? new Date(order.createdAt).toISOString()
      : undefined,
    paidAt: order.paidAt ? new Date(order.paidAt).toISOString() : undefined,
  };
}

/**
 * Creates an order from the cart, recomputing every monetary value from
 * the database. The browser may only choose products, quantities,
 * addresses, a carrier and a payment method.
 */
export async function createCheckoutOrder(
  input: CreateCheckoutOrderInput,
): Promise<
  | { success: true; order: CheckoutOrderSummary; reused: boolean }
  | { success: false; error: string }
> {
  try {
    await connection();
    const user = await getAuthUser();
    const guestId = user ? null : await getOrCreateGuestId();

    const limit = await consumeRateLimit(
      `checkout:${user?.id ?? guestId ?? "unknown"}`,
      20,
      60 * 60 * 1000,
    );
    if (!limit.ok) {
      return {
        success: false,
        error: "Too many checkout attempts. Please try again later.",
      };
    }

    const items = Array.isArray(input.items) ? input.items : [];
    if (items.length === 0 || items.length > MAX_ITEMS) {
      return { success: false, error: "Your cart is empty or too large." };
    }

    const paymentMethod = clean(input.paymentMethod, 40);
    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return { success: false, error: "Unsupported payment method." };
    }

    const shippingAddress = normalizeAddress(input.shippingAddress ?? {});
    if (!isCompleteAddress(shippingAddress)) {
      return { success: false, error: "A complete shipping address is required." };
    }

    const billingAddress = input.billingAddress
      ? normalizeAddress(input.billingAddress)
      : shippingAddress;
    if (!isCompleteAddress(billingAddress)) {
      return { success: false, error: "A complete billing address is required." };
    }

    if (!user) {
      const email = clean(input.guest?.email, 200).toLowerCase();
      const firstName = clean(input.guest?.firstName, 80);
      const lastName = clean(input.guest?.lastName, 80);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: "A valid email address is required." };
      }
      if (!firstName || !lastName) {
        return { success: false, error: "First and last name are required." };
      }
    }

    const idempotencyKey =
      clean(input.idempotencyKey, 120) || `srv-${randomBytes(16).toString("hex")}`;
    const ownerFilter = user
      ? { userId: new mongoose.Types.ObjectId(user.id) }
      : { guestId };

    const existing = await Order.findOne({
      idempotencyKey,
      ...ownerFilter,
    }).lean();
    if (existing) {
      return { success: true, order: toSummary(existing), reused: true };
    }

    // Resolve products and prices from the database.
    const ids = Array.from(new Set(items.map((i) => clean(i.productId, 40))));
    if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return { success: false, error: "One of the cart items is invalid." };
    }

    const products = await Product.find({
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      status: { $nin: ["draft", "inactive"] },
    })
      .select(
        "name price listPrice images quantity status categoryId brand variants",
      )
      .lean();

    const productMap = new Map(
      products.map((p: any) => [String(p._id), p]),
    );

    const orderProducts: Array<{
      productId: mongoose.Types.ObjectId;
      name: string;
      quantity: number;
      price: number;
    }> = [];
    const promoItems: PromotionCart["items"] = [];

    for (const item of items) {
      const product: any = productMap.get(clean(item.productId, 40));
      if (!product) {
        return {
          success: false,
          error: "One of the cart items is no longer available.",
        };
      }

      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) {
        return { success: false, error: "Invalid item quantity." };
      }

      const available = Number(product.quantity) || 0;
      if (available < quantity) {
        return {
          success: false,
          error: `Only ${available} unit(s) of ${product.name || "this item"} are available.`,
        };
      }

      let unitPrice =
        Number(product.price) || Number(product.listPrice) || 0;
      if (item.variant && Array.isArray(product.variants)) {
        const variant = product.variants.find(
          (v: any) =>
            String(v?._id ?? "") === String(item.variant) ||
            String(v?.sku ?? "") === String(item.variant) ||
            String(v?.value ?? "") === String(item.variant),
        );
        const variantPrice = Number(variant?.price);
        if (Number.isFinite(variantPrice) && variantPrice > 0) {
          unitPrice = variantPrice;
        }
      }

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return {
          success: false,
          error: "One of the cart items has no valid price.",
        };
      }

      orderProducts.push({
        productId: new mongoose.Types.ObjectId(product._id),
        name: clean(product.name, 200) || "Product",
        quantity,
        price: unitPrice,
      });

      promoItems.push({
        productId: String(product._id),
        quantity,
        unitPrice,
        categoryIds: product.categoryId ? [String(product.categoryId)] : [],
        brandId: product.brand ? String(product.brand) : undefined,
      });
    }

    const subtotal = orderProducts.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0,
    );

    let shippingCost = 0;
    if (input.carrierId) {
      try {
        const carrier = await calculateShippingPrice(
          clean(input.carrierId, 40),
          shippingAddress.region,
        );
        shippingCost = Math.max(0, Number(carrier.shippingPrice) || 0);
      } catch {
        return {
          success: false,
          error: "Shipping is not available for the selected address.",
        };
      }
    }

    const promoCart: PromotionCart = {
      items: promoItems,
      subtotal,
      shippingCost,
    };

    const discountResult = await previewCartDiscounts(
      promoCart,
      { customerId: user?.id ?? null },
      (input.appliedCodes ?? []).map((c) => clean(c, 40)).filter(Boolean),
    );

    const discount = Math.max(
      0,
      Math.min(Number(discountResult.totalDiscount) || 0, subtotal + shippingCost),
    );
    const total = Math.max(0, subtotal + shippingCost - discount);

    let billingAddressId: mongoose.Types.ObjectId | null = null;
    if (
      input.billingAddressId &&
      mongoose.Types.ObjectId.isValid(input.billingAddressId)
    ) {
      const ownedAddress = await Address.findOne({
        _id: input.billingAddressId,
        ...(user
          ? { userId: new mongoose.Types.ObjectId(user.id) }
          : { guestId }),
      })
        .select("_id")
        .lean();
      if (ownedAddress) {
        billingAddressId = new mongoose.Types.ObjectId(
          String(ownedAddress._id),
        );
      }
    }

    const email = user?.email || clean(input.guest?.email, 200).toLowerCase();
    const firstName =
      clean(input.guest?.firstName, 80) ||
      clean(user?.name ?? "", 80).split(/\s+/)[0] ||
      "Customer";
    const lastName =
      clean(input.guest?.lastName, 80) ||
      clean(user?.name ?? "", 80).split(/\s+/).slice(1).join(" ") ||
      "Customer";

    let orderNumber = makeOrderNumber();
    for (let i = 0; i < 5; i++) {
      const exists = await Order.exists({ orderNumber });
      if (!exists) break;
      orderNumber = makeOrderNumber();
    }

    const created = await Order.create({
      orderNumber,
      idempotencyKey,
      userId: user ? new mongoose.Types.ObjectId(user.id) : null,
      guestId,
      email,
      firstName,
      lastName,
      products: orderProducts,
      subtotal,
      tax: 0,
      shippingCost,
      discount,
      total,
      paymentStatus: "pending",
      paymentMethod,
      paymentMethodId:
        input.paymentMethodId &&
        mongoose.Types.ObjectId.isValid(input.paymentMethodId)
          ? new mongoose.Types.ObjectId(input.paymentMethodId)
          : null,
      billingAddressId,
      billingAddress,
      shippingAddress: {
        ...shippingAddress,
        carrier: clean(input.shippingAddress?.carrier, 120) || undefined,
      },
      carrierId:
        input.carrierId && mongoose.Types.ObjectId.isValid(input.carrierId)
          ? new mongoose.Types.ObjectId(input.carrierId)
          : null,
      orderStatus: "pending",
      shippingStatus: "pending",
      notes: clean(input.notes, 1000) || undefined,
      inventoryStatus: "pending",
      appliedPromotions: (discountResult.applied ?? []).map((a) => ({
        promotionId: new mongoose.Types.ObjectId(a._id),
        name: a.name,
        code: a.code,
        discount: Math.max(0, Number(a.discount) || 0),
        calculationType: a.calculationType,
      })),
    });

    return { success: true, order: toSummary(created.toObject()), reused: false };
  } catch (error: any) {
    console.error("[createCheckoutOrder] failed:", error?.message ?? error);
    return { success: false, error: "Unable to create the order." };
  }
}

/** Returns an order only when the current user/guest owns it. */
export async function getCheckoutOrder(
  orderNumber: string,
): Promise<CheckoutOrderSummary | null> {
  const number = clean(orderNumber, 80);
  if (!number) return null;
  await connection();
  const order = await Order.findOne({ orderNumber: number }).lean();
  if (!order || !(await canAccessOrder(order))) return null;
  return toSummary(order);
}
