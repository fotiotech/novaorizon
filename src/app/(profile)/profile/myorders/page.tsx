"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { findOrders } from "@/app/actions/order";
import Spinner from "@/components/Spinner";

const MyOrders = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user: any = session?.user;
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }

    async function fetchOrders() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const result = await findOrders({ userId: user.id });
        setOrders(result.orders || []);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [session, user, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-semibold text-xl text-gray-800">My Orders</div>
          <Link
            href="/profile"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Back to Profile
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6">
        {orders.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <Link href={`/profile/myorders/${order.orderNumber}`}>
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
                    <div className="text-gray-600 mb-1">
                      Total: {order.total} CFA
                    </div>
                    <div className="text-sm text-gray-500">
                      Status: {order.orderStatus}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
                {order.paymentStatus !== "paid" && (
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
        )}
      </div>
    </div>
  );
};

export default MyOrders;