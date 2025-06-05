"use client";
import React, { FC, ReactNode, useState, useEffect, useCallback } from "react";
import { findCustomer, updateShippingInfos } from "@/app/actions/customer";
import { useUser } from "@/app/context/UserContext";
import { Customer } from "@/constant/types";
import { createOrUpdateOrder } from "@/app/actions/order";
import { useCart } from "@/app/context/CartContext";
import { CartItem } from "@/app/reducer/cartReducer";
import { calculateShippingPrice } from "@/app/actions/carrier";
import { triggerNotification } from "@/app/actions/notifications";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export type CalcShippingPrice = {
  averageDeliveryTime: string;
  basePrice: number;
  region: string;
  shippingPrice: number;
};

interface Product {
  _id: string;
  identification_branding?: { name?: string };
  media_visuals?: { main_image?: string };
  pricing_availability?: { price?: number };
}

interface CheckoutProps {
  width?: string;
  height?: string;
  bgColor?: string;
  textColor?: string;
  product?: Product;
  children: ReactNode;
}

const DEFAULT_CARRIER_ID = "675eeda75a81d16c81aca736";

const CheckoutButton: FC<CheckoutProps> = ({
  width = "w-44",
  height = "h-10",
  bgColor = "bg-[#00002a]",
  textColor = "text-white",
  product,
  children,
}) => {
  const { user, customerInfos } = useUser();
  const { dispatch, cart } = useCart();
  const router = useRouter();

  const [orderNumber, setOrderNumber] = useState<string>("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isOrderPlaced, setIsOrderPlaced] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [shippingPrice, setShippingPrice] = useState<CalcShippingPrice | null>(
    null
  );
  const [hasAddedProduct, setHasAddedProduct] = useState<boolean>(false);

  // Generate order number once
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
    setOrderNumber(generateOrderNumber());
  }, []);

  // Fetch customer data
  useEffect(() => {
    if (!user?._id) return;
    const customerData = async () => {
      try {
        const found = await findCustomer(user._id as string);
        if (found) setCustomer(found);
      } catch (err) {
        console.error("Error fetching customer:", err);
      }
    };
    customerData();
  }, [user?._id]);

  // Update shipping infos when checkbox changes
  useEffect(() => {
    if (!user?._id) return;
    // Assuming `shippingAddressCheck` is always true when meant to update
    const updateInfo = async () => {
      try {
        await updateShippingInfos(user._id as string, true);
      } catch (err) {
        console.error("Error updating shipping info:", err);
      }
    };
    updateInfo();
  }, [user?._id]);

  // Fetch shipping price when region changes
  useEffect(() => {
    if (!customerInfos?.shippingAddress?.region) return;
    const fetchCarrier = async () => {
      try {
        const res = await calculateShippingPrice(
          DEFAULT_CARRIER_ID,
          customerInfos.shippingAddress.region,
          0
        );
        setShippingPrice(res ?? null);
      } catch (err) {
        console.error("Error calculating shipping price:", err);
      }
    };
    fetchCarrier();
  }, [customerInfos?.shippingAddress?.region]);

  // Prevent placing an order if required info is missing
  const canPlaceOrder = (): boolean => {
    return (
      !!customer &&
      !!orderNumber &&
      !!customerInfos?.billingMethod?.methodType &&
      !!customerInfos?.shippingAddress
    );
  };

  const calculateTotal = (items: CartItem[]) => {
    return items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );
  };

  const handleOrderData = useCallback(async (): Promise<boolean> => {
    if (!canPlaceOrder()) {
      if (!customerInfos?.billingMethod?.methodType) {
        router.push(`/checkout/billing_addresses`);
      } else if (!customerInfos?.shippingAddress) {
        router.push(`/checkout/shipping_infos`);
      }
      return false;
    }

    const processingDays = 3;
    const transitDays = 5;
    const now = new Date();
    const estimatedShippingDate = new Date(now);
    estimatedShippingDate.setDate(now.getDate() + processingDays);
    const estimatedDeliveryDate = new Date(estimatedShippingDate);
    estimatedDeliveryDate.setDate(
      estimatedShippingDate.getDate() + transitDays
    );

    const subtotal = calculateTotal(cart);
    const shippingCost = shippingPrice?.shippingPrice ?? 0;
    const tax = 0;
    const total = subtotal + shippingCost + tax;

    try {
      const res = await createOrUpdateOrder(orderNumber, {
        userId: user?._id ?? "",
        email: customer!.billingAddress?.email ?? "",
        firstName: customer!.billingAddress?.firstName ?? "",
        lastName: customer!.billingAddress?.lastName ?? "",
        products: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        tax,
        shippingCost,
        total,
        paymentStatus: "pending",
        transactionId: Math.random().toString(36).substring(2, 8).toUpperCase(),
        paymentMethod: customerInfos!.billingMethod!.methodType,
        shippingAddress: {
          street: customerInfos!.shippingAddress!.street ?? "",
          region: customerInfos!.shippingAddress!.region ?? "",
          city: customerInfos!.shippingAddress!.city ?? "",
          state: customerInfos!.shippingAddress!.state ?? "",
          carrier: customerInfos!.shippingAddress!.carrier ?? "",
          postalCode: customerInfos!.shippingAddress!.postalCode ?? "",
          country: customerInfos!.shippingAddress!.country ?? "",
        },
        shippingStatus: "pending",
        shippingDate: estimatedShippingDate,
        deliveryDate: estimatedDeliveryDate,
        orderStatus: "processing",
        notes: "",
        couponCode: "",
        discount: 0,
      });

      return Boolean(res);
    } catch (err) {
      console.error("Error creating/updating order:", err);
      return false;
    }
  }, [
    cart,
    customer,
    customerInfos,
    orderNumber,
    shippingPrice,
    user?._id,
    router,
  ]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!orderNumber || isOrderPlaced || isSubmitting) return;

    // 1) Add the product to cart if provided (and not already added)
    if (product && !hasAddedProduct) {
      dispatch({
        type: "ADD_ITEM",
        payload: {
          id: product._id,
          name: product.identification_branding?.name ?? "",
          imageUrl: product.media_visuals?.main_image ?? "",
          price: product.pricing_availability?.price ?? 0,
          quantity: 1,
        },
      });
      setHasAddedProduct(true);
    }

    // 2) Continue with order creation
    setIsSubmitting(true);
    const success = await handleOrderData();
    setIsSubmitting(false);

    if (!success) {
      alert("Failed to place order. Please try again.");
      return;
    }

    setIsOrderPlaced(true);
    if (user?._id) {
      triggerNotification(user._id, `${user.name} placed an order!`).catch(
        (err) => console.error(err)
      );
    }
  };

  useEffect(() => {
    if (isOrderPlaced) {
      router.push(`/checkout?orderNumber=${encodeURIComponent(orderNumber)}`);
    }
  }, [isOrderPlaced, orderNumber, router]);

  const isDisabled =
    !orderNumber || !canPlaceOrder() || isOrderPlaced || isSubmitting;

  return (
    <button
      title="Check Out"
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`${width} ${height} ${bgColor} ${textColor} 
        mx-auto rounded-lg shadow-lg font-semibold flex 
        items-center justify-center p-2 ${
          isDisabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
        }`}
    >
      {isSubmitting ? "Processing..." : children}
    </button>
  );
};

export default CheckoutButton;
