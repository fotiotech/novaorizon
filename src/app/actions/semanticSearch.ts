// app/actions/semanticSearch.ts
"use server";

import { connection } from "@/utils/connection";
import Product from "@/models/Product";
import { Types } from "mongoose";
import { getVoyageClient } from "@/lib/voyageClient";
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "@/lib/embedding";
import {
  getCachedQueryEmbedding,
  setCachedQueryEmbedding,
} from "@/lib/queryEmbeddingCache";

const VECTOR_INDEX = "novaorizon-search";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export interface SemanticHit {
  _id: string;
  _source: any;
  score: number;
}

export interface SemanticSearchResult {
  hits: SemanticHit[];
  total: { value: number };
}

export interface SemanticSearchFilters {
  categoryId?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  status?: string;
}

export async function semanticSearch(
  query: string,
  filters: SemanticSearchFilters = {},
  limit = 20,
): Promise<SemanticSearchResult> {
  await connection();

  const q = query?.trim() ?? "";
  if (q.length < 2) {
    return { hits: [], total: { value: 0 } };
  }

  if (!process.env.VOYAGE_API_KEY) {
    console.warn("[semanticSearch] VOYAGE_API_KEY missing — returning empty");
    return { hits: [], total: { value: 0 } };
  }

  // ------------------------------------------------------------------
  // 1. Embed the query (cached)
  // ------------------------------------------------------------------
  let queryVector: number[] | null = getCachedQueryEmbedding(q);

  if (!queryVector) {
    try {
      const t0 = Date.now();
      const response: any = await getVoyageClient().embed({
        input: [q],
        model: EMBEDDING_MODEL,
        inputType: "query",
        outputDimension: EMBEDDING_DIMENSIONS,
      });
      queryVector = response.data[0].embedding as number[];

      if (
        Array.isArray(queryVector) &&
        queryVector.length === EMBEDDING_DIMENSIONS
      ) {
        setCachedQueryEmbedding(q, queryVector);
      } else {
        console.warn(
          `[semanticSearch] Unexpected embedding shape: ${queryVector?.length} dims`,
        );
        return { hits: [], total: { value: 0 } };
      }

      console.log(`[semanticSearch] embed "${q}" ${Date.now() - t0}ms (miss)`);
    } catch (err) {
      console.error("[semanticSearch] Failed to embed query:", err);
      return { hits: [], total: { value: 0 } };
    }
  } else {
    console.log(`[semanticSearch] embed "${q}" (hit)`);
  }

  // ------------------------------------------------------------------
  // 2. Build the $vectorSearch pre-filter
  //
  // IMPORTANT: ObjectId-typed filter values must be real BSON ObjectIds
  // (new Types.ObjectId(...)), NOT EJSON {$oid: "..."}. The latter is a
  // string-format that mongosh understands but the Node driver passes
  // through as a plain subdocument, causing every filter to match zero
  // documents silently.
  // ------------------------------------------------------------------
  const filter: Record<string, any> = {};

  if (filters.status) {
    filter.status = { $eq: filters.status };
  }
  if (filters.categoryId && OBJECT_ID_RE.test(filters.categoryId)) {
    filter.categoryId = { $eq: new Types.ObjectId(filters.categoryId) };
  }
  if (filters.brand && OBJECT_ID_RE.test(filters.brand)) {
    filter.brand = { $eq: new Types.ObjectId(filters.brand) };
  }
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    const price: Record<string, number> = {};
    if (filters.priceMin !== undefined) price.$gte = filters.priceMin;
    if (filters.priceMax !== undefined) price.$lte = filters.priceMax;
    filter.price = price;
  }

  // ------------------------------------------------------------------
  // 3. Run $vectorSearch + $lookup for category/brand names
  // ------------------------------------------------------------------
  const vectorStage: any = {
    index: VECTOR_INDEX,
    path: "embedding",
    queryVector,
    numCandidates: Math.max(limit * 10, 100),
    limit,
  };
  if (Object.keys(filter).length > 0) {
    vectorStage.filter = filter;
  }

  const pipeline: any[] = [
    { $vectorSearch: vectorStage },

    // --- resolve category name -------------------------------------
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "_cat",
      },
    },
    { $unwind: { path: "$_cat", preserveNullAndEmptyArrays: true } },

    // --- resolve brand name ----------------------------------------
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "_brand",
      },
    },
    { $unwind: { path: "$_brand", preserveNullAndEmptyArrays: true } },

    // --- score -----------------------------------------------------
    { $addFields: { score: { $meta: "vectorSearchScore" } } },

    // --- overwrite denormalized names with live lookups ------------
    // Separate $addFields stage: expressions are forbidden inside an
    // exclusion $project.
    {
      $addFields: {
        categoryName: { $ifNull: ["$_cat.name", "$categoryName"] },
        brandName: { $ifNull: ["$_brand.name", "$brandName"] },
      },
    },

    // --- strip internal / heavy fields -----------------------------
    {
      $project: {
        embedding: 0,
        embeddingText: 0,
        embeddingModel: 0,
        embeddedAt: 0,
        variants: 0,
        reviewsRatings: 0,
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
        _cat: 0,
        _brand: 0,
      },
    },
  ];

  try {
    const rows = await Product.aggregate(pipeline);

    if (Object.keys(filter).length > 0) {
      console.log(
        `[semanticSearch] filter applied — ${rows.length} hits`,
        filter,
      );
    }

    return {
      hits: rows.map((r: any) => ({
        _id: r._id.toString(),
        _source: r,
        score: r.score ?? 0,
      })),
      total: { value: rows.length },
    };
  } catch (err) {
    console.error("[semanticSearch] $vectorSearch failed:", err);
    return { hits: [], total: { value: 0 } };
  }
}
