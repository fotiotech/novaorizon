"use server";

import { connection } from "@/utils/connection";
import slugify from "slugify";
import Product from "@/models/Product";
import "@/models/User";
import "@/models/Brand";
import "@/models/Category";
import "@/models/Attribute";
import mongoose from "mongoose";

function normalizeProductDocument<T = any>(product: T): T {
  if (!product || typeof product !== "object") return product;

  const normalized = { ...((product as any) ?? {}) };

  normalized.category_id ??= normalized.categoryId ?? null;
  normalized.categoryId ??= normalized.category_id ?? null;
  normalized.main_image ??= normalized.mainImage ?? "";
  normalized.mainImage ??= normalized.main_image ?? "";
  normalized.list_price ??= normalized.listPrice ?? 0;
  normalized.listPrice ??= normalized.list_price ?? 0;
  normalized.sale_price ??= normalized.salePrice ?? normalized.listPrice ?? 0;
  normalized.salePrice ??= normalized.sale_price ?? normalized.listPrice ?? 0;
  normalized.related_products ??= normalized.relatedProducts ?? [];
  normalized.relatedProducts ??= normalized.related_products ?? [];
  normalized.short_description ??= normalized.shortDescription ?? "";
  normalized.shortDescription ??= normalized.short_description ?? "";
  normalized.low_stock_threshold ??= normalized.lowStockThreshold ?? 0;
  normalized.lowStockThreshold ??= normalized.low_stock_threshold ?? 0;
  normalized.stock_status ??= normalized.stockStatus ?? [];
  normalized.stockStatus ??= normalized.stock_status ?? [];

  return normalized as T;
}

function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (
    obj instanceof mongoose.Types.ObjectId ||
    obj._bsontype === "ObjectId" ||
    typeof obj.toHexString === "function"
  ) {
    return obj.toString();
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serialize);
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serialize(obj[key]);
    }
    return result;
  }

  return obj;
}

export async function findProductByCategory(id: string) {
  await connection();
  try {
    const products = await Product.find({ categoryId: id }).lean();
    return serialize(products.map(normalizeProductDocument));
  } catch (error) {
    console.log(error);
    return { error: "Failed to fetch products by category" };
  }
}

export async function findProducts(id?: string) {
  try {
    await connection();

    if (id) {
      const product = await Product.findById(id)
        .populate("brand", "name")
        .populate("categoryId", "name")
        .populate({
          path: "relatedProducts.ids",
          select: "name price mainImage slug",
        })
        .lean()
        .exec();

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      return serialize(normalizeProductDocument(product));
    }

    const products = await Product.find()
      .populate("brand", "name")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!products) {
      console.error("No products found");
      return [];
    }

    return serialize(products.map(normalizeProductDocument));
  } catch (error) {
    console.error("Error finding products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function findProductsForSitemap() {
  await connection();
  const products = await Product.find({}, "slug updatedAt").exec();
  return products.map((p) => ({
    url_slug: p.slug,
    dsin: p.sku,
    updated_at: p.updatedAt.toISOString(),
  }));
}

export async function deleteProduct(id: string) {
  await connection();
  await Product.findByIdAndDelete(id);
}
