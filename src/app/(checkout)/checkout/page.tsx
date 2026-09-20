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
import PaymentModal from "./component/PaymentModal";

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

// ---------- Small UI atoms ----------
const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30";

const Section: React.FC<{
  step?: number;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ step, title, subtitle, action, children }) => (
  <section className="border-b border-border pb-6 last:border-0 last:pb-0">
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          {step !== undefined && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
              {step}
            </span>
          )}
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
    {children}
  </section>
);

const Field: React.FC<{
  label?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, className = "", children }) => (
  <div className={className}>
    {label && (
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
    )}
    {children}
  </div>
);

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

  // ---------- Payment modal state ----------
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<string>("");
  const [activePaymentRef, setActivePaymentRef] = useState<string>("");

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
      imageUrl: item.image || "",
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

  const selectedPaymentMethod = paymentMethods.find(
    (pm: any) => pm._id?.toString() === selectedPaymentMethodId,
  );

  const openPaymentModal = (method: string, ref: string) => {
    setActivePaymentMethod(method);
    setActivePaymentRef(ref);
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
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

      openPaymentModal(selectedPaymentMethod.methodType, finalOrderNumber);
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

      openPaymentModal("CashOnDelivery", finalOrderNumber);
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
      <div className="flex h-64 items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl p-3 md:py-12">
        <h1 className="mb-8 text-2xl font-bold text-foreground md:text-3xl">
          Checkout
        </h1>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-12">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-3">
            {/* Address */}
            <Section
              step={1}
              title={user ? "Billing address" : "Contact & address"}
              subtitle={
                user
                  ? "Where should we send your order?"
                  : "No account needed — we'll email your receipt."
              }
            >
              {!user && (
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <Field label="First name">
                    <input
                      value={guestForm.firstName}
                      onChange={(e) =>
                        setGuestForm((p) => ({
                          ...p,
                          firstName: e.target.value,
                        }))
                      }
                      placeholder="Jane"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      value={guestForm.lastName}
                      onChange={(e) =>
                        setGuestForm((p) => ({
                          ...p,
                          lastName: e.target.value,
                        }))
                      }
                      placeholder="Doe"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Email" className="md:col-span-2">
                    <input
                      type="email"
                      value={guestForm.email}
                      onChange={(e) =>
                        setGuestForm((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="jane@example.com"
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}

              {addresses.length === 0 || !user ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Street" className="md:col-span-2">
                    <input
                      value={guestForm.street}
                      onChange={(e) =>
                        setGuestForm((p) => ({ ...p, street: e.target.value }))
                      }
                      placeholder="123 Main St"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="City">
                    <input
                      value={guestForm.city}
                      onChange={(e) =>
                        setGuestForm((p) => ({ ...p, city: e.target.value }))
                      }
                      placeholder="Douala"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="State / Region">
                    <input
                      value={guestForm.state}
                      onChange={(e) =>
                        setGuestForm((p) => ({ ...p, state: e.target.value }))
                      }
                      placeholder="Littoral"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Country" className="md:col-span-2">
                    <input
                      value={guestForm.country}
                      onChange={(e) =>
                        setGuestForm((p) => ({ ...p, country: e.target.value }))
                      }
                      placeholder="Cameroon"
                      className={inputClass}
                    />
                  </Field>
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label="Saved address">
                    <select
                      value={selectedAddressId}
                      onChange={(e) => setSelectedAddressId(e.target.value)}
                      className={inputClass}
                    >
                      {addresses.map((addr: any) => (
                        <option
                          key={addr._id?.toString()}
                          value={addr._id?.toString()}
                        >
                          {addr.label} – {addr.street}, {addr.city}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {selectedAddress && (
                    <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      {selectedAddress.street}, {selectedAddress.city}
                      {selectedAddress.state
                        ? `, ${selectedAddress.state}`
                        : ""}
                      {selectedAddress.country
                        ? `, ${selectedAddress.country}`
                        : ""}
                    </div>
                  )}
                  <Link
                    href="/profile/address"
                    className="inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Manage addresses
                  </Link>
                </div>
              )}
            </Section>

            {/* Shipping */}
            <Section
              step={2}
              title="Shipping"
              subtitle="Select your preferred carrier."
            >
              {selectedAddress ? (
                <div className="space-y-3">
                  {loadingProducts || carrierLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner size={16} />
                      Loading carriers…
                    </div>
                  ) : availableCarriers.length === 0 ? (
                    <p className="rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      No carrier serves this region. Update your address or
                      contact support.
                    </p>
                  ) : (
                    <>
                      <Field label="Carrier">
                        <select
                          value={selectedCarrierId}
                          onChange={(e) => setSelectedCarrierId(e.target.value)}
                          className={inputClass}
                        >
                          {availableCarriers.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {shippingLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Spinner size={16} />
                          Calculating shipping…
                        </div>
                      ) : shippingPrice ? (
                        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                          <span className="text-muted-foreground">
                            Estimated delivery:{" "}
                            {shippingPrice.averageDeliveryTime}
                          </span>
                          <span className="font-semibold text-foreground">
                            {shippingPrice.shippingPrice} CFA
                          </span>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select an address above to see shipping options.
                </p>
              )}
            </Section>

            {/* Payment */}
            <Section
              step={3}
              title="Payment"
              subtitle={
                !user
                  ? "Guest checkout pays with cash on delivery."
                  : "Choose how you'd like to pay."
              }
            >
              {!user && paymentMethods.length === 0 ? (
                <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Cash on delivery is the only option for guest checkout.
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
                  <p className="text-muted-foreground">
                    You don't have any saved payment methods yet.
                  </p>
                  <Link
                    href="/profile/payment"
                    className="mt-1 inline-block font-medium text-primary hover:underline"
                  >
                    Add a payment method
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label="Saved method">
                    <select
                      value={selectedPaymentMethodId}
                      onChange={(e) =>
                        setSelectedPaymentMethodId(e.target.value)
                      }
                      className={inputClass}
                    >
                      {paymentMethods.map((pm: any) => (
                        <option
                          key={pm._id?.toString()}
                          value={pm._id?.toString()}
                        >
                          {pm.methodType} –{" "}
                          {pm.methodType === "CreditCard"
                            ? `•••• ${pm.details.cardNumber?.slice(-4) || "XXXX"}`
                            : pm.methodType === "MobileMoney"
                              ? `${pm.details.provider} ${pm.details.phoneNumber}`
                              : pm.details.email || ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Link
                    href="/profile/payment"
                    className="inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Manage payment methods
                  </Link>
                </div>
              )}
            </Section>
          </div>

          {/* Right column — order summary + actions */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <div className="rounded-xl bg-muted/30 p-5">
                <h2 className="mb-4 text-base font-semibold text-foreground">
                  Order summary
                </h2>
                {shippingLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner size={16} />
                    Calculating totals…
                  </div>
                ) : (
                  <OrderSummary shippingPrice={shippingPrice} />
                )}
              </div>

              <div className="mt-6 space-y-3">
                {!user ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleCashOnDelivery();
                    }}
                    disabled={
                      (!selectedAddressId && !guestAddressValid) ||
                      items.length === 0 ||
                      shippingLoading ||
                      processing ||
                      availableCarriers.length === 0
                    }
                    className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingAction === "cash-on-delivery"
                      ? "Placing order…"
                      : "Place order"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
                      className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingAction === "pay-now"
                        ? "Processing…"
                        : "Pay now"}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleCashOnDelivery();
                      }}
                      disabled={
                        !selectedAddressId ||
                        items.length === 0 ||
                        shippingLoading ||
                        processing ||
                        availableCarriers.length === 0
                      }
                      className="w-full rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingAction === "cash-on-delivery"
                        ? "Placing order…"
                        : "Cash on delivery"}
                    </button>
                  </>
                )}

                {/* Inline validation summary */}
                <div className="space-y-1 pt-1 text-xs">
                  {!user && !guestAddressValid && (
                    <p className="text-destructive">
                      Complete your contact and address details.
                    </p>
                  )}
                  {user && !selectedAddressId && (
                    <p className="text-destructive">
                      Select a billing address.
                    </p>
                  )}
                  {user && !selectedPaymentMethodId && (
                    <p className="text-destructive">Select a payment method.</p>
                  )}
                  {availableCarriers.length === 0 &&
                    !loadingProducts &&
                    !carrierLoading && (
                      <p className="text-destructive">
                        No carrier available for your region.
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={closePaymentModal}
        paymentMethod={activePaymentMethod}
        paymentRef={activePaymentRef}
      />
    </div>
  );
};

export default CheckoutPage;
