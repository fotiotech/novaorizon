import React from "react";

interface ProductCardProps {
  product: {
    _id: string;
    productName: string;
    description: string;
    price: number;
    imageUrl: string; // Assuming products have an image URL
    // You can include any other product-related fields here
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4">
      <img
        src={product.imageUrl}
        alt={product.productName}
        className="w-full h-48 object-cover rounded-lg"
      />
      <div className="mt-4">
        <h3 className="text-xl font-semibold">{product.productName}</h3>
        <p className="text-sm text-gray-600">{product.description}</p>
        <div className="mt-2">
          <span className="text-lg font-bold">${product.price}</span>
        </div>
        <button className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
