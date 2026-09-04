"use server";

import { connection } from "@/utils/connection";
import Product from "@/models/Product";

export async function autocompleteProducts(query: string, limit = 8) {
  await connection();

  if (!query || query.trim().length < 2) {
    return [];
  }

  const results = await Product.aggregate([
    {
      $search: {
        index: "default",
        compound: {
          should: [
            {
              autocomplete: {
                query: query,
                path: "name.autocomplete",
                score: { boost: { value: 2 } },
              },
            },
            {
              text: {
                query: query,
                path: "name",
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 1 } },
              },
            },
          ],
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
    { $limit: limit },
  ]);

  return results;
}
