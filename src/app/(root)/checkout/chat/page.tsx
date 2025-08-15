// pages/checkout.jsx
"use client";
import ChatWidget from "@/app/(root)/checkout/_component/ChatWidget";
import { useUser } from "@/app/context/UserContext";
import { SignIn } from "@/components/auth/SignInButton";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import ChatRoomList from "./ChatRoomList";

export default function Checkout() {
  const { user } = useUser();
  if (!user) {
    return <SignIn />; // Redirect to sign-in if user is not authenticated
  }

  const searchParams = useSearchParams();
  const roomId = searchParams?.get("roomId") || "checkout-support";
  const [activeRoom, setActiveRoom] = useState("");

  return (
    <div className="flex flex-col lg:flex-row lg:mx-24 min-h-screen">
      {/* Sidebar */}
      <div className="lg:w-80 w-full border-b lg:border-b-0 lg:border-r border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">
          Active Chats
        </h2>
        <ChatRoomList onSelectRoom={setActiveRoom} />
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 bg-gray-50">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          <ChatWidget user={user} roomId={activeRoom ? activeRoom : roomId} />
        </div>
      </div>
    </div>
  );
}
