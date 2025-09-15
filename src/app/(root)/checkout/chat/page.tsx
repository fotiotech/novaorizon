// app/chat/page.tsx (Chat Room List Page)
"use client";
import { useEffect, useState } from "react";
import { db } from "@/utils/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ChatRoom {
  id: string;
  roomId: string;
  name?: string;
  from?: string;
  to?: string;
  cart?: any[];
  lastMessage?: string;
}

export default function ChatRoomListPage() {
  const session = useSession();
  const router = useRouter();
  const user = session?.data?.user as any;
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const roomsRef = collection(db, "chatRooms");
    const roomsQuery = query(
      roomsRef,
      where("name", "==", user?.name + user?.id)
    );

    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const parsedRooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        roomId: doc.id,
        ...doc.data(),
      }));
      setRooms(parsedRooms);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteRoom = async (roomId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this chat room? All messages will be lost."
      )
    )
      return;

    try {
      // Delete the chat room document
      await deleteDoc(doc(db, "chatRooms", roomId));

      // Note: In a production app, you might also want to delete all messages in the room
      // This would require additional logic to delete the subcollection

      console.log("Chat room deleted successfully");
    } catch (error) {
      console.error("Error deleting chat room:", error);
      alert("Failed to delete chat room");
    }
  };

  if (session.status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Your Chat Rooms
              </h1>
              <p className="text-gray-600">
                Select a chat to continue conversation
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
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
              </div>
              <p className="text-gray-500">No active chats yet.</p>
              <p className="text-gray-400 text-sm mt-2">
                Start a new conversation from your cart or orders.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 hover:bg-blue-50 transition-colors duration-200 flex justify-between items-center"
                >
                  <Link
                    href={`/chat/${room.roomId}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-medium text-gray-900 truncate">
                          {room.to || "NovaOrizon Support"}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          Last message: {room.lastMessage || "No messages yet"}
                        </p>
                        {room.cart && room.cart.length > 0 && (
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <svg
                              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>{room.cart.length} items in cart</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={() => handleDeleteRoom(room.roomId)}
                    className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete chat room"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
