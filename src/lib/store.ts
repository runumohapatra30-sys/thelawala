import { useSyncExternalStore } from "react";
import { PRODUCTS, VENDORS } from "./data";
import { ZONES } from "./geo";
import type { Bill, Banner, CartLine, Order, OrderStatus, Rider, Vendor } from "./types";

const KEY = "thaleewala.state.v2";

export type AuditEvent = { id: string; type: string; orderId?: string; at: number; note?: string };

export type AppState = {
  zoneId: string;
  cart: CartLine[];
  orders: Order[];
  vendors: Vendor[];
  riders: Rider[];
  banners: Banner[];
  coupon: { code: string; percent: number } | null;
  audit: AuditEvent[];
  wallet: number;
  adminEmail: string | null;
};

const initial: AppState = {
  zoneId: "dumduma",
  cart: [],
  orders: [],
  vendors: VENDORS,
  riders: [
    { id: "r1", name: "Dillip Mohapatra", mobile: "9078492360", status: "APPROVED", onDuty: true },
  ],
  banners: [
    { id: "b1", title: "Evening snacks fest", subtitle: "Hot pakoda under ₹49", code: "FEST20", percent: 20 },
  ],
  coupon: null,
  audit: [],
  wallet: 0,
  adminEmail: null,
};

let state: AppState = initial;
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...initial, ...(JSON.parse(raw) as AppState) };
  } catch {
    /* ignore corrupt storage */
  }
}
load();

function set(next: Partial<AppState>) {
  state = { ...state, ...next };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }
  listeners.forEach((l) => l());
}

function log(type: string, orderId?: string, note?: string) {
  const event: AuditEvent = { id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, type, at: Date.now(), ...(orderId ? { orderId } : {}), ...(note ? { note } : {}) };
  state = { ...state, audit: [event, ...state.audit].slice(0, 200) };
}

export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(initial),
  );
}

function patch(id: string, next: Partial<Order>) {
  set({ orders: state.orders.map((o) => (o.id === id ? { ...o, ...next } : o)) });
}

