// scripts/migrate-trending-to-rule.ts
import { connection } from "@/utils/connection";
import { Collection } from "@/models/Collection";
import Product from "@/models/Product";

async function main() {
  await connection();

  // 1) Convert every "trending" recommendation collection to a rule
  //    collection on the materialized field.
  const legacy = await Collection.find({
    type: "recommendation",
    recommendationType: "trending",
  });

  for (const c of legacy) {
    c.type = "rule";
    c.rules = [
      { attribute: "isTrending", operator: "$eq", value: true, position: 0 },
    ];
    // @ts-ignore — fields removed from the schema but still set on legacy docs
    c.sort = { field: "trendingRank", direction: "asc" };
    (c as any).recommendationType = undefined;
    (c as any).recommendationLimit = undefined;
    await c.save();
    console.log(`Migrated collection "${c.name}" → rule/trending`);
  }

  // 2) Backfill isNew for the last 30 days.
  const newSince = new Date(Date.now() - 30 * 86_400_000);
  const newResult = await Product.updateMany(
    { createdAt: { $gte: newSince } },
    { $set: { isNew: true } },
  );
  console.log(`Backfilled isNew on ${newResult.modifiedCount} products.`);

  // 3) Defaults for all products so existing rows satisfy the schema.
  await Product.updateMany(
    { isFeatured: { $exists: false } },
    { $set: { isFeatured: false } },
  );
  await Product.updateMany(
    { isTrending: { $exists: false } },
    { $set: { isTrending: false, trendingRank: 0 } },
  );
  await Product.updateMany(
    { isBestseller: { $exists: false } },
    { $set: { isBestseller: false, bestsellerRank: 0 } },
  );

  console.log(
    `Migrated ${legacy.length} recommendation collections. Run /api/cron/product-metrics to seed flags.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
