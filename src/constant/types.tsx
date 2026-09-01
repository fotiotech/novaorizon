import { CartItem } from "@/app/reducer/cartReducer";

export type Users = {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  status?: string;
  customerInfos?: Customer;
  created_at?: string;
  updated_at?: string;
};

export type Category = {
  _id?: string;
  parent_id?: string;
  url_slug?: string;
  name?: string;
  description?: string;
  imageUrl?: string[];
  attributes?: string[];
  seo_title?: string;
  seo_desc?: string;
  keywords?: string;
  sort_order?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type Brand = {
  _id: string;
  name: string;
  logoUrl?: string;
  status?: "active" | "inactive";
};

interface VariantAttribute {
  _id: string;
  name: string;
  product_id: string;
  values: string[];
}

export type Carrier = {
  _id?: string;
  name: string;
  contact: string;
  email: string;
  regionsServed: { region: string; basePrice: number }[];
  averageDeliveryTime: string;
  costPerKm: number;
  status: "active" | "inactive";
  timestamps?: string;
};

export type Product = {
  _id?: string;
  name: string; // Product name
  sku?: string; // Stock Keeping Unit
  slug?: string; // URL slug
  categoryId: string; // Category ID
  brand: string | { _id: string; name: string }; // Brand ID or object
  hasVariants?: boolean; // Whether product has variants
  variantThemes?: string[]; // Variant theme codes
  keyFeatures?: any[]; // Key features array
  specifications?: any[]; // Specifications array
  quantity: number; // Stock quantity
  lowStockThreshold?: number; // Low stock threshold
  listPrice: number; // List price
  price: number; // Sale/current price
  mainImage?: string; // Main product image
  images?: string[]; // Gallery images
  description?: string; // Product description
  shortDescription?: string; // Short description
  variants?: any[]; // Product variants
  carrier?: string; // Carrier/shipping ID
  relatedProducts?: any[]; // Related products
  tags?: string[]; // Product tags
  status?: "draft" | "active" | "inactive"; // Product status
  createdAt?: string; // Creation timestamp
  updatedAt?: string; // Last update timestamp
  [key: string]: any; // Allow additional fields
};

export type Smartphones = {
  ModelName: string;
  SerialNumber: string;
  OperatingSystem: string;
  RAmMemory: number;
  InternalStorage: number;
  ExpandableStorage: string;
  RearCamera: string;
  FrontCamera: string;
  BatteryCapacity: number;
  ChargingType: string;
  Sensors: string;
  ScreenSize: number;
  CellularTechnology: string;
  WirelessCarrier: string;
  ConnectivityTechnology: string;
  RefreshRate: number;
  Weight: number;
  Warranty: string;
  Resolution: string;
  processor: number;
  BuildMaterial: string;
  WaterDustResistance: string;
  BoxContents: string;
  OtherFeature: string;
  Details: string;
};

export type SmartphonesVariants = {
  VariantID: number;
  id_product: number;
  variantSku: string;
  VariantName: string;
  variantPrice: number;
  variantSize: number;
  variantWeight: number;
  variantColor: string;
  StorageCapacity: string;
  RAM: number;
  StockLevel: number;
  Barcode: string;
  Dimensions: string;
  Weight: number;
  BatteryCapacity: number;
  ScreenSize: number;
  CameraSpecifications: string;
  OperatingSystem: string;
  Connectivity: string;
  Warranty: number;
  ReleaseDate: string;
  Discounts: string;
  VariantImageUrl: string;
  Features: string;
  ShippingWeight: number;
  Supplier: string;
  Popularity: string;
};

export type Shipping = {
  ShippingCost: number;
  orderId: number;
  customerId: number;
  ShippingAddress: string;
  ShippingMethod: string;
  Carrier: string;
  TrackingNumber: number;
  ShipmentDate: string;
  ExpectedDeliveryDate: string;
  ActualDeliveryDate: string;
  Weight: number;
  Dimensions: string;
  ShippingInstructions: string;
  InsuranceAmount: number;
  SignatureRequired: string;
  ReturnTrackingNumber: string;
  CustomsInformation: string;
  PackageContents: string;
  DeliveryConfirmation: string;
  ReturnStatus: string;
  PackagingType: string;
};

export type Inventory = {
  id_product: number;
  sku: string;
  stockQuantity: number;
  stockAvailability: number;
  product_name: string;
  minimumStockLevel: number;
  reorderQuantity: number;
  supplierId: number | string;
  warehouseLocation: string;
  batchNumber: number;
  expiryDate: string;
  dateReceived: string;
  dateLastSold: string;
  costPrice: number;
  sellingPrice: number;
  stockStatus: number;
  reservedStock: number;
  damagedStock: number;
  stockValue: number;
  stockTurnOverRate: number;
  lastCheckDate: string;
};

export type Orders = {
  _id?: string;
  orderNumber: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  products: CartItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  transactionId: string;
  customerDetails: {
    billingAddress: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
      postalCode?: string;
      preferences?: string[]; // Array to store customer preferences
    };
  };
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingStatus: Date;
  shippingDate: Date;
  deliveryDate: string;
  orderStatus: string;
  notes: string;
  couponCode: string;
  discount: number;
  createdAt: string;
};

export type ProductsFiles = {
  files_id: number;
  productId: number;
  filesUrl: string;
  originalname: string;
  mimetype: string;
  size: string;
};

export type HeroSection = {
  _id?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  cta_text?: string;
  cta_link: string;
  created_at?: string;
};

export type Customer = {
  _id: string;
  userId: string; // Reference to the User (authenticated user)
  photo: string;
  language: string;
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    street?: string;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    preferences?: string[]; // Array to store customer preferences
  };
  shippingAddress: {
    street: string;
    region: string;
    city: string;
    address: string;
    country: string;
    carrier: string;
    shippingMethod: string;
  };
  billingMethod?: {
    methodType: string; // e.g., "Credit Card", "PayPal", etc.
    details?: {
      cardNumber?: string;
      expiryDate?: string;
      cardholderName?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
};

export type MonetbilPaymentRequest = {
  serviceKey: string;
  orderNumber: string;
  amount: number;
  phone?: string;
  phone_lock?: boolean;
  locale?: string;
  operator?: string;
  country?: string;
  currency?: string;
  itemRef?: string;
  paymentRef?: string;
  user?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  returnUrl?: string;
  notifyUrl?: string;
  logo?: string;
};

// app/types/tag.ts
export interface Tag {
  _id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive";
}

export type Offer = {
  _id?: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed" | "bogo" | "free_shipping" | "bundle";
  discountValue?: number;
  conditions?: {
    minPurchaseAmount?: number;
    eligibleProducts?: string[];
    startDate: string;
    endDate: string;
  };
  isActive: boolean;
};
