import api from "@/lib/api";

/**
 * Storefront shipping helpers — public catalogue endpoints.
 * (`GET /api/catalog/carriers`, `POST /api/catalog/shipping/quote`)
 */

export interface CarrierRegion {
  _id?: string;
  region: string;
  basePrice: number;
  averageDeliveryTime: string;
}

export interface Carrier {
  _id: string;
  name: string;
  regionsServed: CarrierRegion[];
  /** Always present in the API response (defaults to 0 server-side). */
  costWeight: number;
  [key: string]: any;
}

export async function getCarriers(): Promise<Carrier[]> {
  const res = await api.get<{ data: Carrier[] }>("/catalog/carriers");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export interface ShippingQuote extends CarrierRegion {
  shippingPrice: number;
}

export async function calculateShippingPrice(
  carrierId: string,
  region: string,
  weight?: number,
  _distance?: number,
): Promise<ShippingQuote> {
  try {
    const res = await api.post<{ data: ShippingQuote }>(
      "/catalog/shipping/quote",
      { carrierId, region, weight },
    );
    return res.data.data;
  } catch (error: any) {
    console.error("Error calculating shipping price:", error);
    // Preserve the old thrown-Error contract (checkout catches and shows it).
    throw new Error(
      error?.response?.data?.error ??
        error?.message ??
        "Unable to calculate shipping",
    );
  }
}