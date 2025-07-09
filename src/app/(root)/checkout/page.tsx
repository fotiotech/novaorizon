"use client";

import { findCustomer, updateShippingInfos } from "@/app/actions/customer";
import ShippingForm from "@/components/customers/ShippingForm";
import { useUser } from "@/app/context/UserContext";
import { useState, useEffect, useCallback } from "react";
import { Customer } from "@/constant/types";
import Link from "next/link";
import OrderSummary from "@/components/cart/OrderSummary";
import { createOrUpdateOrder } from "@/app/actions/order";
import { useCart } from "@/app/context/CartContext";
import { CartItem } from "@/app/reducer/cartReducer";
import OrderButton from "@/components/checkout/OrderButton";
import { calculateShippingPrice } from "@/app/actions/carrier";
import { useSearchParams } from "next/navigation";

export type CalcShippingPrice = {
  averageDeliveryTime: string;
  basePrice: number;
  region: string;
  shippingPrice: number;
};
const CheckoutPage = () => {
  
  const orderNumber = useSearchParams()?.get("orderNumber");
  const { user, customerInfos } = useUser();
  const [shippingAddressCheck, setShippingAddressCheck] =
    useState<boolean>(true);

  const [shippingPrice, setShippingPrice] = useState<CalcShippingPrice | null>(
    null
  );

  useEffect(() => {
    async function updateDirectly() {
      if (shippingAddressCheck) {
        updateShippingInfos(
          user?._id as string,
          shippingAddressCheck,
          undefined
        );
      }
    }
    updateDirectly();
  }, [shippingAddressCheck, updateShippingInfos, user?._id]);

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

  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold">Checkout Page</h1>
      <div>
        <p className="font-bold">Products Summary</p>
        <OrderSummary
          orderNumber={orderNumber as string}
          shippingPrice={shippingPrice}
        />
      </div>

      <div className="flex flex-col gap-3 my-2">
        <div>
          <p className="font-bold">Billing Address</p>
          {customerInfos ? (
            <Link href={`/checkout/billing_addresses`}>
              <div className="border rounded-lg p-2 cursor-pointer">
                <p>
                  {customerInfos?.billingAddress.lastName}{" "}
                  {customerInfos?.billingAddress.firstName}
                </p>
                <p>
                  {customerInfos?.billingAddress.email},{" "}
                  {customerInfos?.billingAddress.address},{" "}
                  {customerInfos?.billingAddress.city}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href={"/checkout/billing_addresses"}
              className="p-2 rounded-lg cursor-pointer"
            >
              <p>Complete Billing Address</p>
            </Link>
          )}
        </div>

        <div>
          <p className="font-bold">Shipping Information</p>

          {customerInfos?.shippingAddress ? (
            <div className="border rounded-lg p-2">
              <p>Region: {customerInfos?.shippingAddress?.region}</p>
              <p>city: {customerInfos?.shippingAddress?.city}</p>
              <p>street: {customerInfos?.shippingAddress?.street}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span> Same as Billing address?</span>
                <input
                  title="check"
                  type="checkbox"
                  checked={shippingAddressCheck}
                  onChange={(e) => setShippingAddressCheck(e.target.checked)}
                  className={`checked:bg-blue-700 `}
                />
              </div>

              <ShippingForm shippingAddressCheck={shippingAddressCheck} />
            </div>
          )}
        </div>
      </div>

      <div>
        <OrderButton orderNumber={orderNumber as string} />
      </div>
    </div>
  );
};

export default CheckoutPage;