// app/actions/storefront/promotions.ts
"use server";

import { connection } from "@/utils/connection";
import Promotion from "@/models/Promotion";
import PromotionType from "@/models/PromotionType";
import PromotionUsage from "@/models/PromotionUsage";
import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────
// Public types — shared with the client via type-only imports.
// ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId?: string;
  categoryIds?: string[];
  brandId?: string;
  quantity: number;
  /** Price per unit in the store's smallest currency unit (e.g. cents). */
  unitPrice: number;
}

export interface Cart {
  items: CartItem[];
  /** Authoritative subtotal — the caller (checkout flow) must compute this
   *  from server-validated prices, never from client-supplied numbers. */
  subtotal: number;
  /** Shipping cost, if any. Used by `free_shipping` promotions. */
  shippingCost?: number;
  currency?: string;
}

export interface CustomerContext {
  customerId?: string | null;
  customerGroupIds?: string[];
}

export interface ApplicablePromotion {
  _id: string;
  name: string;
  description?: string;
  code?: string;
  icon?: string | null;
  priority: number;
  stackable: boolean;
  calculationType: string;
  /** Discount this promotion would produce for the given cart. */
  discount: number;
  /** Short label for the storefront badge, e.g. "10% off" or "Free shipping". */
  label: string;
  /** True when the promotion matched only because a code was supplied. */
  requiresCode: boolean;
}

export interface DiscountResult {
  applied: ApplicablePromotion[];
  excluded: { _id: string; name: string; reason: string }[];
  /** Sum of `discount` across applied promotions (item + shipping). */
  totalDiscount: number;
  /** Portion of totalDiscount that came from shipping. */
  shippingDiscount: number;
  /** subtotal + shippingCost - totalDiscount, floored at 0. */
  total: number;
}

// ─────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Reads a key from a promotion's `propertyValues`, handling both Map and
 *  plain-object shapes (lean queries can return either, depending on driver). */
function prop<T = any>(promotion: any, key: string, fallback: T): T {
  const pv = promotion?.propertyValues;
  if (!pv) return fallback;
  if (pv instanceof Map) {
    const v = pv.get(key);
    return (v === undefined ? fallback : v) as T;
  }
  const v = (pv as Record<string, any>)[key];
  return (v === undefined ? fallback : v) as T;
}

/** Are we inside the promotion's date window? */
function isLive(promotion: any, now: Date): boolean {
  if (!promotion.startDate || !promotion.endDate) return false;
  return (
    now >= new Date(promotion.startDate) && now <= new Date(promotion.endDate)
  );
}

/** Does the customer meet the eligibility rules? */
function meetsEligibility(
  promotion: any,
  cart: Cart,
  ctx: CustomerContext,
): boolean {
  const elig = promotion.customerEligibility ?? {};
  const minOrder = Number(elig.minOrderAmount ?? 0);
  if (minOrder > 0 && cart.subtotal < minOrder) return false;

  if (elig.allCustomers !== false) return true;

  const allowed = (elig.customerGroupIds ?? []).map((g: any) =>
    typeof g === "object" ? String(g._id) : String(g),
  );
  const customerGroups = ctx.customerGroupIds ?? [];
  return customerGroups.some((g) => allowed.includes(g));
}

