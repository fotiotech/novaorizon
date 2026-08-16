import { findOrders } from "@/app/actions/order";
import { generatePaymentLink } from "@/app/actions/monetbil_payment";
import { useCart } from "@/app/context/CartContext";
import { useUserData } from "@/app/context/UserDataContext";
import { CartItem } from "@/app/reducer/cartReducer";
import { MonetbilPaymentRequest } from "@/constant/types";
import React, { useEffect, useState } from "react";

interface MonetbilPaymentProps {
  payment_ref?: string;
  orderTotal?: number; // optionally passed from checkout if order not yet created
}

function MonetbilPayment({ payment_ref, orderTotal }: MonetbilPaymentProps) {
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const { cart } = useCart();
  const { user, addresses, paymentMethods } = useUserData(); // new context
  const [operator, setOperator] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [order, setOrder] = useState<any>(null);

  // Generate a fallback order number if none provided
  useEffect(() => {
    const generateOrderNumber = () => {
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
    if (!payment_ref) {
      setOrderNumber(generateOrderNumber());
    }
  }, [payment_ref]);

  // Fetch order if payment_ref exists
  useEffect(() => {
    async function fetchOrder() {
      if (payment_ref) {
        const response = await findOrders(payment_ref);
        if (response) {
          const order = Array.isArray(response) ? response[0] : response;
          setOrder(order);
          // If order has an orderNumber, use it
          if (order?.orderNumber) {
            setOrderNumber(order.orderNumber);
          }
        }
      }
    }
    fetchOrder();
  }, [payment_ref]);

  // Calculate total from cart (fallback)
  const calculateTotal = (cartItems: CartItem[]) => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  };

  // Determine the total amount to pay
  const amount = order?.total ?? orderTotal ?? calculateTotal(cart);

  // Extract billing details from order or fallback to user/address
  const getBillingDetails = () => {
    // If order exists, use its embedded billingAddress
    if (order?.billingAddress) {
      return {
        phone: order.paymentMethodId.details.phoneNumber || "",
        firstName:
          order.billingAddress.firstName ||
          user?.firstName ||
          user?.name?.split(" ")[0] ||
          "",
        lastName:
          order.billingAddress.lastName ||
          user?.lastName ||
          user?.name?.split(" ").slice(1).join(" ") ||
          "",
        email: order.billingAddress.email || user?.email || "",
      };
    }

    return {
      phone: order.paymentMethodId.details.phoneNumber || "",
      firstName: user?.firstName || user?.name?.split(" ")[0] || "",
      lastName:
        user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
    };
  };

  const billing = getBillingDetails();

  const fetchPaymentLink = async (selectedOperator: string) => {
    setOperator(selectedOperator);
    setLoading(true);

    // Build payment request
    const paymentData: MonetbilPaymentRequest = {
      serviceKey: process.env.NEXT_PUBLIC_MONETBIL_KEY as string,
      orderNumber: orderNumber,
      amount: amount,
      phone: billing.phone,
      user: user?.name || billing.firstName,
      firstName: billing.firstName,
      lastName: billing.lastName,
      email: billing.email,
      operator: selectedOperator,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/payment/success`,
      notifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/payment/notification`,
    };

    try {
      const link = await generatePaymentLink(paymentData);
      setPaymentLink(link);
    } catch (error) {
      console.error("Failed to generate payment link", error);
    } finally {
      setLoading(false);
    }
  };

  const operators = [
    { code: "CM_ORANGEMONEY", name: "Orange Cameroun S.A" },
    { code: "CM_MTNMOBILEMONEY", name: "MTN Cameroon Ltd" },
    { code: "CM_EUMM", name: "EXPRESS UNION FINANCE" },
  ];

  // Show error if phone is missing
  if (!billing.phone) {
    return (
      <div className="flex justify-center items-center mt-8 bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-6 text-center">
          <p className="text-red-600">
            Phone number is required for mobile money payment. Please update
            your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center mt-8 bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Pay with Mobile Money
        </h2>
        <p className="text-sm text-gray-600 text-center mb-4">
          Amount: {amount} CFA
        </p>
        <div className="flex flex-col gap-4">
          {operators.map(({ code, name }) => (
            <button
              key={code}
              onClick={() => fetchPaymentLink(code)}
              disabled={loading}
              className={`w-full border rounded-lg p-3 text-left transition-all duration-300 ${
                operator === code
                  ? "bg-blue-100 border-blue-500"
                  : "hover:bg-gray-100"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="mt-6 text-center">
          {loading ? (
            <p className="text-gray-500">Generating payment link...</p>
          ) : paymentLink ? (
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full"
            >
              <button
                title="Pay Now"
                type="button"
                className="bg-blue-600 text-white w-full p-3 rounded-lg hover:bg-blue-700 transition-all"
              >
                Pay Now
              </button>
            </a>
          ) : (
            <p className="text-sm text-gray-400">
              Select an operator to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonetbilPayment;
