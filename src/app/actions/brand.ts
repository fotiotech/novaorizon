"use server";

import { connection } from "@/utils/connection";
import Brand from "@/models/Brand";
import Product from "@/models/Product";
import slugify from "slugify";

// Fetch all brands, or a single one by id
export async function getBrands(brandId?: string) {
  await connection();

  if (brandId) {
    const brand = await Brand.findOne({ _id: brandId });
    if (!brand) return null;
    return {
      ...brand.toObject(),
      _id: brand._id.toString(),
    };
  }

  const brands = await Brand.find().sort({ created_at: -1 });
  return brands.map((brand) => ({
    ...brand.toObject(),
    _id: brand._id.toString(),
  }));
}

export type BrandProductsResult =
  | { ok: true; products: any[] }
  | { ok: false; error: string };

export async function findProductsByBrand(
  brandId: string,
): Promise<BrandProductsResult> {
  if (!brandId) {
    return { ok: false, error: "Missing brandId" };
  }

  try {
    await connection();

    const products = await Product.find({ brand: brandId })
      .sort({ createdAt: -1 })
      .lean();

    console.log("products", products);

    return {
      ok: true,
      products: products.map((product: any) => ({
        ...product,
        _id: product._id.toString(),
        categoryId: product.categoryId?.toString() || "",
      })),
    };
  } catch (error: any) {
    console.error("[findProductsByBrand] Error:", error);
    return {
      ok: false,
      error: error?.message || "Failed to load brand products",
    };
  }
}

// Create a new brand
function generateSlug(name: string, logoUrl: string) {
  return slugify(`${name}${logoUrl ? `-${logoUrl}` : ""}`, {
    lower: true,
  });
}

export async function createBrand(data: {
  name: string;
  logoUrl?: string;
  status?: "active" | "inactive";
}) {
  await connection();

  if (data) {
    const { name, logoUrl, status } = data;
    const url_slug = generateSlug(name, logoUrl as string);
    const newBrand = new Brand({ url_slug, name, logoUrl, status });
    await newBrand.save();
  }
}

// Update an existing brand
export async function updateBrand(
  id: string,
  data: Partial<{
    name: string;
    logoUrl: string;
    status: "active" | "inactive";
  }>,
) {
  await connection();
  await Brand.findByIdAndUpdate(id, data, { new: true });
}

// Delete a brand
export async function deleteBrand(id: string) {
  await connection();
  await Brand.findByIdAndDelete(id);
}
