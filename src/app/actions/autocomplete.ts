// app/actions/autocomplete.ts

import { connection } from "@/utils/connection";
import Product from "@/models/Product";

export async function autocompleteProducts(query: string, limit = 8) {
  await connection();

  const q = query?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return [];
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 8));

  const results = await Product.aggregate([
    {
      $search: {
        index: "default",
        compound: {
          should: [
            {
              autocomplete: {
                query: q,
                path: "name_autocomplete", // ← changed
                score: { boost: { value: 2 } },
              },
            },
            {
              autocomplete: {
                query: q,
                path: "tags_autocomplete", // ← changed
                score: { boost: { value: 1 } },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        listPrice: 1,
        mainImage: 1,
        tags: 1,
        score: { $meta: "searchScore" },
      },
    },
    { $limit: safeLimit },
  ]);

  return results;
}
