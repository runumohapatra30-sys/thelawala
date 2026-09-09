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
