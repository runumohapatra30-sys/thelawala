import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { PRODUCTS } from "@/lib/data";
import { ZONES } from "@/lib/geo";
import { actions, computeBill, inr, useApp } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Thaleewala" },
      { name: "description", content: "Review your street food order, bill and delivery address." },
      { property: "og:title", content: "Your cart — Thaleewala" },
      { property: "og:description", content: "Transparent bill with delivery, handling and charity split." },
    ],
  }),
  component: Cart,
});

const PAYMENTS = ["UPI", "Card", "Thaleewala Wallet", "Cash on Delivery"];

function Cart() {
  const navigate = useNavigate();
  const cart = useApp((s) => s.cart);
  const zoneId = useApp((s) => s.zoneId);
  const coupon = useApp((s) => s.coupon);
  const zone = ZONES.find((z) => z.id === zoneId)!;
  const [address, setAddress] = useState("1145 Raghunath Nagar, Baba Akhandalamani temple road");
  const [payment, setPayment] = useState(PAYMENTS[0]!);
  const [code, setCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const lines = cart.map((l) => {
    const p = PRODUCTS.find((x) => x.id === l.productId)!;
    return { ...p, qty: l.qty };
  });
  const bill = computeBill(lines, coupon?.percent ?? 0);
  const serviceable = Boolean(zone);

  if (lines.length === 0) {
    return (
      <Shell>
        <PortalHeader title="Your cart" />
        <div className="px-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">Your cart is empty. Add something hot.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PortalHeader title="Checkout" subtitle={`Delivering to ${zone.name}`} />
      <div className="space-y-3 p-4">
        <div className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Free delivery in 15 minutes</p>
          <p className="text-xs text-muted-foreground">Shipment of {lines.length} items</p>
          <div className="mt-3 space-y-3">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <img src={l.image} alt={l.name} className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.unit}</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary px-2 py-1 text-primary-foreground">
                  <button aria-label="Remove one" onClick={() => actions.removeItem(l.id)} className="px-1 font-bold">−</button>
                  <span className="text-xs font-bold">{l.qty}</span>
                  <button aria-label="Add one" onClick={() => actions.addItem(l.id)} className="px-1 font-bold">+</button>
                </div>
                <p className="w-14 text-right text-sm font-bold">{inr(l.price * l.qty)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-soft border border-border p-3">
          <label className="block text-xs font-semibold text-muted-foreground">Delivery address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-border bg-card p-2.5 text-sm outline-none focus:border-primary"
          />
          {!serviceable ? (
            <p className="mt-2 text-xs font-semibold text-destructive">
              Sorry, Thaleewala is not available at this location yet.
            </p>
          ) : null}
        </div>

        <div className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Coupon</p>
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="FEST20"
              className="flex-1 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                const ok = actions.applyCoupon(code);
                setCouponMsg(ok ? "Coupon applied" : "Invalid coupon code");
              }}
              className="rounded-xl border border-primary px-4 text-sm font-bold text-primary"
            >
              APPLY
            </button>
          </div>
          {couponMsg ? <p className="mt-1 text-xs text-muted-foreground">{couponMsg}</p> : null}
        </div>

        <div className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Bill details</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            <Row label="Item total (MRP)" value={inr(bill.mrpTotal)} />
            <Row label="Stall discount" value={`− ${inr(bill.discount)}`} good />
            {bill.coupon ? <Row label={`Coupon ${coupon?.code}`} value={`− ${inr(bill.coupon)}`} good /> : null}
            <Row label="Handling fee" value={inr(bill.handling)} />
            {bill.surge ? <Row label="Small order fee" value={inr(bill.surge)} /> : null}
            <Row label="Delivery fee" value={bill.delivery ? inr(bill.delivery) : "FREE"} />
            <Row label="Charity contribution (2%)" value={inr(bill.charity)} />
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>To pay</span>
              <span>{inr(bill.grand)}</span>
            </div>
          </dl>
        </div>

        <div className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Payment method</p>
          <div className="mt-2 grid gap-2">
            {PAYMENTS.map((m) => (
              <button
                key={m}
                onClick={() => setPayment(m)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
                  payment === m ? "border-primary text-primary" : "border-border"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[62px] z-40 mx-auto w-full max-w-[480px] px-3">
        <button
          disabled={!serviceable}
          onClick={() => {
            const order = actions.placeOrder(payment, address);
            navigate({ to: "/orders/$id", params: { id: order.id } });
          }}
          className="flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg disabled:opacity-50"
        >
          <span className="text-sm font-bold">{inr(bill.grand)}</span>
          <span className="text-sm font-bold">PLACE ORDER ›</span>
        </button>
      </div>
    </Shell>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={good ? "font-semibold text-primary" : ""}>{value}</dd>
    </div>
  );
}
