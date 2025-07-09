// Define shipping method types
export type ShippingMethod = "standard" | "express" | "overnight" | "in-house";

// Define shipping rate calculation parameters
export interface ShippingRateParams {
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  fromAddress: {
    country: string;
    region: string;
    postalCode: string;
  };
  toAddress: {
    country: string;
    region: string;
    postalCode: string;
  };
  value: number;
  shippingMethod: ShippingMethod;
}

// Define shipping rate response
export interface ShippingRate {
  carrierId: string;
  carrierName: string;
  method: ShippingMethod;
  price: number;
  currency: string;
  estimatedDays: {
    min: number;
    max: number;
  };
  restrictions?: {
    maxWeight?: number;
    maxDimensions?: {
      length: number;
      width: number;
      height: number;
    };
    restrictedItems?: string[];
  };
}

// Define carrier coverage
export interface CarrierCoverage {
  region: string;
  country: string;
  supportedMethods: ShippingMethod[];
  baseRate: number;
  rateFactors: {
    weightMultiplier: number;
    distanceMultiplier: number;
    valueMultiplier: number;
  };
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

// Define carrier interface
export interface Carrier {
  _id: string;
  name: string;
  code: string;
  coverageAreas: CarrierCoverage[];
  methodSpeeds: {
    [key in ShippingMethod]: {
      minDays: number;
      maxDays: number;
    };
  };
  active: boolean;
  trackingUrlTemplate?: string;
}
