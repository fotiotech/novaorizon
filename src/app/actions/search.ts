// app/actions/search.ts
"use server";

import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import { Types } from "mongoose";

const toObjectId = (id: string) => {
  try {
    return new Types.ObjectId(id);
  } catch {
    return null;
  }
};

export async function searchProducts(
  query: string,
  filters: any[] = [],
  page = 1,
  size = 20,
) {
  await connection();

  // ----- 1. Build the $search stage -----
  const searchStage: any = {
    index: "default",
  };

  const textClause: any = {};
  if (query && query.trim() !== "") {
    textClause.text = {
      query: query,
      // `dynamic: true` on the index means every string field is indexed,
      // so wildcard covers them all — including flat category attributes.
      path: { wildcard: "*" },
      fuzzy: {
        maxEdits: 2,
        prefixLength: 1,
      },
    };
  }

  // ----- 2. Build filter clauses -----
  const filterClauses: any[] = [];

  const addTerm = (path: string, value: string) => {
    const objectId = toObjectId(value);
    if (objectId) {
      filterClauses.push({ equals: { path, value: objectId.toString() } });
    } else if (value) {
      filterClauses.push({ equals: { path, value } });
    }
  };

  for (const f of filters) {
    // Term filter (categoryId, brand, …)
    if (f.term) {
      const [path, value] = Object.entries(f.term)[0];
      addTerm(path, value as string);
    }
    // Range filter (price, …)
    if (f.range) {
      const [path, range]: any = Object.entries(f.range)[0];
      const rangeClause: any = {};
      if (range.gte !== undefined) rangeClause.gte = range.gte;
      if (range.lte !== undefined) rangeClause.lte = range.lte;
      if (Object.keys(rangeClause).length) {
        filterClauses.push({ range: { path, ...rangeClause } });
      }
    }
    // Attribute filter — flat model: the attribute code IS the path.
    if (f.attribute) {
      const { key, value } = f.attribute;
      if (key && value !== undefined && value !== null && value !== "") {
        filterClauses.push({
          equals: { path: String(key), value: String(value) },
        });
      }
    }
  }

  // ----- 3. Compose compound -----
  const must = [];
  if (textClause.text) must.push(textClause);
  const filter = filterClauses.length > 0 ? filterClauses : undefined;

  if (must.length > 0 || filter) {
    searchStage.compound = {
      must: must.length ? must : undefined,
      filter: filter,
    };
  } else {
    return {
      hits: [],
      total: { value: 0 },
      aggregations: {
        categories: [],
        brands: [],
        priceRange: { min: 0, max: 0 },
      },
    };
  }

  // ----- 4. Pipeline with $facet -----
  // Flat model → the whole document is small, so we keep every field
  // (including dynamic attributes) and only strip heavy arrays.
  const pipeline: any[] = [
    { $search: searchStage },
    {
      $facet: {
        hits: [
          { $addFields: { score: { $meta: "searchScore" } } },
          { $skip: (page - 1) * size },
          { $limit: size },
          {
            $project: {
              variants: 0,
              reviewsRatings: 0,
              __v: 0,
              createdAt: 0,
              updatedAt: 0,
            },
          },
        ],
        categories: [
          {
            $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true },
          },
          { $group: { _id: "$categoryId", count: { $sum: 1 } } },
          {
            $lookup: {
              from: "categories",
              localField: "_id",
              foreignField: "_id",
              as: "categoryInfo",
            },
          },
          {
            $unwind: {
              path: "$categoryInfo",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 1,
              name: "$categoryInfo.name",
              count: 1,
            },
          },
          { $sort: { count: -1 } },
        ],
        brands: [
          { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
          { $group: { _id: "$brand", count: { $sum: 1 } } },
          {
            $lookup: {
              from: "brands",
              localField: "_id",
              foreignField: "_id",
              as: "brandInfo",
            },
          },
          { $unwind: { path: "$brandInfo", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: "$brandInfo.name",
              count: 1,
            },
          },
          { $sort: { count: -1 } },
        ],
        priceRange: [
          {
            $group: {
              _id: null,
              min: { $min: "$listPrice" },
              max: { $max: "$listPrice" },
            },
          },
        ],
        totalCount: [{ $count: "total" }],
      },
    },
  ];

  const [result] = await Product.aggregate(pipeline);

  const hits = result.hits || [];
  const categories = result.categories || [];
  const brands = result.brands || [];
  const priceRange = result.priceRange?.[0] || { min: 0, max: 0 };
  const total = result.totalCount?.[0]?.total || 0;

  return {
    hits: hits.map((hit: any) => ({
      _id: hit._id.toString(),
      _source: hit,
    })),
    total: { value: total },
    aggregations: {
      categories,
      brands,
      priceRange,
    },
  };
}
