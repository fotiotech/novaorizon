"use client";
import React from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSession } from "next-auth/react";
import { SignOut } from "@/components/auth/SignInButton";

const Profile = () => {
  const session = useSession();
  const user = session?.data?.user as any;
  return (
    <>
      <div className="flex justify-between items-center p-2 ">
        <div className="font-semibold text-lg">Profile</div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher /> <p>Currency</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2 p-2">
        <li className="p-2 rounded-lg bg-gray-300">
          Welcome,
          <span className="font-bold ml-1">{session?.data?.user?.email}</span>!
        </li>
        <Link href={"/"}>
          <li className="p-2 rounded-lg bg-gray-300">Go back to Home Page</li>
        </Link>
        <Link href={"/checkout/billing_addresses"}>
          <li className="p-2 rounded-lg bg-gray-300">Billing Addresses</li>
        </Link>
        {user?.role === "admin" ? (
          <Link href={`/admin`}>
            <li className="p-2 rounded-lg bg-gray-300">Admin Panel</li>
          </Link>
        ) : (
          ""
        )}
        <li className="mt-20 bg-red-300 p-2 rounded-lg">
          <SignOut />
        </li>
      </ul>
    </>
  );
};

export default Profile;
