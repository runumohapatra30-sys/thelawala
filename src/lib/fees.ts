import type { Tables } from "@/integrations/supabase/types";

export type Settings = Tables<"system_settings">;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 100) / 100;
}

export type BillInput = {
  settings?: Settings | null;
  foodTotal: number;
  mrpTotal: number;
  distanceKm: number;
  penaltyFee?: number;
};

export type Bill = {
  mrpTotal: number;
  foodTotal: number;
  discount: number;
  distanceKm: number;
  deliveryFee: number;
  platformFee: number;
  handlingFee: number;
  packingFee: number;
  surgeFee: number;
  penaltyFee: number;
  grandTotal: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export type FeeSlab = { upto_km: number; fee: number };

/** Retained for admin screens that display the configured slab table. */
export function slabsOf(s: Settings): FeeSlab[] {
  const raw = s.delivery_fee_slabs as unknown;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => ({ upto_km: Number((r as FeeSlab)?.upto_km), fee: Number((r as FeeSlab)?.fee) }))
    .filter((r) => Number.isFinite(r.upto_km) && Number.isFinite(r.fee))
    .sort((a, b) => a.upto_km - b.upto_km);
}

export function computeBill({
  settings: s,
  foodTotal,
  mrpTotal,
  distanceKm,
  penaltyFee = 0,
}: BillInput): Bill {
  const standardDeliveryFee = 22 + Math.max(0, distanceKm - 2) * 3.5;
  let deliveryFee = standardDeliveryFee;
  if (foodTotal >= 200) {
    deliveryFee = distanceKm <= 5 ? 0 : Math.max(0, standardDeliveryFee - 30);
  }
  deliveryFee = r2(deliveryFee);

  const platformFee = 3;
  const handlingFee = 3;
  const packingFee = 0;
  const surgeFee = s?.enable_surge_fee ? Number(s.surge_fee) : 0;

  return {
    mrpTotal: r2(mrpTotal),
    foodTotal: r2(foodTotal),
    discount: r2(mrpTotal - foodTotal),
    distanceKm,
    deliveryFee,
    platformFee,
    handlingFee,
    packingFee,
    surgeFee,
    penaltyFee: r2(penaltyFee),
    grandTotal: r2(
      foodTotal + deliveryFee + platformFee + handlingFee + packingFee + surgeFee + penaltyFee,
    ),
  };
}

export const inr = (n: number) =>
  `₹${Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(2)}`;

export const STATUS_LABEL: Record<string, string> = {
  ORDER_PLACED: "Order placed",
  PREPARING: "Preparing your food",
  READY_FOR_PICKUP: "Ready for pickup",
  SEARCHING_RIDER: "Finding a delivery partner",
  RIDER_ASSIGNED: "Delivery partner assigned",
  OUT_FOR_DELIVERY: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const ORDER_FLOW = [
  "ORDER_PLACED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "SEARCHING_RIDER",
  "RIDER_ASSIGNED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];
