import mongoose, { Schema, Document, Model } from "mongoose";

// ==================== 1. INTERFACES ====================

// ProductCode sub‑document
interface IProductCode {
  type: "EAN" | "UPC" | "ISBN" | "QR" | "MODEL";
  value: string;
}

// Key‑Value pair for dynamic attributes (keyFeatures, specifications, variant attributes)
interface IKeyValue {
  k: string;
  v: any; // Can be string, number, boolean, etc.
}

// Variant sub‑document
interface IVariant {
  attributes: IKeyValue[]; // e.g., [{ k: 'Size', v: 'L' }, { k: 'Color', v: 'Red' }]
  sku: string;
  price: number;
  quantity: number;
  mainImage?: string;
  images?: string[];
}

// Review sub‑document
interface IReview {
  user: mongoose.Types.ObjectId;
  rating: number; // 1–5
  comment?: string; // max 200 chars
}

// Related products structure
interface IRelatedProducts {
  ids: mongoose.Types.ObjectId[];
  relationshipType?: string;
}

// Main Product document
export interface IProduct extends Document {
  productCode: IProductCode[];
  name: string;
  sku: string;
  slug: string;
  categoryId: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
  hasVariants: boolean;
  variantThemes: string[]; // NEW: e.g., ['Color', 'Size', 'Material']
  keyFeatures: IKeyValue[]; // highlight features
  specifications: IKeyValue[]; // technical specs
  quantity: number;
  lowStockThreshold: number;
  listPrice: number;
  price: number;
  mainImage: string;
  images: string[];
  description: string;
  shortDescription: string;
  variants: IVariant[];
  carrier?: mongoose.Types.ObjectId;
  relatedProducts: IRelatedProducts;
  reviewsRatings: IReview[];
  tags: string[];
  status: "draft" | "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 2. SUB‑SCHEMAS ====================

const ProductCodeSchema = new Schema<IProductCode>({
  type: {
    type: String,
    enum: ["EAN", "UPC", "ISBN", "QR", "MODEL"],
    required: true,
  },
  value: { type: String, required: true },
});

const KeyValueSchema = new Schema<IKeyValue>({
  k: { type: String, required: true, trim: true },
  v: { type: Schema.Types.Mixed, required: true },
});

const VariantSchema = new Schema<IVariant>({
  attributes: { type: [KeyValueSchema], default: [] },
  sku: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  mainImage: { type: String, default: "" },
  images: { type: [String], default: [] },
});

const ReviewSchema = new Schema<IReview>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 200 },
});

// ==================== 3. MAIN SCHEMA ====================

const ProductSchema = new Schema<IProduct>(
  {
    productCode: { type: [ProductCodeSchema], default: [] },
    name: { type: String, trim: true, default: "" },
    sku: { type: String, trim: true, index: true, default: "" },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      unique: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    hasVariants: { type: Boolean, default: false },
    variantThemes: { type: [String], default: [] }, // NEW
    keyFeatures: { type: [KeyValueSchema], default: [] },
    specifications: { type: [KeyValueSchema], default: [] },
    quantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    listPrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    mainImage: { type: String, default: "" },
    images: { type: [String], default: [] },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    variants: { type: [VariantSchema], default: [] },
    carrier: { type: Schema.Types.ObjectId, ref: "Carrier" },
    relatedProducts: {
      ids: {
        type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
        default: [],
      },
      relationshipType: { type: String },
    },
    reviewsRatings: { type: [ReviewSchema], default: [] },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["draft", "active", "inactive"],
      default: "draft",
      index: true,
    },
  },
  { timestamps: true }, // strict is true by default
);

// ==================== 4. INDEXES ====================

// ---- 4a. Text search index (on static + dynamic fields) ----
ProductSchema.index(
  {
    name: "text",
    description: "text",
    shortDescription: "text",
    tags: "text",
    "keyFeatures.v": "text",
    "specifications.v": "text",
  },
  {
    weights: {
      name: 10,
      description: 5,
      shortDescription: 3,
      tags: 2,
      "keyFeatures.v": 1,
      "specifications.v": 1,
    },
    name: "ProductTextIndex",
  },
);

// ---- 4b. Exact key‑value lookups (multikey compound) ----
ProductSchema.index({ "keyFeatures.k": 1, "keyFeatures.v": 1 });
ProductSchema.index({ "specifications.k": 1, "specifications.v": 1 });

// ---- 4c. Common query filters ----
ProductSchema.index({ categoryId: 1, status: 1, price: 1 });
ProductSchema.index({ brand: 1, status: 1 });
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });

// (Optional) Partial index for active products only
ProductSchema.index(
  { "keyFeatures.k": 1, "keyFeatures.v": 1 },
  { partialFilterExpression: { status: "active" } },
);

// ==================== 5. MODEL ====================

const Product =
  (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
