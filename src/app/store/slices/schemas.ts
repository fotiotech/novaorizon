import { schema } from "normalizr";

// Define a user schema
export const user = new schema.Entity("users", {}, { idAttribute: "_id" });


export const userEvent = new schema.Entity("userEvents", {}, { idAttribute: "_id" });

// Define a product schema that references the category schema
export const product = new schema.Entity(
  "products",
  {},
  { idAttribute: "_id" }
);
