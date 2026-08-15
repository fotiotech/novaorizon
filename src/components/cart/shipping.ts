"use server";

import { calculateShippingPrice } from "@/app/actions/carrier";

const DEFAULT_CARRIER_ID = "675eeda75a81d16c81aca736";

export async function getShippingPrice(region: string) {
  if (!region) return null;
  try {
    const res = await calculateShippingPrice(DEFAULT_CARRIER_ID, region, 0);
    return res || null;
  } catch (error) {
    console.error("Error fetching shipping price:", error);
    return null;
  }
}
