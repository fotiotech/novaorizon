"use server";

import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Attribute from "@/models/Attributes";

interface SearchProductsOptions {
  textQuery?: string;
  category_id?: string;
  brand_id?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  skip?: number;
  sortBy?: any;
}

async function detectCategoryFromText(textQuery: string) {
  if (!textQuery) return null;
  const categories = await Category.find({}, { categoryName: 1, synonyms: 1 });
  const normalized = textQuery.toLowerCase();
  for (const cat of categories) {
    if (normalized.includes(cat.categoryName.toLowerCase()))
      return { id: cat._id.toString(), name: cat.categoryName };
    for (const syn of cat.synonyms || []) {
      if (normalized.includes(syn.toLowerCase()))
        return { id: cat._id.toString(), name: cat.categoryName };
    }
  }
  return null;
}

async function detectBrandFromText(textQuery: string) {
  if (!textQuery) return null;
  const brands = await Brand.find({}, { name: 1 });
  const normalized = textQuery.toLowerCase();
  for (const brand of brands) {
    if (normalized.includes(brand.name.toLowerCase()))
      return { id: brand._id.toString(), name: brand.name };
  }
  return null;
}

async function detectAttributesFromText(
  textQuery: string
): Promise<Record<string, any>> {
  const attributes: Record<string, any> = {};
  const normalized = textQuery.toLowerCase();
  const attributeDocs = await Attribute.find({}, { name: 1, values: 1 });

  for (const attr of attributeDocs) {
    for (const value of attr.values || []) {
      if (normalized.includes(value.toLowerCase())) {
        attributes[`attributes.${attr.name}`] = value;
        break;
      }
    }
  }
  return attributes;
}

export async function searchProducts(options: SearchProductsOptions) {
  await connection();
  const {
    textQuery,
    priceMin,
    priceMax,
    limit = 20,
    skip = 0,
    sortBy = { createdAt: -1 },
  } = options;

  let category_id = options.category_id;
  let brand_id = options.brand_id;
  let detectedCategory;
  let detectedBrand;

  if (!category_id && textQuery)
    detectedCategory = (await detectCategoryFromText(textQuery)) ?? undefined;
  if (!brand_id && textQuery) {
    const detected = await detectBrandFromText(textQuery);
    detectedBrand = detected ?? undefined;
  }

  const match: any = {};

  if (
    textQuery &&
    !textQuery.includes(detectedCategory?.name || detectedBrand?.name || "")
  ) {
    match["identification_branding.name"] = {
      $regex: textQuery,
      $options: "i",
    };
  }

  if (mongoose.Types.ObjectId.isValid(category_id || "")) {
    match.category_id = new mongoose.Types.ObjectId(category_id);
  }
  if (detectedCategory) {
    match.category_id = new mongoose.Types.ObjectId(detectedCategory.id);
  }

  if (mongoose.Types.ObjectId.isValid(brand_id || "")) {
    match["identification_branding.brand"] = new mongoose.Types.ObjectId(
      brand_id
    );
  }
  if (detectedBrand) {
    match["identification_branding.brand"] = new mongoose.Types.ObjectId(
      detectedBrand.id
    );
  }

  const attrMatch = await detectAttributesFromText(textQuery ?? "");
  for (const key in attrMatch) {
    match[key] = attrMatch[key];
  }

  console.log("attrMatch:", JSON.stringify(attrMatch, null, 2));

  if (priceMin != null || priceMax != null) {
    match["pricing_availability.price"] = {};
    if (priceMin != null) match["pricing_availability.price"].$gte = priceMin;
    if (priceMax != null) match["pricing_availability.price"].$lte = priceMax;
  }

  console.log("Final MongoDB match:", JSON.stringify(match, null, 2));

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
          {
            $project: {
              id: "$details._id",
              name: "$details.categoryName",
              count: 1,
            },
          },
        ],
        brands: [
          {
            $group: {
              _id: "$identification_branding.brand",
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: Brand.collection.name,
              localField: "_id",
              foreignField: "_id",
              as: "details",
            },
          },
          { $unwind: "$details" },
          { $project: { id: "$details._id", name: "$details.name", count: 1 } },
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

  const items = res0?.data || [];
  const total = res0?.totalCount?.[0]?.count || 0;
  const filters = {
    categories: (res0?.categories || []).map((c: any) => ({
      id: c.id.toString(),
      name: c.name,
      count: c.count,
    })),
    brands: (res0?.brands || []).map((b: any) => ({
      id: b.id.toString(),
      name: b.name,
      count: b.count,
    })),
    priceRange: {
      min: res0?.priceRange?.[0]?.minPrice || 0,
      max: res0?.priceRange?.[0]?.maxPrice || 0,
    },
  };

  return { items, total, limit, skip, filters };
}
