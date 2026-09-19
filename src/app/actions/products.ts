// app/actions/products.ts (storefront)
"use server";

import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import Product from "@/models/Product";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import "@/models/User";
import "@/models/Attribute";

function toPlain(value: any): any {
  if (value === null || value === undefined) return value;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toHexString === "function") return value.toHexString();
  if (value._bsontype === "ObjectId") return String(value);
  if (Buffer.isBuffer?.(value)) return value.toString("hex");
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

/** Convert a populated ref (doc or id) into `{ _id, name } | null`. */
function toRef(value: any): { _id: string; name: string } | null {
  if (!value) return null;
  if (typeof value === "object" && value.name !== undefined) {
    return { _id: String(value._id ?? ""), name: String(value.name ?? "") };
  }
  return null;
}

export async function findProductByCategory(
  id: string | string[],
): Promise<any> {
  await connection();

  try {
    const rawIds = Array.isArray(id) ? id : [id];
    const ids = rawIds.map((v) => String(v ?? "")).filter(Boolean);

    if (ids.length === 0) return [];

    const objectIds = ids
      .filter((v) => mongoose.Types.ObjectId.isValid(v))
      .map((v) => new mongoose.Types.ObjectId(v));

    let products: any[] = await Product.find({
      categoryId: { $in: objectIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (products.length === 0) {
      products = await Product.find({
        categoryId: { $in: ids as any },
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    if (products.length === 0) {
      const raw = await Product.collection
        .find({ categoryId: { $in: ids } })
        .limit(200)
        .toArray();
      products = raw as any[];
    }

    return toPlain(products);
  } catch (error: any) {
    console.error("[findProductByCategory] THREW:", error);
    return {
      error: error?.message || "Failed to fetch products by category",
    };
  }
}

export async function findProducts(id?: string): Promise<any> {
  try {
    await connection();

    if (id) {
      // Single product — populate refs in one round-trip.
      const product: any = await Product.findById(id)
        .populate("brand", "name")
        .populate("categoryId", "name")
        .lean()
        .exec();

      if (!product) return { success: false, error: "Product not found" };

      // Related products — one batched lookup instead of N.
      let relatedProducts: any[] = [];
      if (
        Array.isArray(product.relatedProducts) &&
        product.relatedProducts.length > 0
      ) {
        const ids = product.relatedProducts
          .map((rp: any) => rp.product)
          .filter(
            (rid: any) =>
              rid && mongoose.Types.ObjectId.isValid(rid.toString()),
          );

        if (ids.length > 0) {
          try {
            const relatedDocs = await Product.find({ _id: { $in: ids } })
              .select("name price images slug")
              .lean()
              .exec();

            const docMap = new Map(
              relatedDocs.map((d) => [d._id.toString(), d]),
            );

            relatedProducts = product.relatedProducts
              .map((rp: any) => {
                const doc = rp.product
                  ? docMap.get(rp.product.toString())
                  : null;
                return {
                  product: doc
                    ? {
                        _id: doc._id.toString(),
                        name: doc.name,
                        price: doc.price,
                        image: doc.images?.[0] || "",
                        slug: doc.slug,
                      }
                    : null,
                  relationshipType: rp.relationshipType || "",
                };
              })
              .filter((rp: any) => rp.product !== null);
          } catch (e) {
            console.warn("Failed to populate related products:", e);
          }
        }
      }

      return toPlain({
        ...product,
        _id: product._id.toString(),
        brand: toRef(product.brand),
        categoryId: toRef(product.categoryId),
        relatedProducts,
      });
    }

    // List — same pattern, populate inline instead of per-row queries.
    const products: any[] = await Product.find()
      .sort({ createdAt: -1 })
      .populate("brand", "name")
      .populate("categoryId", "name")
      .lean()
      .exec();

    if (!products || products.length === 0) return [];

    return products.map((p) =>
      toPlain({
        ...p,
        _id: p._id.toString(),
        brand: toRef(p.brand),
        categoryId: toRef(p.categoryId),
      }),
    );
  } catch (error: any) {
    console.error("[findProducts] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch products",
    };
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
  try {
    await connection();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid product id" };
    }
    const removed = await Product.findByIdAndDelete(id);
    if (!removed) return { success: false, error: "Product not found" };
    return { success: true };
  } catch (e: any) {
    console.error("[deleteProduct] Error:", e);
    return {
      success: false,
      error: e?.message || "Failed to delete product",
    };
  }
}
