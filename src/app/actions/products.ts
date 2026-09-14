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

export async function findProductByCategory(
  id: string | string[],
): Promise<any> {
  await connection();

  try {
    const rawIds = Array.isArray(id) ? id : [id];
    const ids = rawIds.map((v) => String(v ?? "")).filter(Boolean);

    if (ids.length === 0) {
      console.log("[findProductByCategory] no ids provided");
      return [];
    }

    const objectIds = ids
      .filter((v) => mongoose.Types.ObjectId.isValid(v))
      .map((v) => new mongoose.Types.ObjectId(v));

    // -------- Attempt 1: ObjectId match (normal case) --------
    let products: any[] = await Product.find({
      categoryId: { $in: objectIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log("[findProductByCategory] objectId query", {
      requested: ids,
      objectIds: objectIds.map(String),
      matched: products.length,
    });

    // -------- Attempt 2: string-stored categoryId --------
    if (products.length === 0) {
      products = await Product.find({
        categoryId: { $in: ids as any },
      })
        .sort({ createdAt: -1 })
        .lean();

      console.log("[findProductByCategory] string query", {
        matched: products.length,
      });
    }

    // -------- Attempt 3: raw collection (bypass Mongoose casting) --------
    if (products.length === 0) {
      const raw = await Product.collection
        .find({ categoryId: { $in: ids } })
        .limit(200)
        .toArray();
      products = raw as any[];

      console.log("[findProductByCategory] raw collection query", {
        matched: products.length,
      });
    }

    // -------- Diagnostics: what DOES exist in the DB? --------
    if (products.length === 0) {
      const totalProducts = await Product.estimatedDocumentCount();
      const sample = await Product.find({}, "categoryId name").limit(5).lean();

      // Show how many products reference each of the requested ids
      const foundIds = new Set<string>();
      const allCategoryRefs = await Product.distinct("categoryId");
      for (const ref of allCategoryRefs) {
        foundIds.add(String(ref));
      }

      console.log("[findProductByCategory] DIAGNOSTICS", {
        totalProducts,
        requested: ids,
        requestedAreValidObjectIds: ids.map((v) =>
          mongoose.Types.ObjectId.isValid(v),
        ),
        sampleOfProductsInDb: sample.map((p: any) => ({
          name: p.name,
          categoryId: String(p.categoryId),
        })),
        sampleOfCategoryIdsInDb: Array.from(foundIds).slice(0, 10),
        requestedIdsPresentInDb: ids.filter((v) => foundIds.has(v)),
      });
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
      const product = await Product.findById(id).lean().exec();
      if (!product) return { success: false, error: "Product not found" };

      let brand: any = null;
      if (product.brand) {
        try {
          const b: any = await Brand.findById(product.brand)
            .select("name")
            .lean()
            .exec();
          if (b) brand = { _id: b._id.toString(), name: b.name };
        } catch {
          /* ignore */
        }
      }

      let category: any = null;
      if (product.categoryId) {
        try {
          const c: any = await Category.findById(product.categoryId)
            .select("name")
            .lean()
            .exec();
          if (c) category = { _id: c._id.toString(), name: c.name };
        } catch {
          /* ignore */
        }
      }

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
        brand,
        categoryId: category,
        relatedProducts,
      });
    }

    // List
    const products = await Product.find().sort({ createdAt: -1 }).lean().exec();
    if (!products || products.length === 0) return [];

    const results = await Promise.all(
      products.map(async (p) => {
        let brand: any = null;
        let category: any = null;

        if (p.brand) {
          try {
            const b: any = await Brand.findById(p.brand)
              .select("name")
              .lean()
              .exec();
            if (b) brand = { _id: b._id.toString(), name: b.name };
          } catch {
            /* ignore */
          }
        }
        if (p.categoryId) {
          try {
            const c: any = await Category.findById(p.categoryId)
              .select("name")
              .lean()
              .exec();
            if (c) category = { _id: c._id.toString(), name: c.name };
          } catch {
            /* ignore */
          }
        }

        return toPlain({
          ...p,
          _id: p._id.toString(),
          brand,
          categoryId: category,
        });
      }),
    );

    return results;
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
  await connection();
  await Product.findByIdAndDelete(id);
}
