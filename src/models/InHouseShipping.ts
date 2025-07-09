import mongoose, { Schema } from "mongoose";

interface DeliveryZone {
  name: string;
  region: string;
  country: string;
  postalCodes: string[];
  baseRate: number;
  maxWeightPerDelivery: number;
  maxDailyDeliveries: number;
  supportedMethods: ("standard" | "express")[];
  restrictions: {
    maxWeight?: number;
    maxDimensions?: {
      length: number;
      width: number;
      height: number;
    };
    restrictedItems?: string[];
  };
}

interface IInHouseShipping {
  active: boolean;
  deliveryZones: DeliveryZone[];
  methodSpeeds: {
    standard: {
      minDays: number;
      maxDays: number;
    };
    express: {
      minDays: number;
      maxDays: number;
    };
  };
}

export const inHouseShippingSchema = new Schema<IInHouseShipping>({
  active: {
    type: Boolean,
    default: true,
  },
  deliveryZones: [
    {
      name: { type: String, required: true },
      region: { type: String, required: true },
      country: { type: String, required: true },
      postalCodes: [{ type: String }],
      baseRate: { type: Number, required: true },
      maxWeightPerDelivery: { type: Number, required: true },
      maxDailyDeliveries: { type: Number, required: true },
      supportedMethods: [
        {
          type: String,
          enum: ["standard", "express"],
          required: true,
        },
      ],
      restrictions: {
        maxWeight: Number,
        maxDimensions: {
          length: Number,
          width: Number,
          height: Number,
        },
        restrictedItems: [String],
      },
    },
  ],
  methodSpeeds: {
    standard: {
      minDays: { type: Number, required: true },
      maxDays: { type: Number, required: true },
    },
    express: {
      minDays: { type: Number, required: true },
      maxDays: { type: Number, required: true },
    },
  },
});

export default mongoose.models.InHouseShipping ||
  mongoose.model<IInHouseShipping>("InHouseShipping", inHouseShippingSchema);
