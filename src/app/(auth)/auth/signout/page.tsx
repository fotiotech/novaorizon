import React from "react";
import { SignOut } from "../../components/auth/SignInButton";

const page = () => {
  return (
    <div className="p-3 mx-auto space-y-10 w-full">
      <h2>Sign Out</h2>
      <div className="flex flex-col gap-3">
        <p>Are you sure you want to sign out?</p>
        <div>
          <SignOut />
        </div>
      </div>
    </div>
  );
};

export default page;
