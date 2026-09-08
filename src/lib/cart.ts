import { useSyncExternalStore } from "react";

export type CartLine = {
  itemId: string;
  vendorId: string;
  name: string;
  photo: string | null;
  unit: string | null;
  price: number;
  mrp: number;
  qty: number;
};

const KEY = "thaleewala.cart.v3";
let lines: CartLine[] = [];
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) lines = JSON.parse(raw) as CartLine[];
  } catch {
    lines = [];
  }
}

function commit(next: CartLine[]) {
  lines = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* quota */
    }
  }
  listeners.forEach((l) => l());
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => lines,
    () => [],
  );
}

export const cart = {
  get lines() {
    return lines;
  },
  add(line: Omit<CartLine, "qty">) {
    const existing = lines.find((l) => l.itemId === line.itemId);
    if (existing) {
      commit(lines.map((l) => (l.itemId === line.itemId ? { ...l, qty: l.qty + 1 } : l)));
      return { ok: true as const };
    }
    if (lines.length && lines[0]!.vendorId !== line.vendorId) {
      return { ok: false as const, error: "One order can be from one stall only. Clear the cart first." };
    }
    commit([...lines, { ...line, qty: 1 }]);
    return { ok: true as const };
  },
  remove(itemId: string) {
    commit(
      lines
        .map((l) => (l.itemId === itemId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    );
  },
  clear() {
    commit([]);
  },
};

export const cartTotals = (ls: CartLine[]) => ({
  count: ls.reduce((s, l) => s + l.qty, 0),
  foodTotal: ls.reduce((s, l) => s + l.price * l.qty, 0),
  mrpTotal: ls.reduce((s, l) => s + (l.mrp || l.price) * l.qty, 0),
});
