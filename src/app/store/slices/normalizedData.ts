import { normalize } from "normalizr";
import { user, product } from "./schemas";
import { userEvent } from "./schemas";
// Normalize user function
export const normalizeUser = (data: any) => {
  return normalize(data, [user]);
};

// Normalize userEvent function
export const normalizeUserEvent = (data: any) => {
  return normalize(data, [userEvent]);
};

// Normalize product function
export const normalizeProducts = (data: any) => {
  return normalize(data, [product]);
};
