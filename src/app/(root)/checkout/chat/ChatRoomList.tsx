"use client";
import { useEffect, useState } from "react";
import { db } from "@/utils/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useUser } from "@/app/context/UserContext";

interface ChatRoom {
  roomId: string;
  name?: string;
  from?: string;
  to?: string;
  product?: string;
  lastMessage?: string;
}

interface ChatRoomListProps {
  onSelectRoom: (roomId: string) => void;
}

export default function ChatRoomList({ onSelectRoom }: ChatRoomListProps) {
  const { user } = useUser();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!user?.name) return;

    const roomsRef = collection(db, "chatRooms");
    const roomsQuery = query(
      roomsRef,
      where("name", "==", user.name + user._id)
    );

    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const parsedRooms = snapshot.docs.map((doc) => ({
        roomId: doc.id,
        ...(doc.data() as { name?: string }),
      }));
      setRooms(parsedRooms);
    });

    return () => unsubscribe();
  }, [user]);

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
          rooms.map((room) => (
            <div
              key={room.roomId}
              onClick={() => onSelectRoom(room.roomId)}
              className="block w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              <p>{room.to}</p>
              <p className="line-clamp-1 text-gray-400">{room.product}</p>
              <p>{room.lastMessage}</p>
            </div>
          ))
        ))}
    </div>
  );
}
