import { findCustomer } from "@/app/actions/customer";
import { generatePaymentLink } from "@/app/actions/monetbil_payment";
import { useCart } from "@/app/context/CartContext";
import { useUser } from "@/app/context/UserContext";
import { CartItem } from "@/app/reducer/cartReducer";
import { Customer, MonetbilPaymentRequest } from "@/constant/types";
import React, { useEffect, useState } from "react";

function MonetbilPayment({orderNumber}:{orderNumber:string}) {
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const { cart } = useCart();
  const { user } = useUser();
  const [customer, setCustomer] = useState<Customer>();
  const [operator, setOperator] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const calculateTotal = (cartItems: CartItem[]) => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  useEffect(() => {
    async function getCustomer() {
      if (user?._id) {
        const response = await findCustomer(user._id);
        setCustomer(response);
      }
    }
    getCustomer();
  }, [user]);

  const fetchPaymentLink = async (selectedOperator: string) => {
    setOperator(selectedOperator);
    setLoading(true);

    const paymentData: MonetbilPaymentRequest = {
      serviceKey: process.env.NEXT_PUBLIC_MONETBIL_KEY as string,
       orderNumber,
      amount: calculateTotal(cart),
      phone: customer?.billingAddress.phone,
      user: user?.name,
      firstName: customer?.billingAddress.firstName,
      lastName: customer?.billingAddress.lastName,
      email: customer?.billingAddress.email,
      operator: selectedOperator,
      returnUrl: `${process.env.NEXT_PUBLIC_API_URL}/checkout/payment/success`,
      notifyUrl: `${process.env.NEXT_PUBLIC_API_URL}/checkout/payment/notification`,
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

  return (
    <div className="flex justify-center items-center mt-8 bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-center mb-6">Pay with Mobile Money</h2>
        <div className="flex flex-col gap-4">
          {operators.map(({ code, name }) => (
            <button
              key={code}
              onClick={() => fetchPaymentLink(code)}
              disabled={loading}
              className={`w-full border rounded-lg p-3 text-left transition-all duration-300 ${
                operator === code ? "bg-blue-100 border-blue-500" : "hover:bg-gray-100"
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
            <p className="text-sm text-gray-400">Select an operator to continue</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonetbilPayment;