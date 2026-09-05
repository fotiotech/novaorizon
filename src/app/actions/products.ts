// app/actions/products.ts
"use server";

import { connection } from "@/utils/connection";
import slugify from "slugify";
import mongoose from "mongoose";
import Product from "@/models/Product";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import "@/models/User";
import "@/models/Attribute";

// ---------- Helper: flatten keyFeatures and specifications ----------
function flattenProductForDisplay(product: any): any {
  if (!product) return product;
  const flat = { ...product };

  // Flatten keyFeatures: { k, v } -> flat[k] = v
  if (Array.isArray(flat.keyFeatures)) {
    for (const item of flat.keyFeatures) {
      if (item.k && item.v !== undefined) {
        flat[item.k] = item.v;
      }
    }
  }

  // Flatten specifications recursively
  if (Array.isArray(flat.specifications)) {
    const flattenSpecs = (specs: any[]) => {
      for (const group of specs) {
        if (Array.isArray(group.attributes)) {
          for (const attr of group.attributes) {
            if (attr.k && attr.v !== undefined) {
              flat[attr.k] = attr.v;
            }
          }
        }
        if (Array.isArray(group.groups)) {
          flattenSpecs(group.groups);
        }
      }
    };
    flattenSpecs(flat.specifications);
  }

  return flat;
}

// ---------- Server Actions ----------
export async function findProductByCategory(id: string): Promise<any> {
  await connection();
  try {
    const products = await Product.find({ categoryId: id }).lean();
    return products;
  } catch (error) {
    console.error("findProductByCategory error:", error);
    return { error: "Failed to fetch products by category" };
  }
}

export async function findProducts(id?: string): Promise<any> {
  try {
    await connection();
    console.log("[findProducts] Called with id:", id);

    if (id) {
      // Fetch the base product
      const product = await Product.findById(id).lean().exec();
      if (!product) {
        console.log("[findProducts] Product not found for id:", id);
        return { success: false, error: "Product not found" };
      }

      // Manually populate brand with error handling
      let brand: any = null;
      if (product.brand) {
        try {
          brand = await Brand.findById(product.brand)
            .select("name")
            .lean()
            .exec();
          if (brand) {
            brand = { _id: brand._id.toString(), name: brand.name };
          }
        } catch (e) {
          console.warn(
            `[findProducts] Invalid brand ID ${product.brand} for product ${product._id}`,
          );
        }
      }

      // Manually populate category with error handling
      let category: any = null;
      if (product.categoryId) {
        try {
          category = await Category.findById(product.categoryId)
            .select("name")
            .lean()
            .exec();
          if (category) {
            category = { _id: category._id.toString(), name: category.name };
          }
        } catch (e) {
          console.warn(
            `[findProducts] Invalid category ID ${product.categoryId} for product ${product._id}`,
          );
        }
      }

      // Manually populate related products
      let relatedProducts: any[] = [];
      if (
        Array.isArray(product.relatedProducts) &&
        product.relatedProducts.length > 0
      ) {
        const ids = product.relatedProducts
          .map((rp: any) => rp.product)
          .filter(
            (id: any) => id && mongoose.Types.ObjectId.isValid(id.toString()),
          );
        if (ids.length > 0) {
          try {
            const relatedDocs = await Product.find({ _id: { $in: ids } })
              .select("name price mainImage slug")
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
                  ...rp,
                  product: doc
                    ? {
                        _id: doc._id.toString(),
                        name: doc.name,
                        price: doc.price,
                        image: doc.images?.[0] || "",
                        slug: doc.slug,
                      }
                    : null,
                };
              })
              .filter((rp: any) => rp.product !== null);
          } catch (e) {
            console.warn(
              "[findProducts] Failed to populate related products:",
              e,
            );
          }
        }
      }

      // Assemble the final product object
      const result = {
        ...product,
        _id: product._id.toString(),
        brand,
        categoryId: category,
        relatedProducts,
      };

      const flattened = flattenProductForDisplay(result);
      console.log("[findProducts] Product found and flattened:", flattened._id);
      return flattened;
    }

    // List all products
    const products = await Product.find().sort({ createdAt: -1 }).lean().exec();
    if (!products || products.length === 0) {
      console.log("[findProducts] No products found");
      return [];
    }

    // Manually populate brand and category for each product, handling errors
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
          } catch (e) {
            // ignore invalid brand
          }
        }
        if (p.categoryId) {
          try {
            const c: any = await Category.findById(p.categoryId)
              .select("name")
              .lean()
              .exec();
            if (c) category = { _id: c._id.toString(), name: c.name };
          } catch (e) {
            // ignore invalid category
          }
        }

        return {
          ...p,
          _id: p._id.toString(),
          brand,
          categoryId: category,
        };
      }),
    );

    const flattened = results.map(flattenProductForDisplay);
    console.log(`[findProducts] Found ${flattened.length} products`);
    return flattened;
  } catch (error: any) {
    console.error("[findProducts] Error:", error);
    console.error(error.stack);
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
