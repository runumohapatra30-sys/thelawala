import { useSyncExternalStore } from "react";
import { PRODUCTS, VENDORS } from "./data";
import { ZONES } from "./geo";
import type { Bill, Banner, CartLine, Order, Rider, Vendor } from "./types";

const KEY = "thaleewala.state.v1";

export type AppState = {
  zoneId: string;
  cart: CartLine[];
  orders: Order[];
  vendors: Vendor[];
  riders: Rider[];
  banners: Banner[];
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
  banners: [{ id: "b1", title: "Evening snacks fest", subtitle: "Hot pakoda under ₹49", code: "FEST20", percent: 20 }],
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
      riderId: "r1",
      proofPhoto: null,
      bill: computeBill(lines),
      payment,
    };
    set({ orders: [order, ...state.orders], cart: [] });
    return order;
  },
  setOrderStatus(id: string, status: Order["status"]) {
    set({ orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)) });
  },
  setProof(id: string, photo: string) {
    set({ orders: state.orders.map((o) => (o.id === id ? { ...o, proofPhoto: photo } : o)) });
  },
  addVendor(v: Vendor) {
    set({ vendors: [v, ...state.vendors] });
  },
  addRider(r: Rider) {
    set({ riders: [r, ...state.riders] });
  },
  setVendorStatus(id: string, status: Vendor["status"]) {
    set({ vendors: state.vendors.map((v) => (v.id === id ? { ...v, status } : v)) });
  },
  setRiderStatus(id: string, status: Rider["status"]) {
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
): Bill {
  const mrpTotal = lines.reduce((s, l) => s + l.mrp * l.qty, 0);
  const itemTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = mrpTotal - itemTotal;
  const handling = 4;
  const surge = itemTotal > 0 && itemTotal < 149 ? 9 : 0;
  const delivery = itemTotal >= 149 ? 0 : 25;
  const charity = Math.round(itemTotal * 0.02 * 100) / 100;
  const grand = Math.round((itemTotal + handling + surge + delivery + charity) * 100) / 100;
  return { mrpTotal, discount, itemTotal, handling, surge, delivery, charity, grand, platformProfit: 7.5 };
}

export const inr = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;
