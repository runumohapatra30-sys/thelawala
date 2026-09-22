import type { Tables } from "@/integrations/supabase/types";
import { deliveryFeeForDistance } from "@/lib/pricing";

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
  settings: Settings;
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

/** Reads the admin's slab table; falls back to the built-in slabs when it is empty. */
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
  const mode = String(s.delivery_fee_mode ?? "PER_KM").toUpperCase();
  const baseFee = Number(s.base_delivery_fee ?? 0);
  let deliveryFee: number;

  if (mode === "FIXED") {
    // One flat fee, whatever the distance is.
    deliveryFee = baseFee;
  } else if (mode === "SLAB") {
    const slabs = slabsOf(s);
    const hit = slabs.find((r) => distanceKm <= r.upto_km);
    deliveryFee = hit ? hit.fee : slabs.length ? slabs[slabs.length - 1]!.fee : deliveryFeeForDistance(distanceKm);
  } else {
    // Base fee covers the base distance, then the per-km rate for every extra kilometre.
    const baseKm = Number(s.base_delivery_distance_km ?? 0);
    const perKm = Number(s.extra_fee_per_km ?? 0);
    deliveryFee = baseFee + Math.max(0, distanceKm - baseKm) * perKm;
  }

  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) deliveryFee = deliveryFeeForDistance(distanceKm);
  const threshold = s.free_delivery_threshold;
  if (threshold != null && foodTotal >= Number(threshold)) deliveryFee = 0;
  deliveryFee = r2(deliveryFee);

  const platformFee = s.enable_platform_fee ? Number(s.platform_fee) : 0;
  const handlingFee = s.enable_handling_fee ? Number(s.handling_fee) : 0;
  const packingFee = s.enable_packing_fee ? Number(s.packing_fee) : 0;
  const surgeFee = s.enable_surge_fee ? Number(s.surge_fee) : 0;

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
