import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
import { Bike, Check, Clock3, Home, MessageCircle, PackageOpen, PhoneCall, ShoppingBasket, Star } from "lucide-react";

export const Route = createFileRoute("/orders/$id")({
  validateSearch: (s: Record<string, unknown>): { placed?: 1 } => (s['placed'] ? { placed: 1 } : {}),
  head: () => ({
    meta: [
      { title: "Track your order — ThelaWala" },
      { name: "description", content: "Live map tracking, delivery OTP, rider details and bill for your ThelaWala order." },
      { property: "og:title", content: "Track your order — ThelaWala" },
      { property: "og:description", content: "Follow your order status and delivery route in real time." },
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
  drop_lat: number | null; drop_lng: number | null; vendor_id: string; partner_id: string | null;
  payment_mode: string; address_line: string; proof_photo_url: string | null; created_at: string;
  payment_status: string; wallet_paid: number; cancel_reason: string | null; tip_amount: number;
  cancel_otp: string | null;
};

const TIPS = [20, 30, 50];

function hasCoordinates(lat: number | null | undefined, lng: number | null | undefined) {
  if (lat == null || lng == null) return false;
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 &&
    (latitude !== 0 || longitude !== 0);
}

function formatArrivalWindow(etaMinutes: number | null, prepMinutes: number | null | undefined) {
  if (etaMinutes == null) return "Calculating…";
  const earliest =
    Date.now() + (Math.max(0, etaMinutes) + Math.max(0, prepMinutes ?? 0)) * 60_000;
  const format = (time: number) =>
    new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${format(earliest)} – ${format(earliest + 15 * 60_000)}`;
}

function Track() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const { placed } = Route.useSearch();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<{ id: string; name: string; qty: number; price: number; photo_url: string | null }[]>([]);
  const [vendor, setVendor] = useState<{ stall_name: string; lat: number | null; lng: number | null; mobile: string | null; default_prep_minutes: number | null } | null>(null);
  const [deals, setDeals] = useState<{ id: string; name: string; photo_url: string | null; unit: string | null; price: number; mrp: number }[]>([]);
  const [rider, setRider] = useState<{ name: string; mobile: string | null; lat: number | null; lng: number | null; photo_url: string | null; profile_photo_url: string | null } | null>(null);
  const [riderRating, setRiderRating] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showJourney, setShowJourney] = useState(true);
  const [reason, setReason] = useState(REASONS[0]!);
  const [splash, setSplash] = useState(Boolean(placed));
  const [tipMsg, setTipMsg] = useState<string | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [rateOpen, setRateOpen] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (!alive) return;
      if (!data) { setMissing(true); return; }
      setMissing(false);
      setOrder(data as Order);
      if (data.partner_id) {
        const { data: r } = await supabase.from("delivery_partners").select("name,mobile,lat,lng,photo_url,profile_photo_url").eq("id", data.partner_id).maybeSingle();
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

  useEffect(() => {
    if (!order?.vendor_id) return;
    let alive = true;
    const loadStallContent = async () => {
      const [vendorResult, dealResult] = await Promise.all([
        supabase.from("vendors").select("stall_name,lat,lng,mobile,default_prep_minutes").eq("id", order.vendor_id).maybeSingle(),
        supabase.from("menu_items").select("id,name,photo_url,unit,price,mrp").eq("vendor_id", order.vendor_id).eq("in_stock", true).gte("price", 49).order("price").limit(8),
      ]);
      if (!alive) return;
      if (vendorResult.data) setVendor(vendorResult.data);
      setDeals((dealResult.data ?? []) as typeof deals);
    };
    void loadStallContent();
    return () => { alive = false; };
  }, [order?.vendor_id]);

  // Follow the delivery partner's location live.
  const partnerId = order?.partner_id ?? null;
  useEffect(() => {
    if (!partnerId) return;
    let alive = true;
    const pull = async () => {
      const { data } = await supabase
        .from("delivery_partners")
        .select("name,mobile,lat,lng,photo_url,profile_photo_url")
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
          const p = payload.new as { name: string; mobile: string | null; lat: number | null; lng: number | null; photo_url: string | null; profile_photo_url: string | null };
          if (alive) setRider({ name: p.name, mobile: p.mobile, lat: p.lat, lng: p.lng, photo_url: p.photo_url, profile_photo_url: p.profile_photo_url });
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
    if (!partnerId) {
      setRiderRating(null);
      return;
    }
    let alive = true;
    void supabase
      .from("order_ratings")
      .select("delivery_stars")
      .eq("partner_id", partnerId)
      .then(({ data }) => {
        if (!alive) return;
        const ratings = (data ?? [])
          .map((row) => Number(row.delivery_stars))
          .filter((rating) => Number.isFinite(rating) && rating > 0);
        setRiderRating(
          ratings.length
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : null,
        );
      });
    return () => {
      alive = false;
    };
  }, [partnerId]);

  const currentOrderId = order?.id;
  const currentOrderStatus = order?.status;
  useEffect(() => {
    if (!currentOrderId || currentOrderStatus !== "DELIVERED" || !user?.id) return;
    let alive = true;
    supabase
      .from("order_ratings")
      .select("id")
      .eq("order_id", currentOrderId)
      .maybeSingle()
      .then(({ data }) => { if (alive && !data) setRateOpen(true); });
    return () => { alive = false; };
  }, [currentOrderId, currentOrderStatus, user?.id]);

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
        {missing ? (
          <div className="px-6 py-20 text-center">
            <p className="text-sm font-bold">We couldn't open this order.</p>
            <p className="mt-1 text-xs text-muted-foreground">Please sign in with the Google account you ordered from.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link to="/auth" className="press rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground">Sign in with Google</Link>
              <Link to="/orders" className="press rounded-full border border-border px-4 py-2 text-xs font-black">My orders</Link>
            </div>
          </div>
        ) : (
          <p className="px-4 py-20 text-center text-sm text-muted-foreground">Loading your order…</p>
        )}
      </Shell>
    );
  }

  const stepIndex = FLOW.indexOf(order.status);
  const cancellable = ["ORDER_PLACED", "PREPARING"].includes(order.status);
  const live = !["DELIVERED", "CANCELLED"].includes(order.status);
  const etaMinutes = eta == null ? null : Math.max(0, Math.round(eta));
  const isOnTheWay = order.status === "OUT_FOR_DELIVERY";
  const trackingStatus = isOnTheWay ? "Out for delivery" : "Order getting packed!";
  const vendorPoint = vendor && hasCoordinates(vendor.lat, vendor.lng)
    ? { lat: Number(vendor.lat), lng: Number(vendor.lng) }
    : null;
  const destinationPoint = hasCoordinates(order.drop_lat, order.drop_lng)
    ? { lat: Number(order.drop_lat), lng: Number(order.drop_lng) }
    : null;
  const riderPoint = rider && hasCoordinates(rider.lat, rider.lng)
    ? { lat: Number(rider.lat), lng: Number(rider.lng) }
    : null;

  if (live) {
    return (
      <Shell>
        <div className="fixed inset-0 z-[50] overflow-hidden bg-muted">
          {vendorPoint && destinationPoint ? (
            <LiveMap
              from={vendorPoint}
              to={destinationPoint}
              rider={riderPoint}
              onEta={(minutes, km) => {
                setEta(minutes);
                setDistanceKm(km);
              }}
              className="absolute inset-0 h-full w-full !rounded-none"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm font-semibold text-muted-foreground">Live map is unavailable. Your latest order status is shown below.</div>
          )}

          <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 mx-auto flex max-w-[480px] items-center gap-3 rounded-xl border border-border bg-white/95 p-3 shadow-xl backdrop-blur">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary"><ShoppingBasket className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-foreground">{etaMinutes == null ? STATUS_LABEL[order.status] ?? order.status : `Arrives ${formatArrivalWindow(etaMinutes, isOnTheWay ? 0 : vendor?.default_prep_minutes)}`}</p>
              <p className="truncate text-[11px] font-medium text-muted-foreground">{isOnTheWay ? "Your order is out for delivery" : "Your order is getting packed"}</p>
            </div>
            <button type="button" onClick={() => setShowJourney((visible) => !visible)} aria-expanded={showJourney} className="shrink-0 rounded-lg border border-primary px-3 py-2 text-[10px] font-black text-primary">TRACK ORDER</button>
          </motion.header>

          <motion.section initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} id="tracking-status" className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mx-auto max-h-[58dvh] max-w-[480px] space-y-3 overflow-y-auto rounded-2xl border border-[#EBECEF] bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-primary">{vendor?.stall_name ?? "ThelaWala"}</p>
                <h1 className="mt-1 text-lg font-black text-foreground">{placed ? "Order placed successfully" : trackingStatus}</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">{isOnTheWay ? "Your order is on the way." : "Your food is being packed at the stall."}</p>
              </div>
              {etaMinutes != null ? <span className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-soft px-2.5 py-2 text-xs font-black text-primary"><Clock3 className="h-3.5 w-3.5" />{etaMinutes} min</span> : null}
            </div>

            <div className="flex items-center gap-3 border-y border-[#EBECEF] py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-primary"><Bike className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-foreground">{vendor?.stall_name ?? "Your food stall"}</p>
                <p className="text-[10px] text-muted-foreground">Order #{order.code} · {order.address_line}</p>
              </div>
              {vendor?.mobile ? <a href={`tel:${vendor.mobile}`} aria-label={`Call ${vendor.stall_name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><PhoneCall className="h-4 w-4" /></a> : null}
              {order.partner_id ? (
                <button type="button" onClick={() => setChatOpen((open) => !open)} aria-label={chatOpen ? "Close delivery chat" : "Message delivery partner"} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-primary"><MessageCircle className="h-4 w-4" /></button>
              ) : (
                <Link to="/support" search={{ order: order.id }} aria-label="Message support about this order" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-primary"><MessageCircle className="h-4 w-4" /></Link>
              )}
            </div>

            {rider ? (
              <div className="flex items-center gap-2 rounded-2xl bg-[#FAF7F2] p-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#E8F5EC] text-sm font-extrabold text-[#16803C]">
                  {rider.profile_photo_url || rider.photo_url ? (
                    <img
                      src={rider.profile_photo_url || rider.photo_url || ""}
                      alt={rider.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    rider.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold">{rider.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-bold">
                    <span className="rounded-full bg-white px-2 py-0.5 text-muted-foreground">Delivery partner</span>
                    <span className="inline-flex items-center gap-0.5 text-[#8A6420]">
                      <Star className="h-3 w-3 fill-current" />
                      {riderRating == null ? "New" : `${riderRating.toFixed(1)} / 5`}
                    </span>
                  </div>
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-primary" aria-label="Delivery by bike">
                  <Bike className="h-4 w-4" />
                </span>
                <button
                  type="button"
                  onClick={() => setChatOpen((open) => !open)}
                  aria-label="Chat with delivery partner"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E8F5EC] text-[#16803C]"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                {rider.mobile ? (
                  <a
                    href={`tel:${rider.mobile}`}
                    aria-label={`Call ${rider.name}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-white"
                  >
                    <PhoneCall className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-start gap-3 rounded-2xl border border-[#E5EAE5] bg-white p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E8F5EC] text-[#16803C]">
                <Home className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Delivery address</p>
                <p className="mt-0.5 line-clamp-2 text-xs font-semibold">{order.address_line}</p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-[10px] font-semibold text-muted-foreground">Distance from you</span>
                <span className="mt-0.5 block text-xs font-extrabold">
                  {distanceKm == null ? `${Number(order.distance_km).toFixed(1)} km` : `${distanceKm.toFixed(1)} km`}
                </span>
              </span>
            </div>

            {showJourney ? (
              <ol className="grid grid-cols-4 gap-1" aria-label="Order progress">
                {["Preparing", "Picked up", "On the way", "Delivered"].map((label, index) => {
                  const current = stepIndex >= [1, 2, 5, 6][index]!;
                  return <li key={label} className={`rounded-xl px-1 py-2 text-center text-[9px] font-bold ${current ? "bg-brand-soft text-primary" : "bg-muted text-muted-foreground"}`}><span className="mx-auto mb-1 block h-1.5 w-1.5 rounded-full bg-current" />{label}</li>;
                })}
              </ol>
            ) : null}

            {chatOpen && order.partner_id ? <OrderChat orderId={order.id} role="CUSTOMER" senderId={user?.id} /> : null}

            {deals.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-black text-[#111827]">Deals from ₹49</h2>
                  <span className="text-[10px] font-semibold text-[#6B7280]">From this stall</span>
                </div>
                <div className="flex snap-x gap-2 overflow-x-auto pb-1">
                  {deals.map((deal) => (
                    <article key={deal.id} className="w-28 shrink-0 snap-start overflow-hidden rounded-lg border border-[#EBECEF] bg-white">
                      <img src={deal.photo_url ?? "/food/food-tiffin.jpg"} alt={deal.name} className="aspect-square w-full object-cover" />
                      <div className="p-2">
                        <p className="truncate text-[11px] font-bold text-[#111827]">{deal.name}</p>
                        <p className="text-xs font-black text-primary">{inr(Number(deal.price))}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {cancellable ? <button type="button" onClick={() => setCancelOpen(true)} className="w-full border-t border-[#EBECEF] pt-2 text-left text-[11px] font-bold text-destructive">Cancel order</button> : null}
          </motion.section>

          {cancelOpen ? (
            <div className="fixed inset-0 z-[70] flex items-end bg-black/40" onClick={() => setCancelOpen(false)}>
              <div className="mx-auto w-full max-w-[480px] rounded-t-2xl bg-white p-4" onClick={(event) => event.stopPropagation()}>
                <p className="text-sm font-bold">Why are you cancelling?</p>
                <div className="mt-2 space-y-2">{REASONS.map((choice) => <button key={choice} onClick={() => setReason(choice)} className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm ${reason === choice ? "border-primary font-semibold text-primary" : "border-border"}`}>{choice}</button>)}</div>
                <div className="mt-3 flex gap-2"><button onClick={() => setCancelOpen(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold">Keep order</button><button onClick={cancelOrder} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-white">Cancel order</button></div>
              </div>
            </div>
          ) : null}
        </div>
      </Shell>
    );
  }

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#FAF7F2] px-5 py-8 text-foreground">
          <div className="relative my-auto w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-sm">
            <span className="absolute left-[12%] top-7 h-2 w-2 rotate-12 rounded-sm bg-[#FF5A1F]" />
            <span className="absolute right-[15%] top-12 h-2.5 w-2.5 rounded-full bg-[#FFC857]" />
            <span className="absolute left-[18%] top-24 h-1.5 w-1.5 rounded-full bg-[#75B798]" />
            <span className="absolute right-[21%] top-28 h-2 w-2 rotate-45 rounded-sm bg-[#FF8B5E]" />
            <span className="absolute left-[31%] top-4 h-2 w-2 rounded-full bg-[#8CB8E8]" />
            <span className="absolute right-[34%] top-6 h-1.5 w-1.5 rounded-full bg-[#E7A9C3]" />
            <div className="mx-auto grid h-[76px] w-[76px] place-items-center rounded-full bg-[#A9D9B9] shadow-sm">
              <Check className="h-10 w-10 text-white" strokeWidth={3.5} />
            </div>
            <p className="mt-5 text-2xl font-extrabold tracking-tight">Order placed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {vendor?.stall_name ? `Preparing your food at ${vendor.stall_name}` : "Preparing your food"}
            </p>
            <p className="mt-4 inline-flex rounded-full bg-[#FFF0E9] px-4 py-2 text-xs font-extrabold text-primary">#{order.code}</p>
            <div className="mt-4 rounded-2xl bg-[#FAF7F2] p-4 text-left">
              <div className="flex items-start justify-between gap-2">
                <span>
                  <span className="block text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Estimated arrival</span>
                  <span className="mt-1 block text-lg font-extrabold">
                    {formatArrivalWindow(eta, vendor?.default_prep_minutes)}
                  </span>
                </span>
                <span className="rounded-full bg-[#E8F5EC] px-2.5 py-1 text-[10px] font-extrabold text-[#16803C]">On time</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E7E2DB]">
                <div className="h-full w-1/4 rounded-full bg-[#FF5A1F]" />
              </div>
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-border p-3 text-left">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E8F5EC] text-[#16803C]">
                <Home className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Delivering to</span>
                <span className="mt-1 block text-sm font-bold leading-snug">{order.address_line}</span>
              </span>
            </div>
            <button type="button" onClick={() => setSplash(false)} className="mt-4 w-full rounded-2xl bg-[#FF5A1F] px-4 py-3.5 text-sm font-extrabold text-white">Track your order</button>
            <Link to="/" className="mt-3 inline-block text-sm font-bold text-muted-foreground">Back to home</Link>
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

            {order.status !== "DELIVERED" && order.status !== "CANCELLED" ? <div className="mt-3 border-t border-border pt-3">
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
            </div> : null}
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