/** Do usage limits allow one more redemption? */
async function meetsUsageLimits(
  promotionId: string,
  ctx: CustomerContext,
): Promise<{ ok: boolean; reason?: string }> {
  const promotion = await Promotion.findById(promotionId)
    .select("usageLimits")
    .lean();
  if (!promotion) return { ok: false, reason: "Promotion not found" };

  const { totalUses, perCustomer } = (promotion as any).usageLimits ?? {};

  if (totalUses != null) {
    const total = await PromotionUsage.countDocuments({ promotionId });
    if (total >= totalUses) {
      return {
        ok: false,
        reason: "Promotion has reached its total usage limit",
      };
    }
  }

  if (perCustomer != null && ctx.customerId) {
    const mine = await PromotionUsage.countDocuments({
      promotionId,
      customerId: ctx.customerId,
    });
    if (mine >= perCustomer) {
      return { ok: false, reason: "You have already used this promotion" };
    }
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Discount calculators — one per calculationType.
// All return a non-negative number in the same unit as cart.subtotal.
// ─────────────────────────────────────────────────────────────────────

function calcPercentage(promotion: any, cart: Cart): number {
  const pct = Number(prop(promotion, "percentage", 0));
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  const maxRaw = prop(promotion, "maxDiscount", null);
  const max = maxRaw == null ? Infinity : Number(maxRaw);
  const raw = Math.round(cart.subtotal * (pct / 100));
  return Math.max(0, Math.min(raw, max, cart.subtotal));
}

function calcFixedAmount(promotion: any, cart: Cart): number {
  const amount = Number(prop(promotion, "amount", 0));
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(amount, cart.subtotal);
}

/**
 * buy_x_get_y
 * propertyValues: { buyProductIds?: string[], getProductIds?: string[],
 *                   buyQuantity: number, getQuantity: number }
 * If *ProductIds are omitted, the rule applies to any cart item.
 */
function calcBuyXGetY(promotion: any, cart: Cart): number {
  const buyQty = Math.max(1, Number(prop(promotion, "buyQuantity", 1)));
  const getQty = Math.max(1, Number(prop(promotion, "getQuantity", 1)));
  const buyIds: string[] = prop(promotion, "buyProductIds", []) as string[];
  const getIds: string[] = prop(promotion, "getProductIds", []) as string[];

  const buyPool = cart.items.filter(
    (i) => buyIds.length === 0 || buyIds.includes(i.productId),
  );
  const getPool = cart.items
    .filter((i) => getIds.length === 0 || getIds.includes(i.productId))
    .slice()
    .sort((a, b) => a.unitPrice - b.unitPrice); // cheapest free first

  const buyCount = buyPool.reduce((n, i) => n + i.quantity, 0);
  const maxSets = Math.floor(buyCount / buyQty);
  if (maxSets <= 0 || getPool.length === 0) return 0;

  // perOrder caps how many sets can be awarded in a single order.
  const perOrder = Number(prop(promotion, "perOrder", Infinity));
  const setsAllowed =
    Number.isFinite(perOrder) && perOrder > 0
      ? Math.min(maxSets, perOrder)
      : maxSets;

  let remaining = setsAllowed * getQty;
  let discount = 0;

  for (const item of getPool) {
    if (remaining <= 0) break;
    const take = Math.min(item.quantity, remaining);
    discount += take * item.unitPrice;
    remaining -= take;
  }

  return Math.max(0, discount);
}

function calcFreeShipping(promotion: any, cart: Cart): number {
  const shipping = Number(cart.shippingCost ?? 0);
  if (shipping <= 0) return 0;
  const capRaw = prop(promotion, "maxShippingCost", null);
  const cap = capRaw == null ? Infinity : Number(capRaw);
  return Math.max(0, Math.min(shipping, cap));
}

/**
 * bundle_discount
 * propertyValues: { productIds: string[], bundleQuantity: number,
 *                   discountAmount: number }
 * Discount applies if the cart contains every productId at >= bundleQuantity.
 */
function calcBundleDiscount(promotion: any, cart: Cart): number {
  const ids: string[] = (prop(promotion, "productIds", []) as string[]).map(
    String,
  );
  if (ids.length === 0) return 0;
  const perProduct = Math.max(1, Number(prop(promotion, "bundleQuantity", 1)));
  const discountAmount = Number(prop(promotion, "discountAmount", 0));
  if (!Number.isFinite(discountAmount) || discountAmount <= 0) return 0;

  const quantityByProduct = new Map<string, number>();
  for (const item of cart.items) {
    quantityByProduct.set(
      item.productId,
      (quantityByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }
  for (const id of ids) {
    if ((quantityByProduct.get(id) ?? 0) < perProduct) return 0;
  }
  return Math.min(discountAmount, cart.subtotal);
}

function calculateDiscount(promotion: any, type: any, cart: Cart): number {
  const calcType = type?.calculationType;
  switch (calcType) {
    case "percentage":
      return calcPercentage(promotion, cart);
    case "fixed_amount":
      return calcFixedAmount(promotion, cart);
    case "buy_x_get_y":
      return calcBuyXGetY(promotion, cart);
    case "free_shipping":
      return calcFreeShipping(promotion, cart);
    case "bundle_discount":
      return calcBundleDiscount(promotion, cart);
    default:
      return 0;
  }
}

/** Short badge label used by the storefront. */
function labelFor(promotion: any, type: any): string {
  switch (type?.calculationType) {
    case "percentage": {
      const pct = Number(prop(promotion, "percentage", 0));
      return `${pct}% off`;
    }
    case "fixed_amount": {
      const amt = Number(prop(promotion, "amount", 0));
      return `${amt} off`;
    }
    case "buy_x_get_y": {
      const b = Number(prop(promotion, "buyQuantity", 0));
      const g = Number(prop(promotion, "getQuantity", 0));
      return `Buy ${b} get ${g}`;
    }
    case "free_shipping":
      return "Free shipping";
    case "bundle_discount":
      return "Bundle discount";
    default:
      return promotion.name;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Conflict resolution — sorts by priority, honours stackable and
// exclusiveWith, and stops at the first non-stackable winner.
// ─────────────────────────────────────────────────────────────────────

function resolveConflicts(candidates: ApplicablePromotion[]): {
  applied: ApplicablePromotion[];
  excluded: { _id: string; name: string; reason: string }[];
} {
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const applied: ApplicablePromotion[] = [];
  const excluded: { _id: string; name: string; reason: string }[] = [];
  const blockedBy = new Map<string, string>(); // id → reason

  for (const c of sorted) {
    if (blockedBy.has(c._id)) {
      excluded.push({
        _id: c._id,
        name: c.name,
        reason: blockedBy.get(c._id)!,
      });
      continue;
    }
    applied.push(c);
    // The winner only blocks others if it's not stackable or if it
    // explicitly lists exclusive partners.
    if (!c.stackable) {
      for (const other of sorted) {
        if (other._id !== c._id && !blockedBy.has(other._id)) {
          blockedBy.set(other._id, `Not stackable with ${c.name}`);
        }
      }
      break;
    }
  }

  return { applied, excluded };
}

// ─────────────────────────────────────────────────────────────────────
// Public server actions
// ─────────────────────────────────────────────────────────────────────

/**
 * Returns promotions the cart is eligible for, each with a computed discount.
 * Pass `codes` to include code-gated promotions; omit to see only auto-applied
 * ones.
 */
export async function getApplicablePromotions(
  cart: Cart,
  ctx: CustomerContext = {},
  codes: string[] = [],
): Promise<ApplicablePromotion[]> {
  await connection();
  const now = new Date();
  const upperCodes = codes.map((c) => c.trim().toUpperCase()).filter(Boolean);

  const query: any = {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { code: { $exists: false } },
      { code: null },
      { code: "" },
      ...(upperCodes.length > 0 ? [{ code: { $in: upperCodes } }] : []),
    ],
  };

  const promotions = await Promotion.find(query)
    .populate("promotionTypeId")
    .lean();

  const applicable: ApplicablePromotion[] = [];

  for (const p of promotions as any[]) {
    if (!isLive(p, now)) continue;
    if (!meetsEligibility(p, cart, ctx)) continue;

    const type = p.promotionTypeId;
    if (!type || type.isActive === false) continue;

    const discount = calculateDiscount(p, type, cart);
    if (discount <= 0) continue;

    const usage = await meetsUsageLimits(p._id.toString(), ctx);
    if (!usage.ok) continue;

    applicable.push({
      _id: p._id.toString(),
      name: p.name,
      description: p.description,
      code: p.code || undefined,
      icon: type.icon ?? null,
      priority: p.priority ?? 0,
      stackable: !!p.stackable,
      calculationType: type.calculationType,
      discount,
      label: labelFor(p, type),
      requiresCode: !!p.code,
    });
  }

  return applicable;
}

/**
 * Full discount preview for a cart. Applies conflict resolution and returns
 * the final total. Safe to call from a Server Component or a Client Component
 * form action — always recomputed server-side.
 *
 * `selectedIds` restricts to a subset (e.g. the user unchecked a promotion).
 * When omitted, all applicable promotions compete by priority/stacking.
 */
export async function previewCartDiscounts(
  cart: Cart,
  ctx: CustomerContext = {},
  codes: string[] = [],
  selectedIds?: string[],
): Promise<DiscountResult> {
  const candidates = await getApplicablePromotions(cart, ctx, codes);

  const filtered =
    selectedIds && selectedIds.length > 0
      ? candidates.filter((c) => selectedIds.includes(c._id))
      : candidates;

  const { applied, excluded } = resolveConflicts(filtered);

  // Shipping discounts reduce the total differently than item discounts,
  // so keep the two apart.
  const shippingDiscount = applied
    .filter((a) => a.calculationType === "free_shipping")
    .reduce((s, a) => s + a.discount, 0);
  const totalDiscount = applied.reduce((s, a) => s + a.discount, 0);

  const shipping = Number(cart.shippingCost ?? 0);
  const total = Math.max(0, cart.subtotal + shipping - totalDiscount);

  return { applied, excluded, totalDiscount, shippingDiscount, total };
}

/**
 * Validate a single customer-typed code against the cart.
 * Used by the "Apply code" input on the cart page — never trust the code
 * the client sends without this check.
 */
export async function validatePromotionCode(
  code: string,
  cart: Cart,
  ctx: CustomerContext = {},
): Promise<
  { ok: true; promotion: ApplicablePromotion } | { ok: false; reason: string }
> {
  await connection();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, reason: "Enter a code" };

  const now = new Date();
  const promotion = await Promotion.findOne({
    code: normalized,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .populate("promotionTypeId")
    .lean();

  if (!promotion) return { ok: false, reason: "Invalid or expired code" };

  const p: any = promotion;

  if (!meetsEligibility(p, cart, ctx)) {
    return {
      ok: false,
      reason: "This promotion is not available for your account",
    };
  }

  const type = p.promotionTypeId;
  if (!type || type.isActive === false) {
    return { ok: false, reason: "This promotion is no longer available" };
  }

  const discount = calculateDiscount(p, type, cart);
  if (discount <= 0) {
    return { ok: false, reason: "Your cart does not qualify for this code" };
  }

  const usage = await meetsUsageLimits(p._id.toString(), ctx);
  if (!usage.ok) return { ok: false, reason: usage.reason ?? "Not available" };

  return {
    ok: true,
    promotion: {
      _id: p._id.toString(),
      name: p.name,
      description: p.description,
      code: p.code,
      icon: type.icon ?? null,
      priority: p.priority ?? 0,
      stackable: !!p.stackable,
      calculationType: type.calculationType,
      discount,
      label: labelFor(p, type),
      requiresCode: true,
    },
  };
}

/**
 * Records that a set of promotions was redeemed on an order. Call this from
 * inside `createOrder` **after** the order document is saved, so that
 * `PromotionUsage.orderId` is real.
 *
 * Idempotent per (promotion, order) — a unique index on the model prevents
 * double-counting if the order flow is retried.
 */
export async function recordPromotionUsage(
  orderId: string,
  applied: { _id: string; discount: number; code?: string }[],
  customerId?: string | null,
): Promise<{ recorded: number }> {
  await connection();
  if (!isValidObjectId(orderId)) {
    throw new Error(`recordPromotionUsage: invalid order id ${orderId}`);
  }
  if (applied.length === 0) return { recorded: 0 };

  const docs = applied.map((a) => ({
    promotionId: a._id,
    orderId,
    customerId: customerId ?? null,
    discountAmount: Math.max(0, Number(a.discount) || 0),
    code: a.code,
  }));

  // ordered: false keeps the insert going even if one row hits the unique index.
  const result = await PromotionUsage.insertMany(docs, { ordered: false });
  return { recorded: result.length };
}
