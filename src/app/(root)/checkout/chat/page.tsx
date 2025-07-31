// pages/checkout.jsx
'use client'
import ChatWidget from "@/app/(root)/checkout/_component/ChatWidget";
import { useUser } from "@/app/context/UserContext"; // Assuming you have a custom hook to get user info
export default function Checkout() {
    const {user } = useUser();
  // … your checkout form logic …
  return (
    <div>
      {/* ... your checkout UI ... */}
      <ChatWidget user={user} roomId="checkout-support" />
    </div>
  );
}

// If using getServerSideProps:
// export async function getServerSideProps(ctx) {
//   const user = await getUserFromSession(ctx.req);
//   return { props: { user } };
// }
