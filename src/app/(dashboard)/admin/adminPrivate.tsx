// "use client";

// import React, { ReactNode } from "react";
// import { useAuth } from "../../context/UserContext";
// import { useRouter } from "next/navigation";

// interface adminPrivateProps {
//   children: ReactNode;
// }

// function AdminPrivate({ children }: adminPrivateProps) {
//   const router = useRouter();
//   const auth = useAuth();

//   if (!auth) {
//     throw new Error("useAuth must be used within a UserContextProvider");
//   }

//   const { token, user } = auth;

//   if (!token || user?.role !== "admin") return router.push("/");

//   return <div>{children}</div>;
// }

// export default AdminPrivate;
