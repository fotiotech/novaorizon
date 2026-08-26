// context/CartContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import {
  cartReducer,
  CartState,
  initialCartState,
} from "../reducer/cartReducer";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyDiscount,
} from "@/app/actions/cart";
import { useUserData } from "./UserDataContext";
import { v4 as uuidv4 } from "uuid";

interface CartContextType extends CartState {
  dispatch: React.Dispatch<any>;
  addItem: (
    productId: string,
    variant?: string,
    quantity?: number,
  ) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyDiscount: (discountValue: number, couponCode?: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUserData();
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  const getIdentifier = useCallback(() => {
    const userId = user?.id;
    const sessionId = !userId ? getSessionId() : undefined;
    return { userId, sessionId };
  }, [user]);

  const refreshCart = useCallback(async () => {
    const identifier = getIdentifier();
    if (!identifier.userId && !identifier.sessionId) return;
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const cart = await getCart(identifier);
      dispatch({ type: "SET_CART", payload: cart });
    } catch (error: any) {
      dispatch({ type: "SET_ERROR", payload: error.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [getIdentifier]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart, user]);

  const addItem = useCallback(
    async (productId: string, variant?: string, quantity: number = 1) => {
      const identifier = getIdentifier();
      if (!identifier.userId && !identifier.sessionId)
        throw new Error("No identifier");
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const result = await addToCart(identifier, {
          productId,
          variant,
          quantity,
        });
        if (result.success && result.cart) {
          dispatch({ type: "SET_CART", payload: result.cart });
        }
      } catch (error: any) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [getIdentifier],
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      const identifier = getIdentifier();
      if (!identifier.userId && !identifier.sessionId)
        throw new Error("No identifier");
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const result = await updateCartItem(identifier, itemId, quantity);
        if (result.success && result.cart) {
          dispatch({ type: "SET_CART", payload: result.cart });
        }
      } catch (error: any) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [getIdentifier],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const identifier = getIdentifier();
      if (!identifier.userId && !identifier.sessionId)
        throw new Error("No identifier");
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const result = await removeFromCart(identifier, itemId);
        if (result.success && result.cart) {
          dispatch({ type: "SET_CART", payload: result.cart });
        }
      } catch (error: any) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [getIdentifier],
  );

  const clearCartAction = useCallback(async () => {
    const identifier = getIdentifier();
    if (!identifier.userId && !identifier.sessionId)
      throw new Error("No identifier");
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const result = await clearCart(identifier);
      if (result.success) {
        dispatch({
          type: "SET_CART",
          payload: {
            items: [],
            subtotal: 0,
            tax: 0,
            discount: 0,
            shippingCost: 0,
            total: 0,
          },
        });
      }
    } catch (error: any) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [getIdentifier]);

  const applyDiscountAction = useCallback(
    async (discountValue: number, couponCode?: string) => {
      const identifier = getIdentifier();
      if (!identifier.userId && !identifier.sessionId)
        throw new Error("No identifier");
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const result = await applyDiscount(
          identifier,
          discountValue,
          couponCode,
        );
        if (result.success && result.cart) {
          dispatch({ type: "SET_CART", payload: result.cart });
        }
      } catch (error: any) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [getIdentifier],
  );

  const value: CartContextType = {
    ...state,
    dispatch,
    addItem,
    updateItem,
    removeItem,
    clearCart: clearCartAction,
    applyDiscount: applyDiscountAction,
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
