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
      // ✅ Correct boosting: use `path: { multi: { fieldName: boost } }`
      path: {
        multi: {
          title: 2, // title gets twice the weight
          description: 1, // description normal weight
        },
      },
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
    if (f.term) {
      const [path, value] = Object.entries(f.term)[0];
      addTerm(path, value as string);
    }
    if (f.range) {
      const [path, range]: any = Object.entries(f.range)[0];
      const rangeClause: any = {};
      if (range.gte !== undefined) rangeClause.gte = range.gte;
      if (range.lte !== undefined) rangeClause.lte = range.lte;
      if (Object.keys(rangeClause).length) {
        filterClauses.push({ range: { path, ...rangeClause } });
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
  const pipeline: any[] = [
    { $search: searchStage },
    {
      $facet: {
        hits: [
          { $skip: (page - 1) * size },
          { $limit: size },
          {
            $project: {
              _id: 1,
              title: 1,
              description: 1,
              list_price: 1,
              currency: 1,
              main_image: 1,
              category: "$category_id",
              brand: "$brand",
              inStock: 1,
              score: { $meta: "searchScore" },
            },
          },
        ],
        categories: [
          {
            $unwind: { path: "$category_id", preserveNullAndEmptyArrays: true },
          },
          { $group: { _id: "$category_id", count: { $sum: 1 } } },
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
              min: { $min: "$list_price" },
              max: { $max: "$list_price" },
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
