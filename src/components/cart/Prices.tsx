import { CartItem } from "@/app/reducer/cartReducer";

// src/components/cart/Prices.tsx

type PricesProps = {
  amount: number;
  currency?: string;
};

export function Prices({ amount, currency = "F" }: PricesProps) {
  return (
    <span>
      {amount} {currency}
    </span>
  );
}

export const TotalPrice = ({
  cart,
  shippingPrice,
  currency = "CFA",
}: {
  cart: CartItem[];
  shippingPrice: number | null;
  currency?: string;
}) => {
  const amount = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  return (
    <span>
      {amount + (shippingPrice || 0)} {currency}
    </span>
  );
};
