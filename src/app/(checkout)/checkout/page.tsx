"use client";

import React, { useEffect, useState, useRef } from "react";
import { useCart } from "@/app/context/CartContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserData } from "@/app/context/UserDataContext";
import OrderSummary from "@/components/cart/OrderSummary";
import { createOrUpdateOrder } from "@/app/actions/order";
import { IAddress } from "@/models/Address";
import { IPaymentMethod } from "@/models/PaymentMethod";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/utils/firebaseConfig";
import { toast } from "react-hot-toast";
import { getCarriers, calculateShippingPrice } from "@/app/actions/carrier";
import { findProducts } from "@/app/actions/products";

// ---------- Types ----------
export type CalcShippingPrice = {
  averageDeliveryTime: string;
  basePrice: number;
  region: string;
  shippingPrice: number;
  carrierId?: string;
  carrierName?: string;
};

// Helper to check if carrier serves an address
function doesCarrierServeAddress(carrier: any, address: any): boolean {
  if (!address) return false;
  const addressStrings = [
    address.city,
    address.state,
    address.country,
    address.zipCode,
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase().trim());

  return carrier.regionsServed.some((regionObj: any) => {
    const region = regionObj.region.toLowerCase().trim();
    return addressStrings.some(
      (addrStr) => addrStr.includes(region) || region.includes(addrStr),
    );
  });
}

