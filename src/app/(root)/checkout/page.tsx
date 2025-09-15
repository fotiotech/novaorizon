"use client";

import ShippingForm from "@/components/customers/ShippingForm";
import { useUser } from "@/app/context/UserContext";
import { useState, useEffect } from "react";
import Link from "next/link";
import OrderSummary from "@/components/cart/OrderSummary";
import BillingAddress from "./billing_addresses/page";
import GoogleMapBox from "./component/GoogleMap";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/utils/firebaseConfig";
import { useCart } from "@/app/context/CartContext";
import { shippingPrice } from "@/components/cart/shipping";

export type CalcShippingPrice = {
  averageDeliveryTime: string;
  basePrice: number;
  region: string;
  shippingPrice: number;
};
const CheckoutPage = () => {
  const { customerInfos } = useUser();
  const { cart } = useCart();
  const [shippingAddressCheck, setShippingAddressCheck] =
    useState<boolean>(true);
  const [roomId, setRoomId] = useState<string>("");

  useEffect(() => {
    const generateOrderNumber = () => {
      const datePart = new Date()
        .toISOString()
        .replace(/[-:ZT.]/g, "")
        .slice(0, 14); // YYYYMMDDHHMMSS
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      return `ORD${datePart}${randomStr}`;
    };
    setRoomId(generateOrderNumber());
  }, []);

  const shipping_price = shippingPrice();

  async function saveCart() {
    try {
      if (!cart || Object.keys(cart).length === 0) return;
      const roomRef = doc(db, "chatRooms", roomId);
      await setDoc(
        roomRef,
        {
          cart,
          shipping_price: shipping_price,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.log("Error saving cart:", error);
    }
  }

  return (
    <div className="p-2 lg:p-4 max-w-5xl mx-auto g">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="lg:flex lg:justify-between lg:items-start mb-6">
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
              <BillingAddress />
            )}
          </div>

          <div>
            <p className="font-bold">Shipping Information</p>

            {customerInfos?.shippingAddress ? (
              <Link href={`/checkout/shipping_infos`}>
                <div className="border rounded-lg p-2">
                  <p>Region: {customerInfos?.shippingAddress?.region}</p>
                  <p>city: {customerInfos?.shippingAddress?.city}</p>
                  <p>street: {customerInfos?.shippingAddress?.street}</p>
                </div>
              </Link>
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
            {/* <GoogleMapBox /> */}
          </div>
        </div>
        <div className="flex flex-col gap-3 my-2">
          <div>
            <p className="font-bold">Products Summary</p>

            <OrderSummary shippingPrice={shipping_price} />
          </div>

          <div>
            {customerInfos?.billingMethod ? (
              <div className="border rounded-lg p-2">
                <p className="font-bold">Payment Method</p>
                <p>{customerInfos?.billingMethod.methodType} - </p>
              </div>
            ) : (
              <Link href={`/checkout/billing_addresses`}>
                <div className="border rounded-lg p-2 cursor-pointer">
                  <p className="font-bold">Add Billing Information</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* <div>
        <OrderButton paymentMethod={customerInfos?.billingMethod?.methodType} />
      </div> */}
      <div onClick={saveCart} className="mt-4">
        <Link href={`/checkout/chat/${roomId}`}>
          <button className="bg-blue-600 w-full text-white px-4 py-2 rounded">
            Chat
          </button>
        </Link>
      </div>
    </div>
  );
};

export default CheckoutPage;
