"use server";

import { connection } from "@/utils/connection";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import { Client } from "@elastic/elasticsearch";
import Product from "@/models/Product";

const client = new Client({
  node: process.env.ELASTIC_NODE,
  auth: { apiKey: process.env.ELASTIC_API_KEY! },
});

async function detectCategory(query: string) {
  await connection();
  const q = query.toLowerCase();
  const categories = await Category.find();
  for (const c of categories) {
    if (q.includes(c.name?.toLowerCase())) return c?._id?.toString();
  }
  return null;
}

async function detectBrand(query: string) {
  await connection();
  const q = query.toLowerCase();
  const brands = await Brand.find();
  for (const b of brands) {
    if (q.includes(b.name?.toLowerCase())) return b?._id?.toString();
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

  // Convert Elasticsearch filters to MongoDB format
  const mongoFilters: any = {};

  filters.forEach((filter) => {
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

  console.log({mongoQuery})

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

    console.log({hits, products })

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
