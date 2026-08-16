"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "@/app/context/CartContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserData } from "@/app/context/UserDataContext";
import OrderSummary from "@/components/cart/OrderSummary";
import { getShippingPrice } from "@/components/cart/shipping";
import { createOrUpdateOrder } from "@/app/actions/order";
import { IAddress } from "@/models/Address";
import { IPaymentMethod } from "@/models/PaymentMethod";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/utils/firebaseConfig";
import { toast } from "react-hot-toast";

export type CalcShippingPrice = {
  averageDeliveryTime: string;
  basePrice: number;
  region: string;
  shippingPrice: number;
};

const CheckoutPage = () => {
  const { user, addresses, paymentMethods, loading } = useUserData();
  const { cart } = useCart();
  const router = useRouter();

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [shippingPrice, setShippingPrice] = useState<CalcShippingPrice | null>(
    null,
  );
  const [shippingLoading, setShippingLoading] = useState<boolean>(false);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);

  // Generate order number and room ID
  useEffect(() => {
    const generateOrderNumber = (): string => {
      const datePart = new Date()
        .toISOString()
        .replace(/[-:ZT.]/g, "")
        .slice(0, 14);
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      return `ORD${datePart}${randomStr}`;
    };
    const newOrderNumber = generateOrderNumber();
    setOrderNumber(newOrderNumber);
    setRoomId(newOrderNumber);
  }, []);

  // Auto‑select default address or first
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.isDefault);
      setSelectedAddressId(
        defaultAddr
          ? defaultAddr._id?.toString()
          : (addresses[0]._id || addresses[0].id).toString(),
      );
    }
  }, [addresses, selectedAddressId]);

  // Auto‑select first payment method
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethodId) {
      setSelectedPaymentMethodId(
        (paymentMethods[0]._id || paymentMethods[0].id).toString(),
      );
    }
  }, [paymentMethods, selectedPaymentMethodId]);

  // Fetch shipping price when selected address changes
  useEffect(() => {
    const fetchShipping = async () => {
      if (!selectedAddressId) return;
      const address = addresses.find(
        (a) => a._id?.toString() === selectedAddressId,
      );
      if (!address) return;

      setShippingLoading(true);
      try {
        const region = address.state || address.city;
        const price = await getShippingPrice(region);
        setShippingPrice(price);
      } catch (error) {
        console.error("Error fetching shipping price:", error);
      } finally {
        setShippingLoading(false);
      }
    };

    fetchShipping();
  }, [selectedAddressId, addresses]);

  const selectedAddress = addresses.find(
    (a) => a._id?.toString() === selectedAddressId,
  );
  const selectedPaymentMethod = paymentMethods.find(
    (pm) => pm._id?.toString() === selectedPaymentMethodId,
  );

  // Save cart to Firestore for chat
  async function saveCart(): Promise<void> {
    try {
      if (!cart || Object.keys(cart).length === 0) return;
      const roomRef = doc(db, "chatRooms", roomId);
      await setDoc(
        roomRef,
        {
          cart,
          shipping_price: shippingPrice,
          updatedAt: serverTimestamp(),
          billingAddressId: selectedAddressId,
          paymentMethodId: selectedPaymentMethodId,
          userId: user?.id,
          email: user?.email,
          firstName: user?.firstName || user?.name?.split(" ")[0] || "",
          lastName:
            user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
        },
        { merge: true },
      );
    } catch (error) {
      console.log("Error saving cart:", error);
    }
  }

  const handlePayNow = async () => {
    // 1. Ensure orderNumber is set
    let finalOrderNumber = orderNumber;
    if (!finalOrderNumber) {
      const datePart = new Date()
        .toISOString()
        .replace(/[-:ZT.]/g, "")
        .slice(0, 14);
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      finalOrderNumber = `ORD${datePart}${randomStr}`;
      setOrderNumber(finalOrderNumber);
      setRoomId(finalOrderNumber);
    }

    // 2. Validate selections
    if (!selectedAddressId || !selectedPaymentMethodId || cart.length === 0) {
      toast.error(
        "Please select a billing address, a payment method, and ensure your cart is not empty.",
      );
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error("Selected payment method not found. Please choose again.");
      return;
    }

    // 3. Compute totals
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const shippingCost = shippingPrice?.shippingPrice || 0;
    const total = subtotal + shippingCost;

    // 4. Build clean order data (all primitive values)
    const orderData = {
      userId: user?.id || "",
      email: user?.email || "",
      firstName: user?.firstName || user?.name?.split(" ")[0] || "",
      lastName:
        user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
      products: cart.map((item) => ({
        productId: item.id, // ensure string
        name: item.name,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      tax: 0,
      shippingCost,
      total,
      paymentStatus: "pending",
      paymentMethod: selectedPaymentMethod.methodType,
      billingAddressId: selectedAddressId,
      paymentMethodId: selectedPaymentMethodId,
      billingAddress: {
        street: selectedAddress?.street || "",
        city: selectedAddress?.city || "",
        region: selectedAddress?.state || selectedAddress?.city || "",
        address: selectedAddress?.street + ", " + selectedAddress?.city || "",
        country: selectedAddress?.country || "",
      },
      shippingAddress: {
        street: selectedAddress?.street || "",
        city: selectedAddress?.city || "",
        region: selectedAddress?.state || selectedAddress?.city || "",
        address: selectedAddress?.street || "",
        country: selectedAddress?.country || "",
        carrier: "Novaorizon",
      },
    };

    setProcessing(true);
    try {
      console.log(`Creating order ${finalOrderNumber}...`);
      const result = await createOrUpdateOrder(
        finalOrderNumber,
        orderData as any,
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to create order");
      }

      // Navigate to payment page
      const paymentMethodParam = encodeURIComponent(
        selectedPaymentMethod.methodType,
      );
      router.push(
        `/checkout/payment?payment_ref=${finalOrderNumber}&paymentMethod=${paymentMethodParam}`,
      );
    } catch (error: any) {
      console.error("Pay Now error:", error.message || error);
      toast.error(error.message || "Failed to proceed to payment");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading checkout...</div>;
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        Please{" "}
        <Link href="/auth/login" className="text-blue-600 underline">
          sign in
        </Link>{" "}
        to checkout.
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="lg:flex lg:justify-between lg:items-start mb-6">
        <div className="flex flex-col gap-3 my-2">
          {/* Billing Address */}
          <div>
            <p className="font-bold">Billing Address</p>
            {addresses.length === 0 ? (
              <div className="border rounded-lg p-4 text-center">
                <p className="text-gray-600">You have no saved addresses.</p>
                <Link
                  href="/profile/address"
                  className="inline-block mt-2 text-blue-600 hover:underline"
                >
                  + Add a billing address
                </Link>
              </div>
            ) : (
              <div className="border rounded-lg p-3">
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {addresses.map((addr) => (
                    <option
                      key={addr._id?.toString()}
                      value={addr._id?.toString()}
                    >
                      {addr.label} – {addr.street}, {addr.city} (
                      {addr.postalCode})
                    </option>
                  ))}
                </select>
                {selectedAddress && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      {selectedAddress.street}, {selectedAddress.city},{" "}
                      {selectedAddress.state || ""} {selectedAddress.postalCode}
                      , {selectedAddress.country}
                    </p>
                  </div>
                )}
                <Link
                  href="/profile/address"
                  className="inline-block mt-2 text-blue-600 hover:underline text-sm"
                >
                  Manage addresses
                </Link>
              </div>
            )}
          </div>

          {/* Shipping Information */}
          <div>
            <p className="font-bold">Shipping Information</p>
            {selectedAddress ? (
              <div className="border rounded-lg p-2">
                <p>
                  Shipping to: {selectedAddress.street}, {selectedAddress.city},{" "}
                  {selectedAddress.country}
                </p>
                <p className="text-xs text-gray-500">Same as billing address</p>
              </div>
            ) : (
              <p className="text-gray-500">Please select a billing address.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 my-2">
          <div>
            <p className="font-bold">Products Summary</p>
            {shippingLoading ? (
              <p>Loading shipping cost...</p>
            ) : (
              <OrderSummary shippingPrice={shippingPrice} />
            )}
          </div>

          {/* Payment Method */}
          <div>
            <p className="font-bold">Payment Method</p>
            {paymentMethods.length === 0 ? (
              <div className="border rounded-lg p-4 text-center">
                <p className="text-gray-600">
                  You have no saved payment methods.
                </p>
                <Link
                  href="/profile/payment"
                  className="inline-block mt-2 text-blue-600 hover:underline"
                >
                  + Add a payment method
                </Link>
              </div>
            ) : (
              <div className="border rounded-lg p-3">
                <select
                  value={selectedPaymentMethodId}
                  onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm._id?.toString()} value={pm._id?.toString()}>
                      {pm.methodType} –{" "}
                      {pm.methodType === "CreditCard"
                        ? `**** ${(pm as any).details.cardNumber?.slice(-4) || "XXXX"}`
                        : pm.methodType === "MobileMoney"
                          ? `${(pm as any).details.provider} ${(pm as any).details.phoneNumber}`
                          : (pm as any).details.email || ""}
                    </option>
                  ))}
                </select>
                <Link
                  href="/profile/payment"
                  className="inline-block mt-2 text-blue-600 hover:underline text-sm"
                >
                  Manage payment methods
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        {/* "Pay Now" Button */}
        <button
          onClick={handlePayNow}
          disabled={
            !selectedAddressId ||
            !selectedPaymentMethodId ||
            cart.length === 0 ||
            shippingLoading ||
            processing
          }
          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition"
        >
          {processing ? "Processing..." : "Pay Now"}
        </button>

        {/* "Message to finalize order" Button (chat) */}
        <div onClick={saveCart} className="flex-1">
          <Link href={`/checkout/chat/${roomId}`}>
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
              disabled={
                !selectedAddressId ||
                !selectedPaymentMethodId ||
                cart.length === 0 ||
                shippingLoading
              }
            >
              Message to finalize order
            </button>
          </Link>
        </div>
      </div>

      {(!selectedAddressId || !selectedPaymentMethodId) && (
        <p className="text-sm text-red-500 mt-2">
          Please select both a billing address and a payment method.
        </p>
      )}
    </div>
  );
};

export default CheckoutPage;
