import { CalcShippingPrice } from "@/app/(root)/checkout/page";
import { calculateShippingPrice } from "@/app/actions/carrier";
import { useUser } from "@/app/context/UserContext";
import { useEffect, useState } from "react";

export const shippingPrice = () => {
  const { customerInfos } = useUser();
  const [shipping_price, setShippingPrice] = useState<CalcShippingPrice | any>();

  useEffect(() => {
    async function fetchCarriers() {
      if (customerInfos?.shippingAddress?.region) {
        const res = await calculateShippingPrice(
          "675eeda75a81d16c81aca736",
          customerInfos?.shippingAddress?.region,
          0,
          undefined
        );
        setShippingPrice(res || 0);
      }
    }
    fetchCarriers();
  }, [customerInfos?.shippingAddress?.region, calculateShippingPrice]);

  return shipping_price;
};
