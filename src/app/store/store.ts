import { configureStore } from "@reduxjs/toolkit";
import productReducer from "./slices/productSlice";
import userEventReducer from "./slices/userEventSlice";


export const store = configureStore({
  reducer: { product: productReducer, userEvent: userEventReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
