// components/ChatWidget.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { db } from "@/utils/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useCart } from "@/app/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { TotalPrice } from "@/components/cart/Prices";
import { shippingPrice } from "@/components/cart/shipping";

interface ChatWidgetProps {
  user: { _id?: string; name: string } | null;
  roomId?: string;
}

interface Message {
  id: string;
  from: string;
  text: string;
  sentAt?: any;
}

export default function ChatWidget({
  user,
  roomId = "default-room",
}: ChatWidgetProps) {
  const { cart } = useCart();
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<any | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Save or update cart content in the room document
  useEffect(() => {
    async function saveCart() {
      try {
        if (!cart || Object.keys(cart).length === 0) return;
        const roomRef = doc(db, "chatRooms", roomId);
        await setDoc(
          roomRef,
          { cart, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (error) {
        console.log("Error saving cart:", error);
      }
    }
    saveCart();
  }, [cart, roomId]);

  const sendMessage = async () => {
    if (!draft.trim() || !user) return;
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
          name: user.name + user._id,
          from: user.name,
          to: "novaorizon",
          product: cart[0].name,
          lastMessage: draft,
          sentAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("🔥 Firestore write failed:", err);
    }

    setDraft("");
  };

  const updateMessage = async (id: string, newText: string) => {
    try {
      const msgDoc = doc(db, "chats", roomId, "messages", id);
      await updateDoc(msgDoc, { text: newText });
    } catch (err) {
      console.error("🔥 Firestore update failed:", err);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const msgDoc = doc(db, "chats", roomId, "messages", id);
      await deleteDoc(msgDoc);
    } catch (err) {
      console.error("🔥 Firestore delete failed:", err);
    }
  };

  useEffect(() => {
    async function fetchRoom() {
      if (!user) return;
      const roomsRef = collection(db, "chatRooms"); // use collection, not doc
      const q = query(
        roomsRef,
        where("roomId", "==", roomId),
        where("name", "==", user.name + user._id)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        snap.forEach((docSnap) => {
          setRoom({
            roomId: docSnap.id,
            ...(docSnap.data() as any),
          });
        });
      } else {
        console.log("No matching documents.");
      }
    }

    fetchRoom();

    const msgsRef = collection(db, "chats", roomId, "messages");
    const q = query(msgsRef, orderBy("sentAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Message[];
      setMessages(msgs);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    return () => unsubscribe();
  }, [roomId]);

  const shipping_price = shippingPrice();

  return (
    <div className="flex flex-col w-full  bg-white border rounded-xl p-4 space-y-3">
      {room?.cart && (
        <div className="mb-4 p-3 rounded-lg bg-gray-800 text-white shadow">
          <h3 className="font-semibold mb-1">Cart Summary</h3>
          <ul className="list-disc list-inside text-sm">
            {room.cart?.map((item: any, i: number) => (
              <li key={i} className="flex items-center gap-3">
                <Image
                  src={item.imageUrl}
                  width={100}
                  height={100}
                  alt="image"
                />
                <p>{item.name}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1 mt-2 font-bold">
            <p>Shipping Price: {shipping_price!.shippingPrice} CFA</p>
            <p>
              Total:{" "}
              <TotalPrice
                cart={cart}
                shippingPrice={shipping_price!.shippingPrice}
              />
            </p>
          </div>
        </div>
      )}
      <div className="flex-1 h-64 overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex w-full p-2 mb-2 ${
              user?.name === m.from ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs   ${
                user?.name === m.from ? " text-right" : " text-left"
              }`}
            >
              <div
                className={`flex flex-col gap-1 rounded-lg text-sm break-words p-2 ${
                  user?.name === m.from ? "bg-blue-100 " : "bg-gray-100 "
                }`}
              >
                <strong className="text-sm">{m.from}</strong>{" "}
                <div>
                  {m.text.startsWith("https") ? (
                    <Link href={m.text} className="text-blue-600">
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
                    className="text-blue-600 text-xs"
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
                    className="text-red-600 text-xs"
                    onClick={() => deleteMessage(m.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
      <div className="flex">
        <input
          className="flex-1 border rounded-l-lg px-3 py-2 text-sm focus:outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Votre message…"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="bg-blue-600 text-white px-4 rounded-r-lg text-sm hover:bg-blue-700"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}
