// app/chat/[roomId]/page.tsx (Chat Widget Page)
"use client";
import { useEffect, useState, useRef } from "react";
import { db } from "@/utils/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

interface Message {
  id: string;
  from: string;
  text: string;
  sentAt?: any;
}

export default function ChatWidgetPage() {
  const session = useSession();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  const user = session?.data?.user as any;

  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<any | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!draft.trim() || !user || !roomId) return;
    const newMsg = {
      from: user.name,
      text: draft.trim(),
      sentAt: serverTimestamp(),
    };

    try {
      const msgRef = collection(db, "chats", roomId, "messages");
      const roomRef = doc(db, "chatRooms", roomId);

      await addDoc(msgRef, newMsg);
      await setDoc(
        roomRef,
        {
          roomId,
          name: user.name + user.id,
          from: user.name,
          to: "novaorizon",
          lastMessage: draft,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Firestore write failed:", err);
    }

    setDraft("");
  };

  const updateMessage = async (id: string, newText: string) => {
    if (!roomId) return;
    try {
      const msgDoc = doc(db, "chats", roomId, "messages", id);
      await updateDoc(msgDoc, { text: newText });
    } catch (err) {
      console.error("Firestore update failed:", err);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!roomId) return;
    try {
      const msgDoc = doc(db, "chats", roomId, "messages", id);
      await deleteDoc(msgDoc);
    } catch (err) {
      console.error("Firestore delete failed:", err);
    }
  };

  // Add this useEffect to mark messages as read when component mounts
useEffect(() => {
  if (!user || !roomId) return;

  // Mark messages as read when entering the chat
  const markMessagesAsRead = async () => {
    try {
      const roomRef = doc(db, "chatRooms", roomId);
      await updateDoc(roomRef, {
        lastRead: serverTimestamp()
      });
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  markMessagesAsRead();
}, [user, roomId]);

  useEffect(() => {
    async function fetchRoom() {
      if (!user || !roomId) return;
      try {
        const roomRef = doc(db, "chatRooms", roomId);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
          setRoom({ id: roomSnap.id, ...roomSnap.data() });
        } else {
          console.log("No room found with ID:", roomId);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching room:", error);
        setLoading(false);
      }
    }

    fetchRoom();

    if (!roomId) return;

    const msgsRef = collection(db, "chats", roomId, "messages");
    const q = query(msgsRef, orderBy("sentAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Message[];
      setMessages(msgs);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [user, roomId]);

  if (session.status === "loading" || loading) {
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

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Chat Room Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The chat room you're looking for doesn't exist.
          </p>
          <Link
            href="/chat"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Chat Rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/checkout/chat"
              className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                NovaOrizon
              </h1>
            </div>
          </div>
          <Link
            href="/chat"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            All Chats
          </Link>
        </div>

        {/* Cart Summary */}
        {room?.cart && room.cart.length > 0 && (
          <div className="p-4 bg-gray-300 my-2 rounded-lg ">
            <h3 className="font-semibold mb-2 text-lg">Order Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-1">Items</h4>
                <ul className="text-sm">
                  {room.cart.map((item: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 mb-2">
                      <div className="relative w-10 h-10 rounded-md overflow-hidden">
                        <Image
                          src={item.imageUrl || "/placeholder-product.jpg"}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{item.name}</p>
                        <p className="text-gray-300">
                          {item.quantity} × {item.price} CFA
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-1">Summary</h4>
                <div className="text-sm space-y-1">
                  <p>
                    Shipping: {room?.shipping_price?.shippingPrice || 0} CFA
                  </p>
                  <p className="font-bold mt-2">
                    Total:{" "}
                    {room.cart.reduce(
                      (total: number, item: any) =>
                        total + item.price * item.quantity,
                      0
                    ) + (room?.shipping_price?.shippingPrice || 0)}{" "}
                    CFA
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 bg-gray-50 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="mx-auto h-12 w-12 mb-3"
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
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex w-full ${
                  user?.name === m.from ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs ${
                    user?.name === m.from ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`rounded-lg text-sm break-words p-3 ${
                      user?.name === m.from
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    <div className="font-medium text-xs mb-1">{m.from}</div>
                    <div>
                      {m.text.startsWith("https") ? (
                        <Link
                          href={m.text}
                          className="underline"
                          target="_blank"
                        >
                          {m.text}
                        </Link>
                      ) : (
                        m.text
                      )}
                    </div>
                  </div>

                  {user?.name === m.from && (
                    <div className="flex justify-end space-x-2 mt-1">
                      <button
                        className="text-blue-600 text-xs hover:underline"
                        onClick={() =>
                          updateMessage(
                            m.id,
                            prompt("Edit message:", m.text) || m.text
                          )
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 text-xs hover:underline"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this message?"
                            )
                          ) {
                            deleteMessage(m.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex rounded-lg overflow-hidden shadow-sm">
            <input
              className="flex-1 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 rounded-l-lg"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your message…"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              className="bg-blue-600 text-white px-6 py-3 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={sendMessage}
              disabled={!draft.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
