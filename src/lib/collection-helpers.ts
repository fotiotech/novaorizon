// src/lib/collection-helpers.ts
import mongoose from "mongoose";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Promotion from "@/models/Promotion";
import Page from "@/models/Page";
import { Collection } from "@/models/Collection";

// ---------- Helper: get model by targetType ----------
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

// ---------- Helper: parse rule value ----------
export function parseRuleValue(value: any, operator: string) {
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

// ---------- Build query from rules (only for Product & Collection) ----------
export function buildQueryFromRules(rules: any[], targetType: string) {
  if (!["Product", "Collection"].includes(targetType)) return {};
  if (!rules || rules.length === 0) return {};

  const query: any = { $and: [] };

  for (const rule of rules) {
    if (!rule.attribute || !rule.operator) continue;
    const value = parseRuleValue(rule.value, rule.operator);

    if (targetType === "Product" && rule.attribute === "category_id") {
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
    } else {
      query.$and.push({
        [rule.attribute]: { [rule.operator]: value },
      });
    }
  }

  return query.$and.length > 0 ? query : {};
}
