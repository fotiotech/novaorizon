import { CartItem } from "@/app/reducer/cartReducer";

// src/components/cart/Prices.tsx

type PricesProps = {
  amount: number;
  currency?: string;
};

export function Prices({ amount, currency = "XAF" }: PricesProps) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency,
  }).format(amount);
}


export const TotalPrice = ({
  cart,
  shippingPrice,
  currency = "XAF",
}: {
  cart: CartItem[];
  shippingPrice: number;
  currency?: string;
}) => {
  const amount = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  return <Prices amount={amount + shippingPrice} currency={currency} />;
};

