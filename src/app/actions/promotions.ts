// app/actions/storefront/promotions.ts
"use server";

import { connection } from "@/utils/connection";
import Promotion from "@/models/Promotion";
import PromotionUsage from "@/models/PromotionUsage";
import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId?: string;
  categoryIds?: string[];
  brandId?: string;
  quantity: number;
  /** Price per unit, in the smallest currency unit (e.g. CFA). */
  unitPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shippingCost?: number;
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
  discount: number;
  label: string;
  requiresCode: boolean;
}

export interface DiscountResult {
  applied: ApplicablePromotion[];
  excluded: { _id: string; name: string; reason: string }[];
  totalDiscount: number;
  shippingDiscount: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Reads a key from a promotion's `propertyValues`. Handles both Map and
 *  plain-object shapes — lean() output differs by Mongoose version. */
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

function isLive(promotion: any, now: Date): boolean {
  if (!promotion.startDate || !promotion.endDate) return false;
  return (
    now >= new Date(promotion.startDate) && now <= new Date(promotion.endDate)
  );
}

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
  const groups = ctx.customerGroupIds ?? [];
  return groups.some((g) => allowed.includes(g));
}

// ─────────────────────────────────────────────────────────────────────
// Discount calculators
// ─────────────────────────────────────────────────────────────────────

function calcPercentage(promotion: any, cart: Cart): number {
  const pct = Number(prop(promotion, "percentage", 0));
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  const maxRaw = prop(promotion, "maxDiscount", null);
  const max = maxRaw == null || maxRaw === "" ? Infinity : Number(maxRaw);
  const raw = Math.round(cart.subtotal * (pct / 100));
  return Math.max(0, Math.min(raw, max, cart.subtotal));
}

function calcFixedAmount(promotion: any, cart: Cart): number {
  const amount = Number(prop(promotion, "amount", 0));
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(amount, cart.subtotal);
}

function calcBuyXGetY(promotion: any, cart: Cart): number {
  const buyQty = Math.max(1, Number(prop(promotion, "buyQuantity", 1)));
  const getQty = Math.max(1, Number(prop(promotion, "getQuantity", 1)));
  const buyIds: string[] = (prop(promotion, "buyProductIds", []) as any[]).map(
    String,
  );
  const getIds: string[] = (prop(promotion, "getProductIds", []) as any[]).map(
    String,
  );

  const buyPool = cart.items.filter(
    (i) => buyIds.length === 0 || buyIds.includes(i.productId),
  );
  const getPool = cart.items
    .filter((i) => getIds.length === 0 || getIds.includes(i.productId))
    .slice()
    .sort((a, b) => a.unitPrice - b.unitPrice);

  const buyCount = buyPool.reduce((n, i) => n + i.quantity, 0);
  const maxSets = Math.floor(buyCount / buyQty);
  if (maxSets <= 0 || getPool.length === 0) return 0;

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
  const cap = capRaw == null || capRaw === "" ? Infinity : Number(capRaw);
  return Math.max(0, Math.min(shipping, cap));
}

