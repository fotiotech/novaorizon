// hooks/useUnreadMessages.ts
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/utils/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";

export function useUnreadMessages() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const roomsRef = collection(db, "chatRooms");
    const roomsQuery = query(
      roomsRef,
      where("name", "==", user?.name + user?.id)
    );

    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      let total = 0;
      const roomUnsubscribes: (() => void)[] = [];

      snapshot.docs.forEach((roomDoc) => {
        const room:any = { id: roomDoc.id, ...roomDoc.data() };
        const messagesRef = collection(db, "chats", room.id, "messages");
        const messagesQuery = query(messagesRef, orderBy("sentAt", "asc"));

        const messageUnsubscribe = onSnapshot(
          messagesQuery,
          (messageSnapshot) => {
            const messages = messageSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            const lastReadTime = room.lastRead?.toDate?.() || new Date(0);
            const unreadCount = messages.filter((message: any) => {
              const messageTime = message.sentAt?.toDate?.() || new Date(0);
              return message.from !== user.name && messageTime > lastReadTime;
            }).length;

            total += unreadCount;
            setTotalUnread(total);
          }
        );

        roomUnsubscribes.push(messageUnsubscribe);
      });

      return () => {
        roomUnsubscribes.forEach((unsub) => unsub());
      };
    });

    return () => unsubscribe();
  }, [user?.id, user?.name]);

  return totalUnread;
}
