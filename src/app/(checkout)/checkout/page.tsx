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
import Spinner from "@/components/Spinner";

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
  const { items, subtotal, tax, discount } = useCart();
  const router = useRouter();

  // ---------- Base state ----------
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [processingAction, setProcessingAction] = useState<
    "pay-now" | "cash-on-delivery" | null
  >(null);

  // ---------- Carrier & shipping state ----------
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("");
  const [availableCarriers, setAvailableCarriers] = useState<any[]>([]);
  const [carrierLoading, setCarrierLoading] = useState<boolean>(false);
  const [shippingPrice, setShippingPrice] = useState<CalcShippingPrice | null>(
    null,
  );
  const [shippingLoading, setShippingLoading] = useState<boolean>(false);
  const getGuestIdentity = () => {
    if (typeof window === "undefined") return "";
    const guestId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("guestId="))
      ?.split("=")[1];
    const sessionId = localStorage.getItem("sessionId") || "";
    return guestId || sessionId;
  };
  const [guestForm, setGuestForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    country: "",
  });

  // ---------- Product fetching ----------
  const [cartProducts, setCartProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);

  // ---------- Ref for synchronous processing lock ----------
  const processingRef = useRef(false);

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

  // Auto‑select default address
  useEffect(() => {
    if (user && addresses.length > 0 && !selectedAddressId) {
      const defaultAddr: any = addresses.find((a) => a.isDefault);
      setSelectedAddressId(
        defaultAddr
          ? defaultAddr._id?.toString()
          : (addresses[0]._id || "").toString(),
      );
    }
  }, [addresses, selectedAddressId, user]);

  useEffect(() => {
    if (user) {
      setGuestForm((prev) => ({
        ...prev,
        firstName:
          user?.firstName || user?.name?.split(" ")[0] || prev.firstName,
        lastName:
          user?.lastName ||
          user?.name?.split(" ").slice(1).join(" ") ||
          prev.lastName,
        email: user?.email || prev.email,
      }));
    }
  }, [user]);

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

  // Fetch product details
  useEffect(() => {
    if (items.length === 0) {
      setCartProducts([]);
      setAvailableCarriers([]);
      setSelectedCarrierId("");
      return;
    }

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const productIds = items.map((item) => item.productId);
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
  }, [items]);

  // Compute common carriers from cart products
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

  // Calculate shipping
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

  const selectedAddress = addresses.find(
    (a: any) => a._id?.toString() === selectedAddressId,
  );

  // Build order data
  const addressData =
    user && selectedAddress
      ? {
          street: selectedAddress.street || "",
          city: selectedAddress.city || "",
          region: selectedAddress.state || selectedAddress.city || "",
          address: selectedAddress.street || "",
          country: selectedAddress.country || "",
        }
      : {
          street: guestForm.street || "",
          city: guestForm.city || "",
          region: guestForm.state || guestForm.city || "",
          address: guestForm.street || "",
          country: guestForm.country || "",
        };

  const guestAddressValid =
    !user &&
    guestForm.firstName &&
    guestForm.lastName &&
    guestForm.email &&
    guestForm.street &&
    guestForm.city &&
    guestForm.country;

  const buildOrderData = (
    paymentMethod: string,
    paymentMethodId?: string,
  ): any => {
    const shippingCost = shippingPrice?.shippingPrice || 0;
    const total = subtotal + tax - discount + shippingCost;

    const products = items.map((item) => ({
      productId: item.productId,
      name: item.name,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      userId: user?.id || null,
      email: user?.email || guestForm.email || "",
      firstName:
        user?.firstName ||
        user?.name?.split(" ")[0] ||
        guestForm.firstName ||
        "",
      lastName:
        user?.lastName ||
        user?.name?.split(" ").slice(1).join(" ") ||
        guestForm.lastName ||
        "",
      products,
      subtotal,
      tax,
      discount,
      shippingCost,
      total,
      paymentStatus: "pending",
      paymentMethod: paymentMethod,
      paymentMethodId: paymentMethodId || null,
      billingAddressId: selectedAddressId || null,
      billingAddress: {
        street: addressData.street,
        city: addressData.city,
        region: addressData.region,
        address: addressData.address,
        country: addressData.country,
      },
      shippingAddress: {
        street: addressData.street,
        city: addressData.city,
        region: addressData.region,
        address: addressData.address,
        country: addressData.country,
        carrier: shippingPrice?.carrierName || "",
      },
      carrierId: selectedCarrierId,
      orderStatus: "pending",
    };
  };

  // Handlers
  const handlePayNow = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setProcessingAction("pay-now");

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

    if (
      (!selectedAddressId && !guestAddressValid) ||
      !selectedPaymentMethodId ||
      items.length === 0
    ) {
      toast.error(
        "Please enter your guest details and address, select a payment method, and ensure your cart is not empty.",
      );
      processingRef.current = false;
      setProcessing(false);
      setProcessingAction(null);
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error("Selected payment method not found. Please choose again.");
      processingRef.current = false;
      setProcessing(false);
      setProcessingAction(null);
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
      setProcessingAction(null);
    }
  };

  const handleCashOnDelivery = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setProcessingAction("cash-on-delivery");

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

    if ((!selectedAddressId && !guestAddressValid) || items.length === 0) {
      toast.error(
        "Please enter your guest details and address, and ensure your cart is not empty.",
      );
      processingRef.current = false;
      setProcessing(false);
      setProcessingAction(null);
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
      setProcessingAction(null);
    }
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size={40} />
      </div>
    );
  }

  const selectedPaymentMethod = paymentMethods.find(
    (pm: any) => pm._id?.toString() === selectedPaymentMethodId,
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 border-b border-border pb-4">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column: Address, Shipping, Payment */}
          <div className="lg:col-span-3 space-y-6">
            {/* Contact + Billing Address */}
            <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {user ? "Billing Address" : "Guest Checkout"}
              </h2>

              {!user && (
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <input
                    value={guestForm.firstName}
                    onChange={(e) =>
                      setGuestForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    placeholder="First name"
                    className="w-full p-2 border border-input rounded-lg bg-background text-foreground"
                  />
                  <input
                    value={guestForm.lastName}
                    onChange={(e) =>
                      setGuestForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    placeholder="Last name"
                    className="w-full p-2 border border-input rounded-lg bg-background text-foreground"
                  />
                  <input
                    value={guestForm.email}
                    onChange={(e) =>
                      setGuestForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Email"
                    type="email"
                    className="md:col-span-2 w-full p-2 border border-input rounded-lg bg-background text-foreground"
                  />
                </div>
              )}

              {addresses.length === 0 || !user ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={guestForm.street}
                      onChange={(e) =>
                        setGuestForm((prev) => ({
                          ...prev,
                          street: e.target.value,
                        }))
                      }
                      placeholder="Street"
                      className="md:col-span-2 w-full p-2 border border-input rounded-lg bg-background text-foreground"
                    />
                    <input
                      value={guestForm.city}
                      onChange={(e) =>
                        setGuestForm((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder="City"
                      className="w-full p-2 border border-input rounded-lg bg-background text-foreground"
                    />
                    <input
                      value={guestForm.state}
                      onChange={(e) =>
                        setGuestForm((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                      placeholder="State / Region"
                      className="w-full p-2 border border-input rounded-lg bg-background text-foreground"
                    />
                    <input
                      value={guestForm.country}
                      onChange={(e) =>
                        setGuestForm((prev) => ({
                          ...prev,
                          country: e.target.value,
                        }))
                      }
                      placeholder="Country"
                      className="md:col-span-2 w-full p-2 border border-input rounded-lg bg-background text-foreground"
                    />
                  </div>
                  {!user && (
                    <p className="text-sm text-muted-foreground">
                      Guest checkout is enabled. You can place the order without
                      creating an account.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="w-full p-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
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
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>
                        {selectedAddress.street}, {selectedAddress.city},{" "}
                        {selectedAddress.state || ""}{" "}
                        {selectedAddress.postalCode}, {selectedAddress.country}
                      </p>
                    </div>
                  )}
                  <Link
                    href="/profile/address"
                    className="inline-block mt-2 text-primary hover:underline text-sm"
                  >
                    Manage addresses
                  </Link>
                </>
              )}
            </div>

            {/* Shipping Information */}
            <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Shipping Information
              </h2>
              {selectedAddress ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Shipping to: {selectedAddress.street},{" "}
                    {selectedAddress.city}, {selectedAddress.country}
                  </p>
                  {loadingProducts || carrierLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner size={20} />
                      Loading carriers...
                    </div>
                  ) : availableCarriers.length === 0 ? (
                    <p className="text-sm text-destructive">
                      No carrier available for your region. Please update
                      address or contact support.
                    </p>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Select Carrier
                      </label>
                      <select
                        value={selectedCarrierId}
                        onChange={(e) => setSelectedCarrierId(e.target.value)}
                        className="w-full p-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner size={16} />
                      Calculating shipping...
                    </div>
                  )}
                  {shippingPrice && !shippingLoading && (
                    <p className="text-sm font-medium text-secondary-foreground bg-secondary/10 p-2 rounded-lg">
                      Shipping: {shippingPrice.shippingPrice} CFA (est.
                      delivery: {shippingPrice.averageDeliveryTime})
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Please select a billing address.
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Payment Method
              </h2>
              {!user && paymentMethods.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    Guest checkout is available with cash on delivery.
                  </p>
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    You have no saved payment methods.
                  </p>
                  <Link
                    href="/profile/payment"
                    className="inline-block mt-2 text-primary hover:underline"
                  >
                    + Add a payment method
                  </Link>
                </div>
              ) : (
                <>
                  <select
                    value={selectedPaymentMethodId}
                    onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                    className="w-full p-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    {paymentMethods.map((pm: any) => (
                      <option
                        key={pm._id?.toString()}
                        value={pm._id?.toString()}
                      >
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
                    className="inline-block mt-2 text-primary hover:underline text-sm"
                  >
                    Manage payment methods
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right column: Order Summary & actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-muted/20 border border-border rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Order Summary
              </h2>
              {shippingLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner size={20} />
                  Calculating totals...
                </div>
              ) : (
                <OrderSummary shippingPrice={shippingPrice} />
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!user ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void handleCashOnDelivery();
                  }}
                  disabled={
                    (!selectedAddressId && !guestAddressValid) ||
                    items.length === 0 ||
                    shippingLoading ||
                    processing ||
                    availableCarriers.length === 0
                  }
                  className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                >
                  {processingAction === "cash-on-delivery"
                    ? "Placing order..."
                    : "Continue as Guest"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handlePayNow();
                    }}
                    disabled={
                      !selectedAddressId ||
                      !selectedPaymentMethodId ||
                      items.length === 0 ||
                      shippingLoading ||
                      processing ||
                      availableCarriers.length === 0
                    }
                    className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                  >
                    {processingAction === "pay-now"
                      ? "Processing..."
                      : "Pay Now"}
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleCashOnDelivery();
                    }}
                    disabled={
                      !selectedAddressId ||
                      items.length === 0 ||
                      shippingLoading ||
                      processing ||
                      availableCarriers.length === 0
                    }
                    className="w-full bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-secondary/90 disabled:opacity-50 transition shadow-sm"
                  >
                    {processingAction === "cash-on-delivery"
                      ? "Placing order..."
                      : "Cash on Delivery"}
                  </button>
                </>
              )}
            </div>

            {/* Validation messages */}
            <div className="space-y-1 text-sm">
              {!user && !guestAddressValid && (
                <p className="text-destructive">
                  Please complete your guest contact and address details.
                </p>
              )}
              {!user && !selectedPaymentMethodId && !paymentMethods.length && (
                <p className="text-destructive">
                  Guest checkout uses cash on delivery.
                </p>
              )}
              {user && !selectedAddressId && (
                <p className="text-destructive">
                  Please select a billing address.
                </p>
              )}
              {user && !selectedPaymentMethodId && (
                <p className="text-destructive">
                  Please select a payment method for online payment.
                </p>
              )}
              {availableCarriers.length === 0 &&
                !loadingProducts &&
                !carrierLoading && (
                  <p className="text-destructive">
                    No carrier available. Please check your address or contact
                    support.
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
