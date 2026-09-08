import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LiveMap } from "@/components/LiveMap";
import { PortalHeader, Shell } from "@/components/Shell";
import { VENDORS } from "@/lib/data";
import { STATUS_LABEL, inr, useApp } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order tracking — Thaleewala" },
      { name: "description", content: "Live rider location, ETA and your delivery OTP." },
      { property: "og:title", content: "Order tracking — Thaleewala" },
      { property: "og:description", content: "Follow your street food order from stall to doorstep." },
    ],
  }),
  component: Track,
});

const FLOW: OrderStatus[] = [
  "PLACED",
  "VENDOR_ACCEPTED",
  "PREPARING",
  "PACKED",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

function Track() {
  const { id } = Route.useParams();
  const order = useApp((s) => s.orders.find((o) => o.id === id));
  const [eta, setEta] = useState<{ min: number; km: number } | null>(null);

  if (!order) {
    return (
      <Shell>
        <PortalHeader title="Order not found" />
        <p className="p-4 text-sm text-muted-foreground">This order is no longer available.</p>
      </Shell>
    );
  }

  const vendor = VENDORS.find((v) => v.id === order.vendorId)!;
  const step = FLOW.indexOf(order.status);
  const delivered = order.status === "DELIVERED";

  return (
    <Shell>
      <header className="bg-primary px-4 py-4 text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold">
              {delivered ? "Order delivered" : `Order is on the way · ${eta ? `${eta.min} min` : "15 min"}`}
            </p>
            <p className="text-xs opacity-90">Live from {vendor.stallName}</p>
            <p className="mt-1 text-xs opacity-90">#{order.id}</p>
          </div>
          {order.status === "OUT_FOR_DELIVERY" ? (
            <div className="rounded-xl bg-primary-foreground/15 px-3 py-2 text-center">
              <p className="text-[10px] font-bold tracking-wide">DELIVERY OTP</p>
              <p className="text-xl font-extrabold tracking-[0.2em]">{order.deliveryOtp}</p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="p-4">
        <LiveMap
          from={vendor.location}
          to={order.drop}
          className="h-56 w-full overflow-hidden rounded-2xl"
          onEta={(min, km) => setEta({ min, km })}
        />
        {order.status === "OUT_FOR_DELIVERY" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Share the OTP with the delivery partner only after you receive your order.
          </p>
        ) : null}

        <div className="card-soft mt-3 border border-border p-3">
          <p className="text-sm font-bold">Order status</p>
          <ol className="mt-3 space-y-3">
            {FLOW.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                    i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i <= step ? "✓" : i + 1}
                </span>
                <span className={`text-sm ${i <= step ? "font-semibold" : "text-muted-foreground"}`}>
                  {STATUS_LABEL[s]}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {order.proofPhoto ? (
          <div className="card-soft mt-3 border border-border p-3">
            <p className="text-sm font-bold">Delivery proof</p>
            <img src={order.proofPhoto} alt="Parcel handover" className="mt-2 w-full rounded-xl" />
          </div>
        ) : null}

        <div className="card-soft mt-3 border border-border p-3">
          <p className="text-sm font-bold">Bill</p>
          <div className="mt-2 space-y-1 text-sm">
            {order.lines.map((l) => (
              <div key={l.productId} className="flex justify-between">
                <span className="text-muted-foreground">
                  {l.name} × {l.qty}
                </span>
                <span>{inr(l.price * l.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 font-bold">
              <span>Paid via {order.payment}</span>
              <span>{inr(order.bill.grand)}</span>
            </div>
          </div>
        </div>

        <a
          href="tel:9078492360"
          className="mt-3 block rounded-xl border border-border py-3 text-center text-sm font-bold"
        >
          Need help with this order?
        </a>
      </div>
    </Shell>
  );
}
