"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSession } from "next-auth/react";
import { SignOut } from "@/components/auth/SignInButton";
import { findOrders } from "@/app/actions/order";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

const Profile = () => {
  const { data: session, status } = useSession();
  const user: any = session?.user;
  const router = useRouter();
  const [orders, setOrders] = useState<any>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    async function fetchOrders() {
      if (!user?.id) return null;
      setLoadingOrders(true);
      try {
        const response = await findOrders(undefined, user.id);
        setOrders(response);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoadingOrders(false);
      }
    }
    fetchOrders();
  }, [session, user, status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-semibold text-xl text-gray-800">Profile</div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="hidden sm:block px-3 py-1 bg-gray-100 rounded-full text-sm">
              Currency
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content - Orders */}
          <div className="lg:w-2/3">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Your Orders
            </h2>

            {loadingOrders ? (
              <div className="flex justify-center items-center h-40">
                <Spinner />
              </div>
            ) : orders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((order: any) => (
                  <div
                    key={order._id}
                    className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow"
                  >
                    <Link href={`/checkout/order/${order._id}`}>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold text-lg text-gray-800">
                            Order #{order.orderNumber}
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              order.paymentStatus === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                        <div className="text-gray-600 mb-2">
                          Total: {order.total} CFA
                        </div>
                      </div>
                    </Link>
                    {order.status !== "paid" && (
                      <div className="px-5 pb-5">
                        <Link
                          href={`/checkout/payment?payment_ref=${order.orderNumber}&paymentMethod=${order.paymentMethod}`}
                          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          Complete Payment
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">No orders yet</p>
                <Link
                  href="/products"
                  className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Browse products
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar - Profile Menu */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center">
                  <div className="bg-blue-100 text-blue-800 rounded-full h-12 w-12 flex items-center justify-center font-bold text-lg mr-3">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Welcome back!</p>
                    <p className="text-gray-600 text-sm truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <Link
                  href={`/checkout/chat?roomId=`}
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span className="text-gray-700 group-hover:text-blue-600">
                    Chats
                  </span>
                </Link>

                <Link
                  href="/checkout/billing_addresses"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span className="text-gray-700 group-hover:text-blue-600">
                    Billing Addresses
                  </span>
                </Link>

                {user?.role === "admin" && (
                  <Link
                    href="/admin"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-gray-700 group-hover:text-blue-600">
                      Admin Panel
                    </span>
                  </Link>
                )}

                <div className="pt-4 mt-4 border-t border-gray-100">
                  <div className="p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-red-700">
                    <SignOut />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
