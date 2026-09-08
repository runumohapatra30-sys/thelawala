import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { LiveMap } from "@/components/LiveMap";
import { supabase } from "@/integrations/supabase/client";
import { inr, STATUS_LABEL } from "@/lib/fees";

export const Route = createFileRoute("/orders/$id")({
  validateSearch: (s: Record<string, unknown>): { placed?: 1 } => (s['placed'] ? { placed: 1 } : {}),
  head: () => ({
    meta: [
      { title: "Track your order — Thaleewala" },
      { name: "description", content: "Live map tracking, delivery OTP, rider details and bill for your Thaleewala order." },
      { property: "og:title", content: "Track your order — Thaleewala" },
      { property: "og:description", content: "Watch your street food arrive in 15 minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Track,
});

const FLOW = ["PLACED", "VENDOR_ACCEPTED", "PREPARING", "READY", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];
const REASONS = [
  "Ordered by mistake",
  "Taking too long",
  "Wrong address entered",
  "Found a better option",
  "Other reason",
];

type Order = {
  id: string; code: string; status: string; grand_total: number; food_total: number;
  delivery_fee: number; platform_fee: number; handling_fee: number; packing_fee: number;
  surge_fee: number; penalty_fee: number; distance_km: number; delivery_otp: string;
  drop_lat: number; drop_lng: number; vendor_id: string; partner_id: string | null;
  payment_mode: string; address_line: string; proof_photo_url: string | null; created_at: string;
};

function Track() {
  const { id } = Route.useParams();
  const { placed } = Route.useSearch();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<{ id: string; name: string; qty: number; price: number; photo_url: string | null }[]>([]);
  const [vendor, setVendor] = useState<{ stall_name: string; lat: number; lng: number; mobile: string | null } | null>(null);
  const [rider, setRider] = useState<{ name: string; mobile: string | null; lat: number | null; lng: number | null } | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);
  const [splash, setSplash] = useState(Boolean(placed));
  const [refundMsg, setRefundMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!splash) return;
    const t = setTimeout(() => setSplash(false), 1800);
    return () => clearTimeout(t);
  }, [splash]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (!alive || !data) return;
      setOrder(data as Order);
      if (!vendor) {
        const { data: v } = await supabase.from("vendors").select("stall_name,lat,lng,mobile").eq("id", data.vendor_id).maybeSingle();
        if (v) setVendor(v);
      }
      if (data.partner_id) {
        const { data: r } = await supabase.from("delivery_partners").select("name,mobile,lat,lng").eq("id", data.partner_id).maybeSingle();
        if (r) setRider(r);
      }
    };
    load();
    supabase.from("order_items").select("id,name,qty,price,photo_url").eq("order_id", id).then(({ data }) => setItems(data ?? []));
    const timer = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id]);

  async function cancelOrder() {
    if (!order) return;
    await supabase
      .from("orders")
      .update({ status: "CANCELLED", cancel_reason: reason, cancelled_at: new Date().toISOString(), cancelled_by: "CUSTOMER" })
      .eq("id", order.id);
    setCancelOpen(false);
    setOrder({ ...order, status: "CANCELLED" });
  }

  if (!order) {
    return (
      <Shell>
        <PortalHeader title="Tracking" />
        <p className="px-4 py-20 text-center text-sm text-muted-foreground">Loading your order…</p>
      </Shell>
    );
  }

  const stepIndex = FLOW.indexOf(order.status);
  const cancellable = ["PLACED", "VENDOR_ACCEPTED"].includes(order.status);
  const live = !["DELIVERED", "CANCELLED"].includes(order.status);

  return (
    <Shell>
      {splash ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-primary text-primary-foreground">
          <div className="animate-pulse text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/20">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M4 12.5l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-extrabold">Order placed!</p>
            <p className="text-xs opacity-90">Your thela is getting it ready</p>
          </div>
        </div>
      ) : null}

      <div className="bg-primary px-4 pb-5 pt-4 text-primary-foreground">
        <p className="text-xs opacity-90">#{order.code}</p>
        <p className="text-xl font-extrabold">{STATUS_LABEL[order.status] ?? order.status}</p>
        <p className="mt-1 text-xs opacity-90">
          {live ? (eta ? `Arriving in about ${Math.max(5, Math.round(eta))} minutes` : "Arriving in about 15 minutes") : "Order closed"}
        </p>
      </div>

      <div className="space-y-3 p-4">
        {live && vendor ? (
          <LiveMap
            from={{ lat: Number(vendor.lat), lng: Number(vendor.lng) }}
            to={{ lat: Number(order.drop_lat), lng: Number(order.drop_lng) }}
            rider={rider?.lat && rider?.lng ? { lat: Number(rider.lat), lng: Number(rider.lng) } : null}
            onEta={(min) => setEta(min)}
            className="h-56 w-full overflow-hidden rounded-2xl border border-border"
          />
        ) : null}

        {order.status === "OUT_FOR_DELIVERY" ? (
          <div className="card-soft border border-primary p-3 text-center">
            <p className="text-xs font-semibold text-muted-foreground">Share this OTP with the delivery partner</p>
            <p className="mt-1 text-3xl font-extrabold tracking-[0.3em] text-primary">{order.delivery_otp}</p>
          </div>
        ) : null}

        {rider ? (
          <div className="card-soft flex items-center gap-3 border border-border p-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-sm font-bold">
              {rider.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{rider.name}</p>
              <p className="text-xs text-muted-foreground">Your delivery partner</p>
            </div>
            {rider.mobile ? (
              <a href={`tel:${rider.mobile}`} className="rounded-xl border border-primary px-3 py-2 text-xs font-bold text-primary">
                Call
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Order journey</p>
          <ol className="mt-2 space-y-2">
            {FLOW.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />
                <span className={i <= stepIndex ? "font-semibold" : "text-muted-foreground"}>{STATUS_LABEL[s]}</span>
              </li>
            ))}
          </ol>
        </div>

        {order.proof_photo_url ? (
          <div className="card-soft border border-border p-3">
            <p className="text-sm font-bold">Delivery proof</p>
            <img src={order.proof_photo_url} alt="Parcel handover proof" className="mt-2 w-full rounded-xl object-cover" />
          </div>
        ) : null}

        <div className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Items</p>
          <div className="mt-2 space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3">
                <img src={it.photo_url ?? "/food/food-tiffin.jpg"} alt={it.name} className="h-10 w-10 rounded-lg object-cover" />
                <p className="flex-1 truncate text-sm">{it.name} × {it.qty}</p>
                <p className="text-sm font-semibold">{inr(Number(it.price) * it.qty)}</p>
              </div>
            ))}
          </div>
          <dl className="mt-3 space-y-1.5 border-t border-border pt-2 text-sm">
            <Row label="Item total" value={inr(Number(order.food_total))} />
            <Row label={`Delivery fee (${order.distance_km} km)`} value={Number(order.delivery_fee) ? inr(Number(order.delivery_fee)) : "FREE"} />
            {Number(order.platform_fee) ? <Row label="Platform fee" value={inr(Number(order.platform_fee))} /> : null}
            {Number(order.handling_fee) ? <Row label="Handling fee" value={inr(Number(order.handling_fee))} /> : null}
            {Number(order.packing_fee) ? <Row label="Packing fee" value={inr(Number(order.packing_fee))} /> : null}
            {Number(order.surge_fee) ? <Row label="Surge fee" value={inr(Number(order.surge_fee))} /> : null}
            {Number(order.penalty_fee) ? <Row label="Cancellation fee" value={inr(Number(order.penalty_fee))} /> : null}
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>Total ({order.payment_mode === "COD" ? "Cash on delivery" : "Paid online"})</span>
              <span>{inr(Number(order.grand_total))}</span>
            </div>
          </dl>
        </div>

        <div className="flex gap-2">
          <a href="tel:9078492360" className="flex-1 rounded-xl border border-border py-2.5 text-center text-sm font-bold">
            Call support
          </a>
          {cancellable ? (
            <button onClick={() => setCancelOpen(true)} className="flex-1 rounded-xl border border-destructive py-2.5 text-sm font-bold text-destructive">
              Cancel order
            </button>
          ) : null}
        </div>
        <Link to="/terms" className="block text-center text-[11px] text-muted-foreground underline">
          Cancellation &amp; refund terms
        </Link>
      </div>

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="mx-auto w-full max-w-[480px] rounded-t-2xl bg-card p-4">
            <p className="text-sm font-bold">Why are you cancelling?</p>
            <div className="mt-2 space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm ${reason === r ? "border-primary font-semibold text-primary" : "border-border"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Prepaid orders are refunded to your Thaleewala wallet within minutes. A small fee may apply once the stall
              has started cooking.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setCancelOpen(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold">
                Keep order
              </button>
              <button onClick={cancelOrder} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground">
                Cancel order
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
