// test-search.js
db = connect(process.env.MONGODB_URI);

print("DB: " + db.getName());
print("Collections: " + db.getCollectionNames().join(", "));
print("products count: " + db.products.countDocuments());

const results = db.products
  .aggregate([
    {
      $search: {
        index: "default",
        autocomplete: { path: "name.autocomplete", query: "ora" },
      },
    },
    { $limit: 1 },
  ])
  .toArray();

printjson(results);