export const actions = {
  setZone: (zoneId: string) => set({ zoneId }),
  addItem(productId: string) {
    const line = state.cart.find((l) => l.productId === productId);
    set({
      cart: line
        ? state.cart.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l))
        : [...state.cart, { productId, qty: 1 }],
    });
  },
  removeItem(productId: string) {
    set({
      cart: state.cart
        .map((l) => (l.productId === productId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    });
  },
  clearCart: () => set({ cart: [] }),
  applyCoupon(code: string): boolean {
    const banner = state.banners.find((b) => b.code?.toUpperCase() === code.trim().toUpperCase());
    if (!banner?.percent) return false;
    set({ coupon: { code: banner.code!, percent: banner.percent } });
    return true;
  },
  clearCoupon: () => set({ coupon: null }),
  placeOrder(payment: string, address: string): Order {
    const lines = state.cart.map((l) => {
      const p = PRODUCTS.find((x) => x.id === l.productId)!;
      return { productId: p.id, name: p.name, qty: l.qty, price: p.price, mrp: p.mrp, image: p.image };
    });
    const zone = ZONES.find((z) => z.id === state.zoneId)!;
    const order: Order = {
      id: `TW${Date.now().toString().slice(-6)}`,
      createdAt: Date.now(),
      lines,
      vendorId: lines[0] ? PRODUCTS.find((p) => p.id === lines[0]!.productId)!.vendorId : "v1",
      zoneId: zone.id,
      drop: zone.center,
      address,
      status: "PLACED",
      pickupOtp: otp(),
      deliveryOtp: otp(),
      riderId: null,
      arrivedAtStall: false,
      arrivedAtDrop: false,
      pickupVerifiedAt: null,
      deliveredAt: null,
      otpAttempts: 0,
      proofPhoto: null,
      bill: computeBill(lines, state.coupon?.percent ?? 0),
      payment,
      history: [{ status: "PLACED", at: Date.now() }],
    };
    log("ORDER_CREATED", order.id);
    set({ orders: [order, ...state.orders], cart: [], coupon: null });
    return order;
  },
  advance(id: string, status: OrderStatus) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    log(`ORDER_${status}`, id);
    patch(id, { status, history: [...order.history, { status, at: Date.now() }] });
  },
  assignRider(id: string, riderId: string) {
    log("RIDER_ASSIGNED", id, riderId);
    patch(id, { riderId });
  },
  markArrived(id: string, where: "stall" | "drop") {
    log(where === "stall" ? "RIDER_ARRIVED_STALL" : "RIDER_ARRIVED_DROP", id);
    patch(id, where === "stall" ? { arrivedAtStall: true } : { arrivedAtDrop: true });
  },
  /** Server-style pickup verification: order must be PACKED and OTP must match. */
  verifyPickup(id: string, code: string): { ok: boolean; error?: string } {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return { ok: false, error: "Order not found" };
    if (o.status !== "PACKED") return { ok: false, error: "Stall has not packed this order yet" };
    if (o.otpAttempts >= 5) return { ok: false, error: "Too many wrong attempts. Ask the stall to re-share." };
    if (code.trim() !== o.pickupOtp) {
      log("PICKUP_OTP_FAILED", id);
      patch(id, { otpAttempts: o.otpAttempts + 1 });
      return { ok: false, error: "Wrong pickup OTP" };
    }
    log("PICKUP_OTP_VERIFIED", id);
    patch(id, {
      status: "PICKED_UP",
      pickupVerifiedAt: Date.now(),
      otpAttempts: 0,
      history: [...o.history, { status: "PICKED_UP", at: Date.now() }],
    });
    setTimeout(() => actions.advance(id, "OUT_FOR_DELIVERY"), 800);
    return { ok: true };
  },
  /** Delivery needs correct OTP AND a captured handover photo. */
  verifyDelivery(id: string, code: string, photo: string | null): { ok: boolean; error?: string } {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return { ok: false, error: "Order not found" };
    if (o.status !== "OUT_FOR_DELIVERY") return { ok: false, error: "Order is not out for delivery" };
    if (!photo) return { ok: false, error: "Capture the parcel handover photo first" };
    if (code.trim() !== o.deliveryOtp) {
      log("DELIVERY_OTP_FAILED", id);
      patch(id, { otpAttempts: o.otpAttempts + 1 });
      return { ok: false, error: "Wrong delivery OTP" };
    }
    log("DELIVERY_OTP_VERIFIED", id);
    log("ORDER_DELIVERED", id);
    patch(id, {
      status: "DELIVERED",
      proofPhoto: photo,
      deliveredAt: Date.now(),
      otpAttempts: 0,
      history: [...o.history, { status: "DELIVERED", at: Date.now() }],
    });
    return { ok: true };
  },
  addVendor(v: Vendor) {
    log("VENDOR_REGISTERED", undefined, v.stallName);
    set({ vendors: [v, ...state.vendors] });
  },
  addRider(r: Rider) {
    log("RIDER_REGISTERED", undefined, r.name);
    set({ riders: [r, ...state.riders] });
  },
  setVendorStatus(id: string, status: Vendor["status"]) {
    log(status === "APPROVED" ? "ACCOUNT_APPROVED" : "ACCOUNT_REJECTED", undefined, id);
    set({ vendors: state.vendors.map((v) => (v.id === id ? { ...v, status } : v)) });
  },
  setRiderStatus(id: string, status: Rider["status"]) {
    log(status === "APPROVED" ? "ACCOUNT_APPROVED" : "ACCOUNT_REJECTED", undefined, id);
    set({ riders: state.riders.map((r) => (r.id === id ? { ...r, status } : r)) });
  },
  toggleDuty(id: string) {
    set({ riders: state.riders.map((r) => (r.id === id ? { ...r, onDuty: !r.onDuty } : r)) });
  },
  addBanner(b: Banner) {
    set({ banners: [b, ...state.banners] });
  },
  signInAdmin(email: string) {
    set({ adminEmail: email });
  },
  signOutAdmin: () => set({ adminEmail: null }),
};

export function otp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function computeBill(
  lines: { qty: number; price: number; mrp: number }[],
  couponPercent = 0,
): Bill {
  const mrpTotal = lines.reduce((s, l) => s + l.mrp * l.qty, 0);
  const itemTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = mrpTotal - itemTotal;
  const coupon = Math.round(itemTotal * (couponPercent / 100));
  const handling = 4;
  const surge = itemTotal > 0 && itemTotal < 149 ? 9 : 0;
  const delivery = itemTotal >= 149 ? 0 : 25;
  const charity = Math.round(itemTotal * 0.02 * 100) / 100;
  const grand =
    Math.round((itemTotal - coupon + handling + surge + delivery + charity) * 100) / 100;
  return { mrpTotal, discount, itemTotal, handling, surge, delivery, charity, coupon, grand, platformProfit: 7.5 };
}

export const inr = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: "Order placed",
  VENDOR_ACCEPTED: "Stall accepted",
  PREPARING: "Preparing",
  PACKED: "Packed",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