function calcBundleDiscount(promotion: any, cart: Cart): number {
  const ids: string[] = (prop(promotion, "productIds", []) as any[]).map(
    String,
  );
  if (ids.length === 0) return 0;
  const perProduct = Math.max(1, Number(prop(promotion, "bundleQuantity", 1)));
  const discountAmount = Number(prop(promotion, "discountAmount", 0));
  if (!Number.isFinite(discountAmount) || discountAmount <= 0) return 0;

  const qtyByProduct = new Map<string, number>();
  for (const item of cart.items) {
    qtyByProduct.set(
      item.productId,
      (qtyByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }
  for (const id of ids) {
    if ((qtyByProduct.get(id) ?? 0) < perProduct) return 0;
  }
  return Math.min(discountAmount, cart.subtotal);
}

function calculateDiscount(promotion: any, cart: Cart): number {
  const calcType = promotion?.promotionType?.calculationType;
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

function labelFor(promotion: any): string {
  const calcType = promotion?.promotionType?.calculationType;
  switch (calcType) {
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
// Batched usage-limit check
// ─────────────────────────────────────────────────────────────────────

interface UsageLimitsInfo {
  totalUses: number | null;
  perCustomer: number | null;
}

async function fetchUsageLimitsByPromotion(
  promotionIds: string[],
  customerId?: string | null,
): Promise<Map<string, { total: number; perCustomer: number }>> {
  if (promotionIds.length === 0) return new Map();

  const oids = promotionIds.map((id) => new mongoose.Types.ObjectId(id));

  const totalPipeline: any[] = [
    { $match: { promotionId: { $in: oids } } },
    { $group: { _id: "$promotionId", count: { $sum: 1 } } },
  ];

  const [totals, mine] = await Promise.all([
    PromotionUsage.aggregate(totalPipeline),
    customerId && isValidObjectId(customerId)
      ? PromotionUsage.aggregate([
          {
            $match: {
              promotionId: { $in: oids },
              customerId: new mongoose.Types.ObjectId(customerId),
            },
          },
          { $group: { _id: "$promotionId", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
  ]);

  const totalsMap = new Map<string, { total: number; perCustomer: number }>();
  for (const id of promotionIds) {
    totalsMap.set(id, { total: 0, perCustomer: 0 });
  }
  for (const row of totals) {
    const entry = totalsMap.get(String(row._id));
    if (entry) entry.total = row.count;
  }
  for (const row of mine) {
    const entry = totalsMap.get(String(row._id));
    if (entry) entry.perCustomer = row.count;
  }
  return totalsMap;
}

function passesUsageLimits(
  promotion: any,
  usage: { total: number; perCustomer: number } | undefined,
): boolean {
  if (!usage) return true;
  const { totalUses, perCustomer } = promotion.usageLimits ?? {};
  if (totalUses != null && usage.total >= totalUses) return false;
  if (perCustomer != null && usage.perCustomer >= perCustomer) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────
// Conflict resolution
// ─────────────────────────────────────────────────────────────────────

function resolveConflicts(candidates: ApplicablePromotion[]): {
  applied: ApplicablePromotion[];
  excluded: { _id: string; name: string; reason: string }[];
} {
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const applied: ApplicablePromotion[] = [];
  const excluded: { _id: string; name: string; reason: string }[] = [];
  const blockedBy = new Map<string, string>();

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
// Public actions
// ─────────────────────────────────────────────────────────────────────

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

  const promotions = await Promotion.find(query).lean();

  const candidates: ApplicablePromotion[] = [];
  const eligibleIds: string[] = [];

  for (const p of promotions as any[]) {
    if (!isLive(p, now)) continue;
    if (p.promotionType?.isActive === false) continue;
    if (!meetsEligibility(p, cart, ctx)) continue;

    const discount = calculateDiscount(p, cart);
    if (discount <= 0) continue;

    candidates.push({
      _id: p._id.toString(),
      name: p.name,
      description: p.description,
      code: p.code || undefined,
      icon: p.promotionType?.icon ?? null,
      priority: p.priority ?? 0,
      stackable: !!p.stackable,
      calculationType: p.promotionType?.calculationType,
      discount,
      label: labelFor(p),
      requiresCode: !!p.code,
    });
    eligibleIds.push(p._id.toString());
  }

  // Batch usage check.
  const usageMap = await fetchUsageLimitsByPromotion(
    eligibleIds,
    ctx.customerId,
  );

  return candidates.filter((c) =>
    passesUsageLimits(
      {
        usageLimits: (promotions as any[]).find(
          (p) => p._id.toString() === c._id,
        )?.usageLimits,
      },
      usageMap.get(c._id),
    ),
  );
}

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

  const shippingDiscount = applied
    .filter((a) => a.calculationType === "free_shipping")
    .reduce((s, a) => s + a.discount, 0);
  const totalDiscount = applied.reduce((s, a) => s + a.discount, 0);

  const shipping = Number(cart.shippingCost ?? 0);
  const total = Math.max(0, cart.subtotal + shipping - totalDiscount);

  return { applied, excluded, totalDiscount, shippingDiscount, total };
}

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
  const promotion: any = await Promotion.findOne({
    code: normalized,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();

  if (!promotion) return { ok: false, reason: "Invalid or expired code" };

  if (promotion.promotionType?.isActive === false) {
    return { ok: false, reason: "This promotion is no longer available" };
  }

  if (!meetsEligibility(promotion, cart, ctx)) {
    return {
      ok: false,
      reason: "This promotion is not available for your account",
    };
  }

  const discount = calculateDiscount(promotion, cart);
  if (discount <= 0) {
    return { ok: false, reason: "Your cart does not qualify for this code" };
  }

  const usageMap = await fetchUsageLimitsByPromotion(
    [promotion._id.toString()],
    ctx.customerId,
  );
  if (!passesUsageLimits(promotion, usageMap.get(promotion._id.toString()))) {
    return { ok: false, reason: "This code has already been used" };
  }

  return {
    ok: true,
    promotion: {
      _id: promotion._id.toString(),
      name: promotion.name,
      description: promotion.description,
      code: promotion.code,
      icon: promotion.promotionType?.icon ?? null,
      priority: promotion.priority ?? 0,
      stackable: !!promotion.stackable,
      calculationType: promotion.promotionType?.calculationType,
      discount,
      label: labelFor(promotion),
      requiresCode: true,
    },
  };
}

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

  const result = await PromotionUsage.insertMany(docs, { ordered: false });
  return { recorded: result.length };
}
