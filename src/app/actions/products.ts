"use server";

import { connection } from "@/utils/connection";
import slugify from "slugify";
import Product from "@/models/Product";
import "@/models/User";
import "@/models/Brand";
import { Collection } from "@/models/Collection";
import "@/models/Category";
import "@/models/Attribute";

export async function getCollectionsWithProducts() {
  try {
    await connection();
    const collections = await Collection.find({ status: "active" })
      .sort({ created_at: -1 })
      .lean();

    const results = [];

    for (const collection of collections) {
      const query: Record<string, any> = {};

      for (const rule of collection.rules) {
        const attributePath = rule.attribute; // e.g., "pricing_availability.price"

        // Safely apply rule to query using dot notation
        if (!query[attributePath]) {
          query[attributePath] = {};
        }
        query[attributePath][rule.operator] = rule.value;
      }

      const matchingProducts = await Product.find(query)
        .sort({ created_at: -1 })
        .populate("category_id", "categoryName url_slug imageUrl")
        .lean();

      results.push({
        collection: {
          _id: collection._id,
          name: collection.name,
          description: collection.description,
          display: collection.display,
          category: collection.category_id,
          created_at: collection.created_at,
          updated_at: collection.updated_at,
        },
        products: matchingProducts,
      });
    }

    console.log(results);

    return { success: true, data: results };
  } catch (error) {
    console.error("Error fetching collections with products:", error);
    return {
      success: false,
      error: "Failed to fetch collections with products",
    };
  }
}

export async function findProducts(id?: string) {
  try {
    await connection();

    if (id) {
      const product: any = await Product.findById(id)
        .populate("brand", "name") // Populate brand name
        .populate("category_id", "name") // Populate category name
        .populate({
          path: "related_products.ids",
          select: "name price image slug", // Select fields for related products
        })
        .lean()
        .exec();

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      // Convert MongoDB ObjectIds to strings for the main product
      const result = {
        ...product,
        _id: product._id?.toString(),
        category_id:
          product.category_id?._id?.toString() ||
          product.category_id?.toString(),
        brand: product.brand?._id?.toString() || product.brand?.toString(),
      };

      // If related products exist, convert their IDs to strings
      if (result.related_products?.ids) {
        result.related_products.ids = result.related_products.ids.map(
          (relatedProduct: any) => ({
            ...relatedProduct,
            _id: relatedProduct._id?.toString(),
            category_id: relatedProduct.category_id?.toString(),
          })
        );
      }

      console.log({ result });

      return result;
    }

    const products = await Product.find()
      .populate("brand", "name")
      .populate("category_id", "name")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!products) {
      console.error("No products found");
    }

    return products.map((product: any) => ({
      ...product,
      _id: product._id?.toString(),
      category_id:
        product.category_id?._id?.toString() || product.category_id?.toString(),
      brand: product.brand?._id?.toString() || product.brand?.toString(),
    }));
  } catch (error) {
    console.error("Error finding products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

// app/actions/products.ts

// A “light” version just to pull URL slugs & updated dates, no populates:
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
