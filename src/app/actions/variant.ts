import { Variant } from "@/models/Variant";

export async function getVariantDetails(variantId: string) {
  const variant = await Variant.findById(variantId)
    .populate("productId") // Populate the parent product
    .exec();

  if (!variant) throw new Error("Variant not found");

  // Merge parent product and variant properties
  const inheritedDetails = {
    name: (variant.productId as any).name, // Parent product name
    category: (variant.productId as any).categoryId,
    brand: (variant.productId as any).brand,
    price: variant.price || (variant.productId as any).price, // Use variant price or base price
    attributes: variant.attributes,
    quantity: variant.quantity,
  };

  return inheritedDetails;
}
