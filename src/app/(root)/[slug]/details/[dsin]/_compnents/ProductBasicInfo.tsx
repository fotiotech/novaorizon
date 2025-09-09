import AddToCart from "@/components/AddToCart";
import CheckoutButton from "@/components/CheckoutButton";
import DetailImages from "@/components/DetailImages";

interface ProductBasicInfoProps {
  product: any;
  onVariantSelect: (variant: any) => void;
}

 const ProductBasicInfo: React.FC<ProductBasicInfoProps> = ({
  product,
  onVariantSelect,
}) => {
  const {
    _id = "",
    title = "Untitled Product",
    model = "",
    list_price = 0,
    gallery = [],
    stock_status = [],
    main_image = "",
    condition = [],
    short_desc = "",
    variants = [],
  } = product || {};

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6">
        {Array.isArray(gallery) && gallery.length > 0 ? (
          <div className="md:w-1/2">
            <DetailImages file={gallery} />
          </div>
        ) : (
          <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-200 text-gray-500 rounded p-6">
            No images available
          </div>
        )}

        <div className="md:w-1/2 text-text">
          <h1 className="text-2xl font-bold mb-4">
            {title} {model}
          </h1>

          {typeof list_price === "number" && (
            <div className="text-2xl font-semibold mb-4">{list_price} CFA</div>
          )}

          {Array.isArray(stock_status) && stock_status.length > 0 && (
            <div
              className={`${
                stock_status.join(", ") === "In Stock"
                  ? "text-green-600"
                  : "text-red-600"
              } mb-4`}
            >
              {stock_status.join(", ")}
            </div>
          )}

          {/* Variant selection */}
          {Array.isArray(variants) && variants.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select Variant:
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {variants.map((v: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => onVariantSelect(v)}
                    className="px-3 py-1 border rounded hover:bg-gray-100 transition-colors"
                  >
                    {v.sku || `Variant ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 w-full">
            <CheckoutButton
              product={{
                _id,
                name: title,
                main_image,
                price: list_price,
              }}
              width="w-full"
              bgColor="bg-gray-800"
            >
              Checkout
            </CheckoutButton>
            <AddToCart
              product={{
                _id,
                name: title,
                main_image,
                price: list_price,
              }}
            />
          </div>
        </div>
      </div>

      <div className="my-6 rounded grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.isArray(condition) && condition.length > 0 && (
          <div>
            <span className="font-semibold">Condition:</span>{" "}
            {condition.join(", ")}
          </div>
        )}
      </div>

      {short_desc && (
        <div className="my-6 rounded">
          <p className="text-gray-700">{short_desc}</p>
        </div>
      )}
    </>
  );
};

export default ProductBasicInfo;