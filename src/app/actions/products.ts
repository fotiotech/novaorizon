"use server";

import { connection } from "@/utils/connection";
import slugify from "slugify";
import Product from "@/models/Product";
import "@/models/User";
import "@/models/Brand";

type PopulatedProduct = {
  _id: string;
  category_id: string | null;
  identification_branding: {
    sku: string;
    name: string;
    brand: { _id: string; name: string } | null;
    manufacturer?: string;
    model_number?: string;
    attributes?: unknown[];
  };
  product_specifications: any;
  media_visuals: any;
  pricing_availability: any;
  variants_options: any;
  key_features: string[];
  bullets: string[];
  descriptions: any;
  materials_composition: any;
  logistics_shipping: any;
  warranty_returns: any;
  reviews_ratings: {
    _id: string;
    user_id: { _id: string; username: string } | null;
    rating: number;
    comment: string;
    created_at: Date;
  }[];
  ratings_summary: any;
  seo_marketing: any;
  legal_compliance: any;
  features_attributes: unknown[];
  createdAt: Date;
  updatedAt: Date;
};

// Generate a slug from the product name and department
function generateSlug(name: string, department: string | null) {
  return slugify(`${name}${department ? `-${department}` : ""}`, {
    lower: true,
  });
}

// Generate a random DSIN (Digital Serial Identification Number)
function generateDsin() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWYZ0123456789";
  let dsin = "";
  for (let i = 0; i < 10; i++) {
    dsin += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return dsin;
}

export async function getProductsByAttributes(filters: {
  brand?: string;
  priceRange?: [number, number];
  tags?: string[];
}) {
  await connection();

  const query: any = {};

  if (filters.brand) query.brand = filters.brand;
  if (filters.priceRange)
    query.price = { $gte: filters.priceRange[0], $lte: filters.priceRange[1] };
  if (filters.tags && filters.tags.length > 0)
    query.tags = { $in: filters.tags };

  const products = await Product.find(query).populate("tags", "name");
  return products;
}

/**
 * Fetches one or all products from MongoDB, populating:
 *  - identification_branding.brand → { _id, name }
 *  - reviews_ratings.user_id       → { _id, username }
 *
 * Converts all _id fields in the returned object(s) to string.
 */
export async function findProducts(
  id?: string
): Promise<PopulatedProduct | PopulatedProduct[] | null> {
  // 1. Ensure connection is established
  await connection();

  // 2. Build the populate specification:
  //    - identification_branding.brand populates from "Brand" model
  //    - reviews_ratings.user_id    populates from "User"  model
  const populateInstructions = [
    {
      path: "identification_branding.brand",
      model: "Brand",
      select: "_id name", // Only grab _id and name
    },
    {
      path: "reviews_ratings.user_id",
      model: "User",
      select: "_id name", // Only grab _id and name
    },
    {
      path: "related_products.product_id",
      model: "Product",
      select: "_id identification_branding media_visuals", // Only grab _id and username
    },
  ];

  if (id) {
    // Fetch a single product by _id, then populate
    const productDoc = await Product.findById(id)
      .populate(populateInstructions)
      .exec();

    if (!productDoc) {
      return null;
    }

    // Convert to plain JS object and transform ObjectIds to strings
    const raw = productDoc.toObject({ flattenMaps: true });
    return transformPopulatedProduct(raw);
  } else {
    // Fetch ALL products, sorted by created_at desc, then populate
    const productDocs = await Product.find()
      .sort({ createdAt: -1 })
      .populate(populateInstructions)
      .exec();

    // Map each document, transform to JS object, then convert IDs to strings
    return productDocs.map((doc) =>
      transformPopulatedProduct(doc.toObject({ flattenMaps: true }))
    );
  }
}

/**
 * Helper: given a populated product object (as plain JS), convert any
 * ObjectId fields to string. Specifically:
 *  - Top‐level _id, category_id
 *  - identification_branding.brand._id
 *  - reviews_ratings[]._id
 *  - reviews_ratings[].user_id._id
 */
function transformPopulatedProduct(raw: any): PopulatedProduct {
  // 1. Convert top-level IDs
  const result: any = {
    ...raw,
    _id: raw._id.toString(),
    category_id: raw.category_id ? raw.category_id.toString() : null,
  };

  // 2. identification_branding.brand
  if (result.identification_branding?.brand) {
    const brandObj = result.identification_branding.brand;
    result.identification_branding.brand = {
      _id: brandObj._id.toString(),
      name: brandObj.name,
    };
  } else {
    // In case brand was not set or is null
    result.identification_branding.brand = null;
  }

  // 3. reviews_ratings array
  if (Array.isArray(result.reviews_ratings)) {
    result.reviews_ratings = result.reviews_ratings.map((review: any) => {
      const transformed: any = {
        ...review,
        _id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
      };

      if (review.user_id) {
        // user_id was populated → an object { _id, username }
        transformed.user_id = {
          _id: review.user_id._id.toString(),
          name: review.user_id.name,
        };
      } else {
        transformed.user_id = null;
      }

      return transformed;
    });
  } else {
    result.reviews_ratings = [];
  }

  return result as PopulatedProduct;
}

// Define return type for `findProductDetails`
interface ProductDetails {
  _id: string;
  category_id: string | null;
}

export async function findProductDetails(
  id?: string
): Promise<ProductDetails | null> {
  try {
    // Ensure database connection is established
    await connection();

    if (id) {
      // Find product by dsin, and populate the brand information
      const product = await Product.findOne({ _id: id });

      // Return sanitized product details
      return {
        // Safely convert to object, and ensure proper conversion of fields
        ...product.toObject(),
        _id: product._id?.toString(),
        category_id: product.category_id?.toString() ?? null,
      };
    }

    // Return null if no product is found
    return null;
  } catch (error) {
    // Log the error for debugging
    console.error("Error fetching product details:", error);
    // Optionally, rethrow the error or return null
    throw new Error("Failed to fetch product details.");
  }
}

// app/actions/products.ts

// A “light” version just to pull URL slugs & updated dates, no populates:
export async function findProductsForSitemap() {
  await connection();
  const products = await Product.find({}, "url_slug dsin updatedAt").exec();
  return products.map((p) => ({
    url_slug: p.url_slug,
    dsin: p.dsin,
    updated_at: p.updatedAt.toISOString(),
  }));
}

export async function deleteProduct(id: string) {
  await connection();
  await Product.findByIdAndDelete(id);
}
