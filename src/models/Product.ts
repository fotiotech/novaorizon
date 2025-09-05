import mongoose, { Schema } from "mongoose";

// Core Product Schema treating all fields as grouped attributes
const ProductSchema = new Schema(
  {
    // Reference to the category/type
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    // All other fields are stored as top-level properties
    // No need for an attributes object anymore
  },
  {
    timestamps: true, // createdAt, updatedAt
    strict: false, // Allow dynamic fields
  }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
