// components/RelatedMenus.tsx
import BlockRenderer from "@/components/content/BlockRenderer";

export default function RelatedProduct({ productId }: { productId: string }) {
  return <BlockRenderer location="ProductRelated" context={{ productId }} />;
}
