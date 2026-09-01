"use server";

import { connection } from "@/utils/connection";
import slugify from "slugify";
import Product from "@/models/Product";
import "@/models/User";
import "@/models/Brand";
import "@/models/Category";
import "@/models/Attribute";
import mongoose from "mongoose";

// ---------- Helper: Deep Serialize (same as in category.ts) ----------
function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Handle Mongoose ObjectId
  if (
    obj instanceof mongoose.Types.ObjectId ||
    obj._bsontype === "ObjectId" ||
    typeof obj.toHexString === "function"
  ) {
    return obj.toString();
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serialize);
  }

  // Handle plain objects
  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serialize(obj[key]);
    }
    return result;
  }

  // Primitives
  return obj;
}

// ---------- Server Actions ----------

export async function findProductByCategory(id: string) {
  await connection();
  try {
    const products = await Product.find({ categoryId: id }).lean();
    return serialize(products);
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
          path: "related_products.ids",
          select: "name price image slug",
        })
        .lean()
        .exec();

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      // Fully serialize the product (handles all nested ObjectIds)
      return serialize(product);
    }

    const products = await Product.find()
      .populate("brand", "name")
      .populate("category_id", "name")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!products) {
      console.error("No products found");
      return [];
    }

    return serialize(products);
  } catch (error) {
    console.error("Error finding products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

// A "light" version just to pull URL slugs & updated dates, no populates.
export async function findProductsForSitemap() {
  await connection();
  const products = await Product.find({}, "url_slug dsin updatedAt").exec();
  return products.map((p) => ({
    url_slug: p.url_slug,
    dsin: p.dsin,
    updated_at: p.updatedAt.toISOString(),
  }));
}

export async function deleteProduct(id: string) {
  await connection();
  await Product.findByIdAndDelete(id);
}
