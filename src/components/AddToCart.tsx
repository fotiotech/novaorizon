"use client";

import { triggerNotification } from "@/app/actions/notifications";
import { useCart } from "@/app/context/CartContext";
import { useUser } from "@/app/context/UserContext";

const AddToCart = ({ product }: { product: any }) => {
  const { user } = useUser();
  const { dispatch } = useCart();

  if (!product) return null;

  // 1. Title (from identification_branding.name)
  const title: string = product.identification_branding?.name || "";

  // 2. Image URL (prefer main_image, otherwise first gallery image)
  const mainImage: string | undefined = product.media_visuals?.main_image;
  const gallery: string[] = product.media_visuals?.gallery || [];
  const imageUrl: string = mainImage || gallery[0] || "";

  // 3. Price (from pricing_availability.price)
  const salePrice: number = product.pricing_availability?.price ?? 0;

  // 4. Product ID
  const productId: string = product._id || "";

  const handleAddToCart = () => {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: productId,
        name: title,
        imageUrl,
        price: salePrice,
        quantity: 1,
      },
    });
  };

  return (
    <button
      type="button"
      title="Add to cart"
      onClick={() => {
        handleAddToCart();
        triggerNotification(
          user?._id as string,
          "A Customer Added a Product to the Cart!"
        );
      }}
      className="border rounded-lg p-2 bg-blue-600 hover:bg-blue-700 w-full shadow-lg font-semibold text-white transition"
    >
      Add To Cart
    </button>
  );
};

export default AddToCart;
