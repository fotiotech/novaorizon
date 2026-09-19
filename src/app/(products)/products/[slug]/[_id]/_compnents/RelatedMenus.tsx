import { MENU_LOCATIONS } from "@/app/lib/collection/collection-helpers";
import MenuRenderer from "@/components/MenuRenderer";

export default function RelatedMenus({ productId }: { productId: string }) {
  return (
    <MenuRenderer
      location={MENU_LOCATIONS.PRODUCT_RELATED}
      context={{ productId }}
    />
  );
}
