// src/lib/collection-helpers.ts
//
// Shared helpers for resolving collections into normalized items.
// Used by:
//   - app/actions/collection.ts                (admin list + create/update)
//   - app/actions/menu.ts                      (public menu renderer)
//   - app/collections/[slug]/[id]/page.tsx     (public detail page)
//   - app/collections/page.tsx                 (public list)
//
// Consolidating these here removes the diverging copies of the normalizer
// and rule builder that previously caused image / price / category bugs.

import mongoose from "mongoose";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Promotion from "@/models/Promotion";
import Page from "@/models/Page";
import { Collection } from "@/models/Collection";

// ------------------------------------------------------------------
// Model resolution
// ------------------------------------------------------------------

export function getModelForTargetType(targetType: string) {
  switch (targetType) {
    case "Product":
      return Product;
    case "Category":
      return Category;
    case "Brand":
      return Brand;
    case "Promotion":
      return Promotion;
    case "Page":
      return Page;
    case "Collection":
      return Collection;
    default:
      return null;
  }
}

// ------------------------------------------------------------------
// Menu location constants (single source of truth)
// ------------------------------------------------------------------

export const MENU_LOCATIONS = {
  BANNER: "Banner",
  NAVBAR: "NavBar",
  SIDEBAR: "SideBar",
  HOME: "Home",
  SECTION: "Section",
  FOOTER: "Footer",
  PRODUCT_RELATED: "ProductRelated",
} as const;

export type MenuLocation = (typeof MENU_LOCATIONS)[keyof typeof MENU_LOCATIONS];

export const MENU_LOCATION_VALUES = Object.values(MENU_LOCATIONS);

// ------------------------------------------------------------------
// Rule value parsing
// ------------------------------------------------------------------

/**
 * Coerce a rule value string into the type the operator expects.
 *
 * - `$in` / `$nin` → array (JSON, comma-separated, or single value)
 * - `$lt` / `$lte` / `$gt` / `$gte` → number when numeric
 * - `"true"` / `"false"` → boolean
 * - otherwise → raw string
 */
export function parseRuleValue(value: any, operator: string): any {
  if (operator === "$in" || operator === "$nin") {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (value.includes(",")) {
          return value.split(",").map((item: string) => item.trim());
        }
        return [value];
      } catch {
        if (value.includes(",")) {
          return value.split(",").map((item: string) => item.trim());
        }
        return [value];
      }
    }
    return [value];
  }

  if (["$lt", "$lte", "$gt", "$gte"].includes(operator)) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

// ------------------------------------------------------------------
// Rule → Mongo query
// ------------------------------------------------------------------

/**
 * Build a Mongo query from collection rules.
 * Only Product and Collection targets support rule-based collections.
 */
export function buildQueryFromRules(rules: any[], targetType: string): any {
  if (!["Product", "Collection"].includes(targetType)) return {};
  if (!rules || rules.length === 0) return {};

  const query: any = { $and: [] };

  for (const rule of rules) {
    if (!rule.attribute || !rule.operator) continue;
    const value = parseRuleValue(rule.value, rule.operator);

    // The RuleEditor exposes the Product category field as `categoryId`
    // (camelCase), so cast to ObjectId here rather than relying on
    // Mongoose's implicit casting (which is not guaranteed to run for
    // every operator / value shape).
    if (targetType === "Product" && rule.attribute === "categoryId") {
      if (Array.isArray(value)) {
        const objectIds = value
          .filter((v) => mongoose.Types.ObjectId.isValid(v))
          .map((v) => new mongoose.Types.ObjectId(v));
        if (objectIds.length) {
          query.$and.push({
            [rule.attribute]: { [rule.operator]: objectIds },
          });
        }
      } else if (mongoose.Types.ObjectId.isValid(value)) {
        query.$and.push({
          [rule.attribute]: new mongoose.Types.ObjectId(value),
        });
      }
      continue;
    }

    query.$and.push({
      [rule.attribute]: { [rule.operator]: value },
    });
  }

  return query.$and.length > 0 ? query : {};
}

// ------------------------------------------------------------------
// Item normalization
// ------------------------------------------------------------------

/**
 * Shape that every collection/menu item is normalized to before it
 * reaches the frontend. Consumed by:
 *   - MenuRenderer (List/Grid/Carousel/Dropdown/MegaMenu)
 *   - Collection detail page (app/collections/[slug]/[id])
 *   - getCollectionsWithProducts (admin list)
 */
export interface NormalizedItem {
  _id: string;
  name: string;
  image: string | null;
  price: number | null;
  listPrice: number | null;
  contentType: string;
}

/**
 * Normalize any target-type document (Product, Category, Brand,
 * Promotion, Page, Collection) to the shape the frontend consumes.
 *
 * Field mappings:
 *   - Product:    images[0] → image, price → price, listPrice → listPrice
 *   - Collection: imageUrl  → image
 *   - Others:     image || imageUrl || backgroundImage → image
 */
export function normalizeItem(item: any, targetType: string): NormalizedItem {
  if (!item) {
    return {
      _id: "",
      name: "Unnamed",
      image: null,
      price: null,
      listPrice: null,
      contentType: targetType,
    };
  }

  const name = item.name || item.title || "Unnamed";

  let image: string | null = null;
  let price: number | null = null;
  let listPrice: number | null = null;

  if (targetType === "Product") {
    // Product schema: `images: string[]`
    if (Array.isArray(item.images)) {
      image = item.images[0] ?? null;
    } else {
      // Legacy / defensive fallbacks
      image = item.mainImage || item.image || item.imageUrl || null;
    }
    // Product schema: `price` and `listPrice`
    price = item.price ?? item.salePrice ?? item.sale_price ?? null;
    listPrice = item.listPrice ?? null;
  } else if (targetType === "Collection") {
    image = item.imageUrl || item.image || null;
  } else {
    // Category, Brand, Promotion, Page
    image = item.image || item.imageUrl || item.backgroundImage || null;
  }

  return {
    _id: item._id?.toString() ?? "",
    name,
    image,
    price,
    listPrice,
    contentType: targetType,
  };
}

/**
 * Convenience wrapper for normalizing Product documents specifically.
 */
export function normalizeProductItem(item: any): NormalizedItem {
  return normalizeItem(item, "Product");
}

// ------------------------------------------------------------------
// Route helpers
// ------------------------------------------------------------------

const ROUTE_PREFIX: Record<string, string> = {
  Product: "products",
  Category: "categories",
  Brand: "brands",
  Collection: "collections",
  Promotion: "promotions",
  Page: "pages",
};

export function getRoutePrefix(targetType: string): string {
  return ROUTE_PREFIX[targetType] || "item";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build the public URL for a normalized item.
 * Falls back to `/<prefix>/<id>` if the slug is empty.
 */
export function getItemHref(item: NormalizedItem): string {
  const prefix = getRoutePrefix(item.contentType);
  const slug = slugify(item.name || "");
  return slug ? `/${prefix}/${slug}/${item._id}` : `/${prefix}/${item._id}`;
}
