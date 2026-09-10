import { PRICE_MARKUP, VENDOR_PAYOUT_RATE, platformRetainedProfit } from "@/lib/pricing";

export type Period = "day" | "week" | "month" | "year" | "life";

export const PERIOD_LABEL: Record<Period, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
  life: "Lifetime",
};

/** Start of the selected period as an ISO string (null = lifetime). */
export function periodStart(p: Period): string | null {
  if (p === "life") return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "week") d.setDate(d.getDate() - 6);
  if (p === "month") d.setDate(d.getDate() - 29);
  if (p === "year") d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
}

export type MoneyOrder = {
  status: string;
  payment_mode: string;
  payment_status?: string | null;
  grand_total: number | string;
  food_total: number | string;
  base_food_total?: number | string | null;
  delivery_fee: number | string;
  tip_amount?: number | string | null;
  discount_amount?: number | string | null;
  platform_fee?: number | string | null;
  handling_fee?: number | string | null;
  packing_fee?: number | string | null;
  surge_fee?: number | string | null;
  distance_km?: number | string | null;
};

export type OrderSplit = {
  sale: number;
  vendorEarning: number;
  riderFee: number;
  riderTip: number;
  riderGift: number;
  riderTotal: number;
  charges: number;
  discount: number;
  platformProfit: number;
};

const n = (v: unknown) => Number(v ?? 0) || 0;

/** Money split for one order, using the same rules as `complete_delivery`. */
export function splitOrder(o: MoneyOrder): OrderSplit {
  const food = n(o.food_total);
  const base = n(o.base_food_total) > 0 ? n(o.base_food_total) : food / PRICE_MARKUP;
  const vendor = Math.round(base * VENDOR_PAYOUT_RATE * 100) / 100;
  const pool = food - vendor;
  const retained = platformRetainedProfit(n(o.distance_km));
  const gift = Math.max(0, Math.round((pool - retained) * 100) / 100);
  const fee = n(o.delivery_fee);
  const tip = n(o.tip_amount);
  const charges = n(o.platform_fee) + n(o.handling_fee) + n(o.packing_fee) + n(o.surge_fee);
  const discount = n(o.discount_amount);
  return {
    sale: n(o.grand_total) + tip,
    vendorEarning: vendor,
    riderFee: fee,
    riderTip: tip,
    riderGift: gift,
    riderTotal: Math.round((fee + tip + gift) * 100) / 100,
    charges,
    discount,
    platformProfit: Math.round((retained + charges - discount) * 100) / 100,
  };
}

/** Cancelled online-paid orders that still owe the customer money. */
export const needsRefund = (o: MoneyOrder) =>
  o.status === "CANCELLED" && o.payment_mode !== "COD" && o.payment_status === "PAID";

export const REFUND_FLOW = ["REQUESTED", "UNDER_REVIEW", "IN_PROGRESS", "APPROVED", "COMPLETED"] as const;

export const REFUND_LABEL: Record<string, string> = {
  PENDING: "Requested",
  REQUESTED: "Requested",
  UNDER_REVIEW: "Under review",
  IN_PROGRESS: "In progress",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Refund completed",
};

/** Payout cycle text: riders are paid on Sunday, stalls the next day. */
export const PAYOUT_CYCLE = {
  PARTNER: "Paid every Sunday",
  VENDOR: "Paid the next day",
} as const;
