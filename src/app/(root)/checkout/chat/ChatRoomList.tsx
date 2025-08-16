"use client";
import { useEffect, useState } from "react";
import { db } from "@/utils/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useSession } from "next-auth/react";

interface ChatRoom {
  id: string;
  roomId: string;
  name?: string;
  from?: string;
  to?: string;
  cart?: any[];
  lastMessage?: string;
}

interface ChatRoomListProps {
  onSelectRoom: (roomId: string) => void;
}

export default function ChatRoomList({ onSelectRoom }: ChatRoomListProps) {
  const session = useSession();
  const user = session?.data?.user as any;
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isOpen, setIsOpen] = useState(true);

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
        ...(doc.data() as { roomId: string; name?: string }),
      }));
      setRooms(parsedRooms);
    });

    return () => unsubscribe();
  }, [user]);

  console.log("rooms:", rooms);

  return (
    <div className="p-2 lg:p-4 w-64 space-y-2 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-lg">Your Chats</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-blue-400 hover:underline"
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen &&
        (rooms.length === 0 ? (
          <p className="text-gray-400">No active chats for you.</p>
        ) : (
          rooms?.map((room) => (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room.roomId)}
              className="block w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              <p>{room?.to}</p>
              <p className="line-clamp-1 text-gray-400">
                {room?.cart?.[0].name}
              </p>
              <p className=" line-clamp-1">{room?.lastMessage}</p>
            </div>
          ))
        ))}
    </div>
  );
}
