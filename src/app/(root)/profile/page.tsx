"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSession } from "next-auth/react";
import { SignOut } from "@/components/auth/SignInButton";
import { findOrders } from "@/app/actions/order";

const Profile = () => {
  const session = useSession();
  const user = session?.data?.user as any;
  const [orders, setOrders] = React.useState<any>([]);

  useEffect(() => {
    async function fetchOrders() {
      const response = await findOrders(undefined, user?._id);
      setOrders(response);
    }
    fetchOrders();
  }, [user?._id]);
  return (
    <>
      <div className="flex justify-between items-center p-2 ">
        <div className="font-semibold text-lg">Profile</div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher /> <p>Currency</p>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-center mb-6">Your Orders</h2>
        <div className="max-w-2xl mx-auto">
          {orders.length > 0 ? (
            <ul className="p-2  lg:space-y-4 whitespace-nowrap overflow-x-auto">
              {orders.map((order: any) => (
                <li
                  key={order._id}
                  className="p-4 mx-2 bg-white rounded-lg shadow inline-block"
                >
                  <Link href={`/checkout/order/${order._id}`}>
                    <div className="font-bold">Order #{order.orderNumber}</div>
                    <div>Total: {order.total} cfa</div>
                    <div>Status: {order.paymentStatus}</div>
                  </Link>
                  {order.status !== "paid" && (
                    <Link
                      href={`/checkout/payment?payment_ref=${order.orderNumber}&paymentMethod=${order.paymentMethod}`}
                      className="text-blue-600 hover:underline mt-2"
                    >
                      Complete Payment
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center">No order yet.</p>
          )}
        </div>
      </div>
      <ul className="flex flex-col gap-2 p-2">
        <li className="p-2 rounded-lg bg-gray-300">
          Welcome,
          <span className="font-bold ml-1">{session?.data?.user?.email}</span>!
        </li>
        <Link href={"/checkout/chat"}>
          <li className="p-2 rounded-lg bg-gray-300">Chats</li>
        </Link>
        <Link href={"/checkout/billing_addresses"}>
          <li className="p-2 rounded-lg bg-gray-300">Billing Addresses</li>
        </Link>
        {user?.role === "admin" ? (
          <Link href={`/admin`}>
            <li className="p-2 rounded-lg bg-gray-300">Admin Panel</li>
          </Link>
        ) : (
          ""
        )}
        <li className="mt-20 bg-red-300 p-2 rounded-lg">
          <SignOut />
        </li>
      </ul>
    </>
  );
};

export default Profile;
