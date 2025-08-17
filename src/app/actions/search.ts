"use server";

import { connection } from "@/utils/connection";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: process.env.ELASTIC_NODE,
  auth: { apiKey: process.env.ELASTIC_API_KEY! },
});

async function detectCategory(query: string) {
  await connection();
  const q = query.toLowerCase();
  const categories = await Category.find();
  for (const c of categories) {
    if (q.includes(c.categoryName?.toLowerCase())) return c?._id?.toString();
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
  const from = (page - 1) * size;

  // Detect category and brand from query
  const detectedCategory = await detectCategory(query);
  const detectedBrand = await detectBrand(query);


  if (detectedCategory)
    filters.push({ term: { category_id: detectedCategory } });
  if (detectedBrand) filters.push({ term: { brand: detectedBrand } });

  // Only include filter if non-empty
  const esQuery =
    query && query.trim() !== ""
      ? {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ["name^3", "description"],
                  fuzziness: "AUTO",
                },
              },
            ],
            ...(filters.length > 0 ? { filter: filters } : {}),
          },
        }
      : { match_all: {} };

  try {
    const result = await client.search({
      index: process.env.ELASTIC_INDEX,
      from,
      size,
      query: esQuery,
      sort: [{ _score: { order: "desc" } }, { createdAt: { order: "desc" } }],
    });

    return result.hits;
  } catch (err) {
    console.error("Elasticsearch search error:", err);
    throw err;
  }
}