const CheckoutPage = () => {
  const { user, addresses, paymentMethods, loading } = useUserData();
  const { cart } = useCart();
  const router = useRouter();

  // ---------- Base state ----------
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);

  // ---------- Carrier & shipping state ----------
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("");
  const [availableCarriers, setAvailableCarriers] = useState<any[]>([]);
  const [carrierLoading, setCarrierLoading] = useState<boolean>(false);
  const [shippingPrice, setShippingPrice] = useState<CalcShippingPrice | null>(
    null,
  );
  const [shippingLoading, setShippingLoading] = useState<boolean>(false);

  // ---------- Product fetching for carrier detection ----------
  const [cartProducts, setCartProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  // ---------- Ref for synchronous processing lock ----------
  const processingRef = useRef(false);

  // Generate order number and room ID (unchanged)
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
      const defaultAddr: any = addresses.find((a) => a.isDefault);
      setSelectedAddressId(
        defaultAddr
          ? defaultAddr._id?.toString()
          : (addresses[0]._id || "").toString(),
      );
    }
  }, [addresses, selectedAddressId]);

  // Auto‑select first payment method
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethodId) {
      const firstPaymentMethod = paymentMethods[0] as IPaymentMethod & {
        _id?: string | { toString(): string };
        id?: string | { toString(): string };
      };
      const firstPaymentMethodId =
        firstPaymentMethod._id?.toString() || firstPaymentMethod.id?.toString();
      if (firstPaymentMethodId) {
        setSelectedPaymentMethodId(firstPaymentMethodId);
      }
    }
  }, [paymentMethods, selectedPaymentMethodId]);

  // ---------- Fetch product details from cart using findProducts ----------
  useEffect(() => {
    if (cart.length === 0) {
      setCartProducts([]);
      setAvailableCarriers([]);
      setSelectedCarrierId("");
      return;
    }

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const productIds = cart.map((item) => item.id);
        const products = await Promise.all(
          productIds.map((id) => findProducts(id)),
        );
        const normalized = products.map((p) => (Array.isArray(p) ? p[0] : p));
        setCartProducts(normalized);
      } catch (err) {
        console.error("Failed to load products:", err);
        toast.error("Could not load product details for shipping.");
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [cart]);

  // ---------- Compute common carriers from cart products ----------
  useEffect(() => {
    if (cartProducts.length === 0) {
      setAvailableCarriers([]);
      setSelectedCarrierId("");
      return;
    }

    const carrierSets = cartProducts
      .map((p) => (p.carrier ? p.carrier : []))
      .filter((arr) => arr.length > 0);

    if (carrierSets.length === 0) {
      setAvailableCarriers([]);
      setSelectedCarrierId("");
      return;
    }

    const commonCarrierIds = carrierSets.reduce((acc, arr) =>
      acc.filter((id: string) => arr.includes(id)),
    );

    if (commonCarrierIds.length === 0) {
      setAvailableCarriers([]);
      setSelectedCarrierId("");
      toast.error("No common carrier available for all items.");
      return;
    }

    const fetchCarriers = async () => {
      setCarrierLoading(true);
      try {
        const allCarriers = await getCarriers();
        const selectedAddress = addresses.find(
          (a: any) => a._id?.toString() === selectedAddressId,
        );
        const filtered = allCarriers
          .filter((c) => commonCarrierIds.includes(c._id))
          .filter((c) => doesCarrierServeAddress(c, selectedAddress));

        setAvailableCarriers(filtered);
        if (filtered.length > 0) {
          setSelectedCarrierId(filtered[0]._id);
        } else {
          setSelectedCarrierId("");
          toast("No carrier serves your region for these products.");
        }
      } catch (err) {
        console.error("Failed to fetch carriers:", err);
        toast.error("Could not load carrier options.");
      } finally {
        setCarrierLoading(false);
      }
    };

    fetchCarriers();
  }, [cartProducts, addresses, selectedAddressId]);

  // ---------- Calculate shipping when carrier or address changes ----------
  useEffect(() => {
    if (!selectedCarrierId || !selectedAddressId) {
      setShippingPrice(null);
      return;
    }

    const selectedAddress = addresses.find(
      (a: any) => a._id?.toString() === selectedAddressId,
    );
    if (!selectedAddress) return;

    const region = selectedAddress.state || selectedAddress.city;
    if (!region) return;

    setShippingLoading(true);
    calculateShippingPrice(selectedCarrierId, region)
      .then((result) => {
        setShippingPrice({
          ...result,
          carrierId: selectedCarrierId,
          carrierName: availableCarriers.find(
            (c) => c._id === selectedCarrierId,
          )?.name,
        });
      })
      .catch((err) => {
        console.error("Error calculating shipping:", err);
        toast.error("Failed to calculate shipping cost.");
      })
      .finally(() => setShippingLoading(false));
  }, [selectedCarrierId, selectedAddressId, addresses, availableCarriers]);

  // ---------- Build order data (includes carrierId) ----------
  const buildOrderData = (
    paymentMethod: string,
    paymentMethodId?: string,
  ): any => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const shippingCost = shippingPrice?.shippingPrice || 0;
    const total = subtotal + shippingCost;

    return {
      userId: user?.id || "",
      email: user?.email || "",
      firstName: user?.firstName || user?.name?.split(" ")[0] || "",
      lastName:
        user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
      products: cart.map((item) => ({
        productId: item.id,
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
      paymentMethod: paymentMethod,
      paymentMethodId: paymentMethodId || null,
      billingAddressId: selectedAddressId,
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
        carrier: shippingPrice?.carrierName || "",
      },
      carrierId: selectedCarrierId,
    };
  };

  // ----- Handlers (Pay Now & Cash on Delivery) -----
  const handlePayNow = async () => {
    // --- immediate guard ---
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

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

    if (!selectedAddressId || !selectedPaymentMethodId || cart.length === 0) {
      toast.error(
        "Please select a billing address, a payment method, and ensure your cart is not empty.",
      );
      processingRef.current = false;
      setProcessing(false);
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error("Selected payment method not found. Please choose again.");
      processingRef.current = false;
      setProcessing(false);
      return;
    }

    try {
      const orderData = buildOrderData(
        selectedPaymentMethod.methodType,
        selectedPaymentMethodId,
      );
      const result = await createOrUpdateOrder(finalOrderNumber, orderData);
      if (!result.success) {
        throw new Error(result.error || "Failed to create order");
      }

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
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const handleCashOnDelivery = async () => {
    // --- immediate guard ---
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

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

    if (!selectedAddressId || cart.length === 0) {
      toast.error(
        "Please select a billing address and ensure your cart is not empty.",
      );
      processingRef.current = false;
      setProcessing(false);
      return;
    }

    try {
      const orderData = buildOrderData("CashOnDelivery", undefined);
      orderData.paymentStatus = "pending";
      const result = await createOrUpdateOrder(finalOrderNumber, orderData);
      if (!result.success) {
        throw new Error(result.error || "Failed to create order");
      }
      router.push(
        `/checkout/payment?payment_ref=${finalOrderNumber}&paymentMethod=CashOnDelivery`,
      );
    } catch (error: any) {
      console.error("COD order error:", error.message || error);
      toast.error(error.message || "Failed to place order");
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  };

  // ---------- Render ----------
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

  const selectedAddress = addresses.find(
    (a: any) => a._id?.toString() === selectedAddressId,
  );
  const selectedPaymentMethod = paymentMethods.find(
    (pm: any) => pm._id?.toString() === selectedPaymentMethodId,
  );

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
                  {addresses.map((addr: any) => (
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

          {/* Shipping Information with Carrier Selection */}
          <div>
            <p className="font-bold">Shipping Information</p>
            {selectedAddress ? (
              <div className="border rounded-lg p-3 space-y-2">
                <p>
                  Shipping to: {selectedAddress.street}, {selectedAddress.city},{" "}
                  {selectedAddress.country}
                </p>
                {loadingProducts || carrierLoading ? (
                  <p className="text-sm text-gray-500">Loading carriers...</p>
                ) : availableCarriers.length === 0 ? (
                  <p className="text-sm text-red-500">
                    No carrier available for your region. Please update address
                    or contact support.
                  </p>
                ) : (
                  <div>
                    <label className="block text-sm font-medium">
                      Select Carrier
                    </label>
                    <select
                      value={selectedCarrierId}
                      onChange={(e) => setSelectedCarrierId(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      {availableCarriers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {shippingLoading && (
                  <p className="text-sm">Calculating shipping...</p>
                )}
                {shippingPrice && !shippingLoading && (
                  <p className="text-sm font-medium text-green-600">
                    Shipping: {shippingPrice.shippingPrice} CFA (est. delivery:{" "}
                    {shippingPrice.averageDeliveryTime})
                  </p>
                )}
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
                  {paymentMethods.map((pm: any) => (
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
        <button
          onClick={handlePayNow}
          disabled={
            !selectedAddressId ||
            !selectedPaymentMethodId ||
            cart.length === 0 ||
            shippingLoading ||
            processing ||
            availableCarriers.length === 0
          }
          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition"
        >
          {processing ? "Processing..." : "Pay Now"}
        </button>

        <button
          onClick={handleCashOnDelivery}
          disabled={
            !selectedAddressId ||
            cart.length === 0 ||
            shippingLoading ||
            processing ||
            availableCarriers.length === 0
          }
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition"
        >
          {processing ? "Placing order..." : "Cash on Delivery"}
        </button>
      </div>

      {!selectedAddressId && (
        <p className="text-sm text-red-500 mt-2">
          Please select a billing address to proceed.
        </p>
      )}
      {!selectedPaymentMethodId && (
        <p className="text-sm text-red-500 mt-2">
          Please select a payment method for online payment.
        </p>
      )}
      {availableCarriers.length === 0 &&
        !loadingProducts &&
        !carrierLoading && (
          <p className="text-sm text-red-500 mt-2">
            No carrier available. Please check your address or contact support.
          </p>
        )}
    </div>
  );
};

export default CheckoutPage;
