"use server";

import { connection } from "@/utils/connection";
import Product from "@/models/Product";

export async function autocompleteProducts(query: string, limit = 8) {
  await connection();

  if (!query || query.trim().length < 2) {
    return [];
  }

  // Use `text` operator instead of `autocomplete`
  // because `title.autocomplete` is of type `string` (not `autocomplete`).
  const results = await Product.aggregate([
    {
      $search: {
        index: "default", // your index name
        text: {
          query: query,
          path: "title.autocomplete",
          fuzzy: {
            maxEdits: 1,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        listPrice: 1,
        mainImage: 1,
        score: { $meta: "searchScore" },
      },
    },
    { $limit: limit },
  ]);

  return results;
}
