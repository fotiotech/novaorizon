"use client";

import { triggerNotification } from "@/app/actions/notifications";
import { useCart } from "@/app/context/CartContext";
import { useUserData } from "@/app/context/UserDataContext";

interface Product {
  _id: string;
  name: string;
  image?: string;
  gallery?: string[];
  price: number;
}

const AddToCart = ({ product }: { product: Product | null }) => {
  const { user, loading } = useUserData();
  const { dispatch } = useCart();

  if (!product) return null;

  const title: string = product?.name || "";
  const mainImage: string | undefined = product?.image;
  const gallery: string[] = product?.gallery || [];
  const imageUrl: string = mainImage || gallery[0] || "";
  const salePrice: number = product?.price ?? 0;
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

    // Only send notification if user is logged in
    if (user?.id) {
      triggerNotification(
        user.id,
        "A Customer Added a Product to the Cart!",
      ).catch((err) => console.error("Failed to send notification:", err));
    }
  };

  return (
    <button
      type="button"
      title="Add to cart"
      onClick={handleAddToCart}
      className="border rounded-lg p-2 bg-blue-600 hover:bg-blue-700 w-full shadow-lg font-semibold text-white transition"
    >
      Add To Cart
    </button>
  );
};

export default AddToCart;
