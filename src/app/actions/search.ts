"use server";

import { connection } from "@/utils/connection";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import Product from "@/models/Product";

// Improved detection with word boundaries
async function detectCategory(query: string) {
  await connection();
  const normalizedQuery = query.toLowerCase().trim();
  const categories = await Category.find();

  for (const category of categories) {
    if (!category.name) continue;

    const categoryName = category.name.toLowerCase();

    // Use regex for word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${categoryName}\\b`, "i");
    if (regex.test(query)) {
      return category._id?.toString();
    }

    // Also check for partial matches as fallback, but with spaces
    if (
      normalizedQuery.includes(` ${categoryName} `) ||
      normalizedQuery.startsWith(`${categoryName} `) ||
      normalizedQuery.endsWith(` ${categoryName}`)
    ) {
      return category._id?.toString();
    }
  }
  return null;
}

async function detectBrand(query: string) {
  await connection();
  const normalizedQuery = query.toLowerCase().trim();
  const brands = await Brand.find();

  for (const brand of brands) {
    if (!brand.name) continue;

    const brandName = brand.name.toLowerCase();

    // Use regex for word boundary matching
    const regex = new RegExp(`\\b${brandName}\\b`, "i");
    if (regex.test(query)) {
      return brand._id?.toString();
    }

    // Partial match with space boundaries
    if (
      normalizedQuery.includes(` ${brandName} `) ||
      normalizedQuery.startsWith(`${brandName} `) ||
      normalizedQuery.endsWith(` ${brandName}`)
    ) {
      return brand._id?.toString();
    }
  }
  return null;
}

export async function searchProducts(
  query: string,
  filters: any[] = [],
  page = 1,
  size = 10
) {
  await connection();

  // Add await here
  const category = await detectCategory(query);
  const brand = await detectBrand(query);

  console.log("Detected category:", category);
  console.log("Detected brand:", brand);

  // Create a copy of filters to avoid mutating the original
  const updatedFilters = [...filters];

  if (category) {
    updatedFilters.push({ term: { category_id: category } });
  }

  if (brand) {
    updatedFilters.push({ term: { brand: brand } });
  }

  // Convert Elasticsearch filters to MongoDB format
  const mongoFilters: any = {};

  updatedFilters.forEach((filter) => {
    if (filter.term) {
      Object.assign(mongoFilters, filter.term);
    }
    if (filter.range) {
      Object.keys(filter.range).forEach((key) => {
        mongoFilters[key] = { ...mongoFilters[key], ...filter.range[key] };
      });
    }
  });

  // Build MongoDB query
  const mongoQuery: any = {};

  if (query && query.trim() !== "") {
    mongoQuery.$text = { $search: query };
  }

  if (Object.keys(mongoFilters).length > 0) {
    mongoQuery.$and = [mongoFilters];
  }

  console.log("Final MongoDB query:", { mongoQuery });

  try {
    const products = await Product.find(mongoQuery)
      .skip((page - 1) * size)
      .limit(size)
      .populate("category_id")
      .populate("brand")
      .exec();

    // Transform results to match expected format
    const hits = products.map((product) => ({
      _id: product._id.toString(),
      _source: {
        ...product.toObject(),
        category: product.category_id,
        brand: product.brand,
      },
    }));

    return {
      hits,
      total: {
        value: hits.length,
      },
    };
  } catch (err) {
    console.error("MongoDB search error:", err);
    throw err;
  }
}
