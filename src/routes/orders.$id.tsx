import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { LiveMap } from "@/components/LiveMap";
import { supabase } from "@/integrations/supabase/client";
import { OrderChat } from "@/components/OrderChat";
import { OrderAlerts } from "@/components/OrderAlerts";
import { inr, STATUS_LABEL } from "@/lib/fees";
import { openInvoice, type InvoiceOrder } from "@/lib/invoice";
import { OrderDeliveredRating } from "@/components/OrderDeliveredRating";
import { useSession } from "@/lib/session";
import { RefundPanel } from "@/components/RefundPanel";

export const Route = createFileRoute("/orders/$id")({
  validateSearch: (s: Record<string, unknown>): { placed?: 1 } => (s['placed'] ? { placed: 1 } : {}),
  head: () => ({
    meta: [
      { title: "Track your order — ThelaWala" },
      { name: "description", content: "Live map tracking, delivery OTP, rider details and bill for your ThelaWala order." },
      { property: "og:title", content: "Track your order — ThelaWala" },
      { property: "og:description", content: "Watch your street food arrive in 15 minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Track,
});

const FLOW = ["ORDER_PLACED", "PREPARING", "READY_FOR_PICKUP", "SEARCHING_RIDER", "RIDER_ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED"];
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
  payment_status: string; wallet_paid: number; cancel_reason: string | null; tip_amount: number;
  cancel_otp: string | null;
};

const TIPS = [20, 30, 50];

function Track() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const { placed } = Route.useSearch();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<{ id: string; name: string; qty: number; price: number; photo_url: string | null }[]>([]);
  const [vendor, setVendor] = useState<{ stall_name: string; lat: number; lng: number; mobile: string | null } | null>(null);
  const [rider, setRider] = useState<{ name: string; mobile: string | null; lat: number | null; lng: number | null } | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);
  const [splash, setSplash] = useState(Boolean(placed));
  const [tipMsg, setTipMsg] = useState<string | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [rateOpen, setRateOpen] = useState(false);

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
    const timer = setInterval(load, 4000);
    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => load())
      .subscribe();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Follow the delivery partner's location live.
  const partnerId = order?.partner_id ?? null;
  useEffect(() => {
    if (!partnerId) return;
    let alive = true;
    const pull = async () => {
      const { data } = await supabase
        .from("delivery_partners")
        .select("name,mobile,lat,lng")
        .eq("id", partnerId)
        .maybeSingle();
      if (alive && data) setRider(data);
    };
    pull();
    const timer = setInterval(pull, 4000);
    const ch = supabase
      .channel(`partner-${partnerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_partners", filter: `id=eq.${partnerId}` },
        (payload) => {
          const p = payload.new as { name: string; mobile: string | null; lat: number | null; lng: number | null };
          if (alive) setRider({ name: p.name, mobile: p.mobile, lat: p.lat, lng: p.lng });
        },
      )
      .subscribe();
    return () => {
      alive = false;
      clearInterval(timer);
      supabase.removeChannel(ch);
    };
  }, [partnerId]);

  useEffect(() => {
    if (!order || order.status !== "DELIVERED" || !user?.id) return;
    let alive = true;
    supabase
      .from("order_ratings")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle()
      .then(({ data }) => { if (alive && !data) setRateOpen(true); });
    return () => { alive = false; };
  }, [order?.status, order?.id, user?.id]);

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
  const cancellable = ["ORDER_PLACED", "PREPARING"].includes(order.status);
  const live = !["DELIVERED", "CANCELLED"].includes(order.status);

  return (
    <Shell>
      {rateOpen && order.status === "DELIVERED" ? (
        <OrderDeliveredRating
          orderId={order.id}
          userId={user?.id}
          vendorId={order.vendor_id}
          partnerId={order.partner_id}
          riderName={rider?.name ?? "your delivery partner"}
          stallName={vendor?.stall_name ?? "the stall"}
          deliveredAt={(order as unknown as { delivered_at: string | null }).delivered_at}
          onDone={() => setRateOpen(false)}
        />
      ) : null}

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

      <div className="bg-primary px-5 pb-6 pt-4 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Link to="/orders" aria-label="Back to orders" className="press grid h-9 w-9 place-items-center rounded-full bg-white/20">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="text-sm font-semibold opacity-90">{STATUS_LABEL[order.status] ?? order.status} · #{order.code}</p>
        </div>
        <p className="mt-3 font-display text-3xl leading-tight">
          {live
            ? `Arriving in ${eta ? Math.max(5, Math.round(eta)) : 10}-${eta ? Math.max(10, Math.round(eta) + 5) : 15} minutes`
            : STATUS_LABEL[order.status] ?? order.status}
        </p>
      </div>

       <div className="space-y-3 p-4">
        {live && vendor ? (
           <section>
             <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
               <div className="min-w-0">
                 <h2 className="font-display text-2xl text-primary">Live delivery</h2>
                 <p className="truncate text-[11px] font-semibold text-muted-foreground">Tracking the route to {order.address_line}</p>
               </div>
               <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground">{order.distance_km} km</span>
             </div>
             <LiveMap
               from={{ lat: Number(vendor.lat), lng: Number(vendor.lng) }}
               to={{ lat: Number(order.drop_lat), lng: Number(order.drop_lng) }}
               rider={rider?.lat && rider?.lng ? { lat: Number(rider.lat), lng: Number(rider.lng) } : null}
               onEta={(min) => setEta(min)}
               className="h-[46vh] min-h-80 max-h-[460px] w-full overflow-hidden rounded-2xl border border-border shadow-card"
             />
           </section>
        ) : null}

        {live && order.cancel_otp ? (
          <div className="card-soft border-2 border-destructive p-4 text-center animate-pulse">
            <p className="text-xs font-semibold text-destructive">
              Your delivery partner wants to cancel this order
              {order.cancel_reason ? ` · ${order.cancel_reason}` : ""}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Share this cancel PIN with the delivery partner only if you agree to cancel
            </p>
            <div className="mt-2 flex justify-center gap-2">
              {String(order.cancel_otp).split("").map((d, i) => (
                <span key={i} className="grid h-12 w-11 place-items-center rounded-xl bg-destructive text-2xl font-black text-destructive-foreground">
                  {d}
                </span>
              ))}
            </div>
          </div>
        ) : live ? (
          <div className="card-soft border-2 border-primary p-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground">
              Share this OTP with your delivery partner at delivery
            </p>
            <div className="mt-2 flex justify-center gap-2">
              {String(order.delivery_otp ?? "").split("").map((d, i) => (
                <span key={i} className="grid h-12 w-11 place-items-center rounded-xl bg-primary text-2xl font-black text-primary-foreground">
                  {d}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {live && order.payment_status !== "PAID" ? (
          <div className="card-soft grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-border p-3">
            <p className="min-w-0 text-sm font-bold">
              Pay {inr(Number(order.grand_total) + Number(order.tip_amount ?? 0))} before or on delivery
            </p>
            <Link to="/wallet" className="press shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground">
              Pay Online
            </Link>
          </div>
        ) : null}

        {rider ? (
          <div className="card-soft border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-base font-black text-brand-foreground">
                {rider.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">I&apos;m {rider.name}, your delivery partner</p>
                <p className="mt-1 inline-block rounded-full bg-[color-mix(in_oklab,var(--color-primary)_12%,white)] px-2.5 py-1 text-[11px] font-bold text-primary">
                  On the way with your order
                </p>
              </div>
              {rider.mobile ? (
                <a
                  href={`tel:${rider.mobile}`}
                  aria-label={`Call ${rider.name}`}
                  className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 4h3l2 5-2 1a12 12 0 006 6l1-2 5 2v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" strokeLinejoin="round" />
                  </svg>
                </a>
              ) : null}
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs font-bold">Tip your delivery partner</p>
              <p className="text-[11px] text-muted-foreground">100% of the tip goes to {rider.name}.</p>
              <div className="mt-2 flex gap-2">
                {TIPS.map((t) => (
                  <button
                    key={t}
                    onClick={async () => {
                      const { error } = await supabase.from("orders").update({ tip_amount: t }).eq("id", order.id);
                      if (error) return setTipMsg("Could not add the tip right now.");
                      setOrder({ ...order, tip_amount: t });
                      setTipMsg(`₹${t} tip added. Thank you!`);
                    }}
                    className={`press flex-1 rounded-xl border py-2 text-xs font-black ${
                      Number(order.tip_amount) === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"
                    }`}
                  >
                    ₹{t}
                  </button>
                ))}
                <input
                  inputMode="numeric"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  onBlur={async () => {
                    const t = Number(customTip);
                    if (!t || t > 500) return;
                    const { error } = await supabase.from("orders").update({ tip_amount: t }).eq("id", order.id);
                    if (error) return setTipMsg("Could not add the tip right now.");
                    setOrder({ ...order, tip_amount: t });
                    setTipMsg(`₹${t} tip added. Thank you!`);
                  }}
                  placeholder="Other"
                  className="w-16 rounded-xl border border-border px-2 py-2 text-center text-xs font-bold outline-none focus:border-primary"
                />
              </div>
              {tipMsg ? <p className="mt-2 text-[11px] font-bold text-primary">{tipMsg}</p> : null}
            </div>
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
            {Number(order.tip_amount) ? <Row label="Delivery partner tip" value={inr(Number(order.tip_amount))} /> : null}
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>Total ({order.payment_mode === "COD" ? "Cash on delivery" : "Paid online"})</span>
              <span>{inr(Number(order.grand_total) + Number(order.tip_amount ?? 0))}</span>
            </div>
          </dl>
        </div>

        <button
          onClick={() => openInvoice(order as unknown as InvoiceOrder, items.map((i) => ({ name: i.name, qty: i.qty, price: Number(i.price) })), vendor?.stall_name ?? "ThelaWala stall")}
          className="press w-full rounded-xl border border-primary py-2.5 text-sm font-black text-primary"
        >
          🧾 Download bill (PDF)
        </button>

        {order.partner_id && order.status !== "DELIVERED" && order.status !== "CANCELLED" ? (
          <OrderChat orderId={order.id} role="CUSTOMER" senderId={user?.id} />
        ) : null}

        <OrderAlerts userId={user?.id} />

        <div className="flex gap-2">
          <Link
            to="/support"
            search={{ order: order.id }}
            className="flex-1 rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground"
          >
            Chat with support
          </Link>
          <a href="tel:9078492360" className="flex-1 rounded-xl border border-border py-2.5 text-center text-sm font-bold">
            Call support
          </a>
          {cancellable ? (
            <button onClick={() => setCancelOpen(true)} className="flex-1 rounded-xl border border-destructive py-2.5 text-sm font-bold text-destructive">
              Cancel order
            </button>
          ) : null}
        </div>
        {order.payment_mode !== "COD" && (order.payment_status === "PAID" || Number(order.wallet_paid) > 0) &&
        (order.status === "CANCELLED" || order.status === "DELIVERED") ? (
          <RefundPanel orderId={order.id} amount={Math.max(0, Number(order.grand_total) - Number(order.penalty_fee ?? 0))} />
        ) : null}

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
              Prepaid orders are refunded to your ThelaWala wallet within minutes. A small fee may apply once the stall
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
