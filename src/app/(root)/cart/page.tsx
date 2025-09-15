import Cart from "@/components/cart/Cart";
import CheckoutButton from "@/components/CheckoutButton";
import React from "react";

const CartPage = () => {
  return (
    <>
      <div className="p-2 ">
        <h2 className=" font-bold text-xl">Your Cart</h2>
        <div className="text-center p-2">
          <CheckoutButton width="full" height="10">
            Check Out
          </CheckoutButton>
        </div>

        <Cart />
      </div>
    </>
  );
};

export default CartPage;
