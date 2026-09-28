// app/actions/search.ts
"use server";

import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import { Types } from "mongoose";

const SEARCH_INDEX = "default";

// Fields the index actually has — keep this in sync with the Atlas mapping.
const TEXT_PATHS = ["name", "description", "shortDescription", "tags"];

export async function searchProducts(
  query: string,
  filters: any[] = [],
  page = 1,
  size = 20,
) {
  await connection();

  // ----- 1. Build the $search stage -----
  const searchStage: any = { index: SEARCH_INDEX };

  const textClause: any = {};
  if (query && query.trim() !== "") {
    textClause.text = {
      query,
      path: TEXT_PATHS,
      fuzzy: { maxEdits: 2, prefixLength: 1 },
    };
  }

  // ----- 2. Build filter clauses -----
  const filterClauses: any[] = [];

  // ObjectId-typed paths (categoryId, brand) need a real BSON ObjectId,
  // not a hex string. Passing `value.toString()` silently matches nothing.
  const addTerm = (path: string, value: string) => {
    if (!value) return;
    const oid = Types.ObjectId.isValid(value)
      ? new Types.ObjectId(value)
      : null;
    filterClauses.push({ equals: { path, value: oid ?? value } });
  };

  for (const f of filters) {
    // --- term: { categoryId: "…" } | { brand: "…" } | { status: "active" }
    if (f.term) {
      const [path, value] = Object.entries(f.term)[0];
      addTerm(path, value as string);
    }

    // --- range: { price: { gte, lte } }
    if (f.range) {
      const [path, range]: any = Object.entries(f.range)[0];
      const rangeClause: any = {};
      if (range.gte !== undefined) rangeClause.gte = range.gte;
      if (range.lte !== undefined) rangeClause.lte = range.lte;
      if (Object.keys(rangeClause).length) {
        filterClauses.push({ range: { path, ...rangeClause } });
      }
    }

    // --- attribute: { key: "color", value: "black" }
    //
    // Attributes are stored FLAT on the Product root, one key per
    // category attribute code (`product.color`, `product.weight`, …).
    // The Atlas index has `dynamic: true`, so each dynamic string is
    // indexed with the standard analyzer (lowercased, tokenized) and
    // each dynamic number is indexed as a number. `equals` on a string
    // field matches either the scalar value or any element of an array,
    // which is why `color: "black"` and `color: ["black","white"]` both
    // resolve with a single `equals` clause.
    if (f.attribute) {
      const { key, value } = f.attribute;
      if (!key || value == null || value === "") continue;

      const path = String(key);
      const raw = String(value).trim().toLowerCase();

      // Numeric-looking strings ("45", "3.5") are sent as numbers so
      // they match number-typed dynamic fields. Everything else stays
      // a string. String("45") === "45" — that check rejects "45abc",
      // "045", " 45 ", "4e2" etc. where Number() would silently coerce.
      const asNumber = Number(raw);
      const numericValue =
        raw !== "" && Number.isFinite(asNumber) && String(asNumber) === raw
          ? asNumber
          : null;

      filterClauses.push({
        equals: { path, value: numericValue ?? raw },
      });
    }
  }

  // ----- 3. Compose compound -----
  const must: any[] = [];
  if (textClause.text) must.push(textClause);

  const filter = filterClauses.length > 0 ? filterClauses : undefined;

  if (must.length === 0 && !filter) {
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

  const compound: any = {};
  // When there's no text query, we still need a must clause for the
  // filters to attach to. `exists: name` is a cheap match-all.
  compound.must = must.length > 0 ? must : [{ exists: { path: "name" } }];
  if (filter) compound.filter = filter;

  searchStage.compound = compound;

  // ----- 4. Pipeline with $facet -----
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
          { $project: { _id: 1, name: "$categoryInfo.name", count: 1 } },
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
          { $project: { _id: 1, name: "$brandInfo.name", count: 1 } },
          { $sort: { count: -1 } },
        ],
        // Uses `price`, matching the range filter in `buildFilters`.
        priceRange: [
          {
            $group: {
              _id: null,
              min: { $min: "$price" },
              max: { $max: "$price" },
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
