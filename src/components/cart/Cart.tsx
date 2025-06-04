"use client";

import { useCart } from "@/app/context/CartContext";
import { Delete } from "@mui/icons-material";
import Image from "next/image";
import { Prices } from "./Prices";

const Cart = () => {
  const { cart, dispatch } = useCart();

  const handleRemove = (id: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: id });
  };

  return (
    <div className="">
      {cart.length === 0 ? (
        <p>Cart is empty</p>
      ) : (
        <div className="flex flex-col gap-2 p-2">
          {cart.map((item) => (
            <div key={item.id} className="flex gap-2 justify-between">
              <div className="flex gap-2 p-2">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    width={500}
                    height={500}
                    alt="cart item img"
                    className="w-24 h-24 object-contain"
                  />
                )}

                <div>
                  <h3>{item.name}</h3>
                  <p>
                    Price:{" "}
                    <span className=" font-bold mr-1">
                      <Prices amount={item.price} />
                    </span>
                  </p>
                  <p>Quantity: {item.quantity}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <span
                    onClick={() =>
                      dispatch({
                        type: "UPDATE_QUANTITY",
                        payload: { id: item.id, quantity: item.quantity - 1 },
                      })
                    }
                    className="border px-2 rounded-lg"
                  >
                    -
                  </span>
                  <span
                    onClick={() =>
                      dispatch({
                        type: "UPDATE_QUANTITY",
                        payload: { id: item.id, quantity: item.quantity + 1 },
                      })
                    }
                    className="border px-2 rounded-lg"
                  >
                    +
                  </span>
                </div>

                <button
                  type="button"
                  title="button"
                  onClick={() => handleRemove(item.id)}
                  className="text-red-500 font-medium"
                >
                  <Delete />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Cart;
