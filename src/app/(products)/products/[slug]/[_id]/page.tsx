import ProductDetailsClient from "./_compnents/ProductDetailsClient";
import RelatedMenus from "./_compnents/RelatedMenus";

interface Params {
  slug: string;
  _id: string;
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { _id } = await params;

  return (
    <ProductDetailsClient
      productId={_id}
      relatedSlot={<RelatedMenus productId={_id} />}
    />
  );
}
