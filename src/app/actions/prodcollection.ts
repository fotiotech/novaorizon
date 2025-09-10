"use server";

import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { ProductCollection } from "@/models/ProductCollection";
import Product from "@/models/Product";
import "@/models/Category";

// Helper function to parse rule values based on their expected type
function parseRuleValue(value: any, operator: string) {
  if (operator === "$in" || operator === "$nin") {
    // Handle array values
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;

        // Handle comma-separated values
        if (value.includes(",")) {
          return value.split(",").map((item: string) => item.trim());
        }

        // Single value in array
        return [value];
      } catch {
        // If not JSON, treat as comma-separated or single value
        if (value.includes(",")) {
          return value.split(",").map((item: string) => item.trim());
        }
        return [value];
      }
    }
    return [value];
  }

  // Handle numeric values for comparison operators
  if (["$lt", "$lte", "$gt", "$gte"].includes(operator)) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  // Handle boolean values
  if (value === "true") return true;
  if (value === "false") return false;

  // Return as is for other cases
  return value;
}

// Helper to build MongoDB query from rules
function buildQueryFromRules(rules: any[]) {
  if (!rules || rules.length === 0) return {};

  const query: any = { $and: [] };

  for (const rule of rules) {
    if (!rule.attribute || !rule.operator) continue;

    const value = parseRuleValue(rule.value, rule.operator);

    // Handle category_id specially if it's an ObjectId
    if (rule.attribute === "category_id") {
      if (Array.isArray(value)) {
        // Handle array of values for $in/$nin operators
        const objectIds = value
          .filter((v) => mongoose.Types.ObjectId.isValid(v))
          .map((v) => new mongoose.Types.ObjectId(v));

        if (objectIds.length > 0) {
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

export async function getCollectionsWithProducts() {
  try {
    await connection();

    console.log("Fetching collections with products...");

    const collections = await ProductCollection.find({})
      .populate("category_id", "name")
      .sort({ created_at: -1 })
      .lean();

    console.log(`Found ${collections.length} collections`);

    const results = [];

    for (const collection of collections) {
      // Build query from rules
      const query = buildQueryFromRules(collection.rules);

      console.log(`Collection: ${collection.name}`);
      console.log(`Rules: ${JSON.stringify(collection.rules)}`);
      console.log(`Built query: ${JSON.stringify(query)}`);

      let matchingProducts: any = [];

      if (Object.keys(query).length > 0) {
        matchingProducts = await Product.find(query)
          .populate("category_id", "name")
          .limit(50) // Limit products to avoid overloading
          .lean();

        console.log(
          `Found ${matchingProducts.length} products for collection ${collection.name}`
        );
      } else {
        console.log(
          `No rules defined for collection ${collection.name}, returning empty product list`
        );
      }

      results.push({
        collection: {
          _id: collection._id,
          name: collection.name,
          display: collection.display,
          description: collection.description,
          category: collection.category_id,
          rules: collection.rules,
          status: collection.status,
          created_at: collection.created_at,
          updated_at: collection.updated_at,
        },
        products: matchingProducts,
        productCount: matchingProducts.length,
      });
    }

    return { success: true, data: results };
  } catch (error) {
    console.error("Error fetching collections with products:", error);
    return {
      success: false,
      error: "Failed to fetch collections with products",
    };
  }
}

export async function getCollectionById(id: string) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid collection ID" };
    }

    await connection();

    const collection = await ProductCollection.findById(id)
      .populate("category_id", "name")
      .lean();

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    return { success: true, data: collection };
  } catch (error) {
    console.error("Error fetching collection:", error);
    return { success: false, error: "Failed to fetch collection" };
  }
}
