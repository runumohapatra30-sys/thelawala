// Central pricing rules for Thaleewala.
// Vendors enter a base price. Customers pay a 10% marked-up price.
// On delivery the vendor is credited 95% of the base price.

export const PRICE_MARKUP = 1.1;
export const VENDOR_PAYOUT_RATE = 0.95;

/** Price shown to and paid by the customer. */
export const customerPrice = (base: number | string | null | undefined) =>
  Math.round(Number(base ?? 0) * PRICE_MARKUP);

/** Amount credited to the stall when the order is delivered. */
export const vendorEarning = (base: number | string | null | undefined) =>
  Math.round(Number(base ?? 0) * VENDOR_PAYOUT_RATE);

/** Hard delivery radius. Nothing is delivered beyond this. */
export const MAX_DELIVERY_KM = 15.0;

/** Minimum cart value (vendor base total) for the given distance. */
export function minimumOrderValue(distanceKm: number): number {
  if (distanceKm >= 10.0) return 499;
  if (distanceKm > 4.0) return 199;
  return 99;
}

/** Flat, distance-slab delivery fee. */
export function deliveryFeeForDistance(distanceKm: number): number {
  if (distanceKm <= 1.5) return 15;
  if (distanceKm <= 3.0) return 18;
  if (distanceKm <= 4.0) return 22;
  if (distanceKm <= 5.0) return 25;
  // Beyond the base 5 km slab: ₹6 per extra km (rounded up).
  return 25 + Math.ceil(distanceKm - 5.0) * 6;
}

/** Fixed profit the platform keeps from the margin pool. */
export function platformRetainedProfit(distanceKm: number): number {
  if (distanceKm <= 3.0) return 7;
  if (distanceKm <= 4.0) return 5;
  return 10;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Full margin split for an order, from the stall's base total. */
export function marginSplit(baseTotal: number, distanceKm: number) {
  const customerItemTotal = r2(baseTotal * PRICE_MARKUP);
  const vendorPayout = r2(baseTotal * VENDOR_PAYOUT_RATE);
  const marginPool = r2(customerItemTotal - vendorPayout);
  const retained = platformRetainedProfit(distanceKm);
  // Leftover margin is shared 50/50: half to the rider as a gift, half to the company.
  const leftover = Math.max(0, r2(marginPool - retained));
  const riderGift = r2(leftover * 0.5);
  const companyShare = r2(leftover - riderGift);
  const deliveryFee = deliveryFeeForDistance(distanceKm);
  return {
    customerItemTotal,
    vendorPayout,
    marginPool,
    platformProfit: retained,
    riderGift,
    deliveryFee,
    riderPayout: r2(deliveryFee + riderGift),
  };
}

export type CheckoutGate =
  | { ok: true }
  | { ok: false; reason: string };

/** Radius cap + distance-based minimum order value. */
export function checkoutGate(distanceKm: number, baseTotal: number): CheckoutGate {
  if (distanceKm > MAX_DELIVERY_KM) return { ok: false, reason: "Delivery unavailable beyond 15 km." };
  const mov = minimumOrderValue(distanceKm);
  if (baseTotal < mov)
    return { ok: false, reason: `Minimum order for this distance is ₹${mov}.` };
  return { ok: true };
}

/** Discount the stall itself is running, in rupees, on the customer item total. */
export function stallOfferDiscount(itemTotal: number, offerPercent: number | null | undefined): number {
  const pct = Math.max(0, Math.min(70, Number(offerPercent ?? 0)));
  if (!pct) return 0;
  return Math.round(itemTotal * pct) / 100;
}
