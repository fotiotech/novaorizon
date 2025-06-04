"use server";

import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";

export interface SearchProductsOptions {
  textQuery?: string;
  category_id?: string;
  brand_id?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  skip?: number;
  sortBy?: Record<string, 1 | -1>;
}

/**
 * Search products using the Product schema fields:
 * - identification_branding.name
 * - category_id
 * - identification_branding.brand
 * - pricing_availability.price
 */
export async function searchProducts(
  options: SearchProductsOptions
): Promise<{
  items: any[];
  total: number;
  limit: number;
  skip: number;
  filters: {
    categories: { id: string; name: string; count: number }[];
    brands: { id: string; name: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}> {
  await connection();
  const {
    textQuery,
    category_id,
    brand_id,
    priceMin,
    priceMax,
    limit = 20,
    skip = 0,
    sortBy = { createdAt: -1 },
  } = options;

  const match: any = {};

  if (textQuery) {
    match["identification_branding.name"] = { $regex: textQuery, $options: "i" };
  }
  if (mongoose.Types.ObjectId.isValid(category_id || "")) {
    match.category_id = new mongoose.Types.ObjectId(category_id);
  }
  if (mongoose.Types.ObjectId.isValid(brand_id || "")) {
    match["identification_branding.brand"] = new mongoose.Types.ObjectId(brand_id);
  }
  if (priceMin != null || priceMax != null) {
    match["pricing_availability.price"] = {};
    if (priceMin != null) match["pricing_availability.price"].$gte = priceMin;
    if (priceMax != null) match["pricing_availability.price"].$lte = priceMax;
  }

  const agg = [
    { $match: match },
    {
      $facet: {
        data: [
          { $sort: sortBy },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              name: "$identification_branding.name",
              sku: "$identification_branding.sku",
              brand: "$identification_branding.brand",
              category_id: 1,
              price: "$pricing_availability.price",
              currency: "$pricing_availability.currency",
              main_image: "$media_visuals.main_image",
              gallery: "$media_visuals.gallery",
            },
          },
        ],
        totalCount: [{ $count: "count" }],
        categories: [
          { $group: { _id: "$category_id", count: { $sum: 1 } } },
          {
            $lookup: {
              from: Category.collection.name,
              localField: "_id",
              foreignField: "_id",
              as: "details",
            },
          },
          { $unwind: "$details" },
          { $project: { id: "$_id", name: "$details.name", count: 1 } },
        ],
        brands: [
          { $group: { _id: "$identification_branding.brand", count: { $sum: 1 } } },
          {
            $lookup: {
              from: Brand.collection.name,
              localField: "_id",
              foreignField: "_id",
              as: "details",
            },
          },
          { $unwind: "$details" },
          { $project: { id: "$_id", name: "$details.name", count: 1 } },
        ],
        priceRange: [
          {
            $group: {
              _id: null,
              minPrice: { $min: "$pricing_availability.price" },
              maxPrice: { $max: "$pricing_availability.price" },
            },
          },
        ],
      },
    },
  ];

  const [res0] = await Product.aggregate(agg);

  const items = res0.data || [];
  const total = res0.totalCount[0]?.count || 0;
  const filters = {
    categories: (res0.categories || []).map((c: any) => ({ id: c.id.toString(), name: c.name, count: c.count })),
    brands: (res0.brands || []).map((b: any) => ({ id: b.id.toString(), name: b.name, count: b.count })),
    priceRange: {
      min: res0.priceRange[0]?.minPrice || 0,
      max: res0.priceRange[0]?.maxPrice || 0,
    },
  };

  return { items, total, limit, skip, filters };
}
