import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { LiveMap } from "@/components/LiveMap";
import { supabase } from "@/integrations/supabase/client";
import { rejectOffer } from "@/lib/dispatch";
import { haversineKm, inr, STATUS_LABEL } from "@/lib/fees";
import { useSession } from "@/lib/session";
import { dlError, normalizeDl } from "@/lib/validation";

export const Route = createFileRoute("/rider")({
  head: () => ({
    meta: [
      { title: "Delivery partner portal — Thaleewala" },
      { name: "description", content: "Go online, accept nearby Thaleewala orders, verify pickup and delivery OTPs, capture proof and track your earnings." },
      { property: "og:title", content: "Delivery partner portal — Thaleewala" },
      { property: "og:description", content: "Earn with Thaleewala street food deliveries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RiderPortal,
});

type Order = {
  id: string; code: string; status: string; grand_total: number; distance_km: number;
  delivery_fee: number; customer_name: string; customer_mobile: string; address_line: string;
  drop_lat: number; drop_lng: number; vendor_id: string; partner_id: string | null;
  offered_to: string | null; offer_expires_at: string | null; rejected_partner_ids: string[];
  payment_mode: string;
};
type Partner = { id: string; name: string; status: string; is_online: boolean; is_busy: boolean; dl_number: string | null };

function RiderPortal() {
  const { user, loading } = useSession();
  const [me, setMe] = useState<Partner | null>(null);
  const [offer, setOffer] = useState<Order | null>(null);
  const [active, setActive] = useState<Order | null>(null);
  const [vendor, setVendor] = useState<{ stall_name: string; lat: number; lng: number; mobile: string | null } | null>(null);
  const [secs, setSecs] = useState(45);
  const [pickupCode, setPickupCode] = useState("");
  const [dropCode, setDropCode] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [earnings, setEarnings] = useState({ trips: 0, total: 0 });
  const [form, setForm] = useState({ name: "", mobile: "", vehicle_no: "", dl_number: "" });
  const [dlDraft, setDlDraft] = useState("");
  const [dlMsg, setDlMsg] = useState<string | null>(null);
  const [dlSaving, setDlSaving] = useState(false);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("delivery_partners").select("id,name,status,is_online,is_busy,dl_number").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setMe(data));
  }, [user?.id]);

  // Share live location while online
  useEffect(() => {
    if (!me?.is_online || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(async (p) => {
      posRef.current = { lat: p.coords.latitude, lng: p.coords.longitude };
      await supabase.from("delivery_partners").update({ lat: p.coords.latitude, lng: p.coords.longitude }).eq("id", me.id);
    });
    return () => navigator.geolocation.clearWatch(id);
  }, [me?.id, me?.is_online]);

  // Poll for offers and the current trip
  useEffect(() => {
    if (!me) return;
    const load = async () => {
      const { data: mine } = await supabase.from("orders").select("*")
        .eq("partner_id", me.id).not("status", "in", '("DELIVERED","CANCELLED")')
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      setActive((mine ?? null) as Order | null);

      if (!mine) {
        const { data: off } = await supabase.from("orders").select("*")
          .eq("offered_to", me.id).is("partner_id", null).limit(1).maybeSingle();
        setOffer((off ?? null) as Order | null);
        if (off?.offer_expires_at) {
          setSecs(Math.max(0, Math.round((new Date(off.offer_expires_at).getTime() - Date.now()) / 1000)));
        }
      } else {
        setOffer(null);
      }

      const { data: done } = await supabase.from("orders").select("delivery_fee").eq("partner_id", me.id).eq("status", "DELIVERED");
      setEarnings({ trips: done?.length ?? 0, total: (done ?? []).reduce((a, d) => a + Number(d.delivery_fee), 0) });
    };
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [me?.id]);

  useEffect(() => {
    const order = active ?? offer;
    if (!order) return;
    supabase.from("vendors").select("stall_name,lat,lng,mobile").eq("id", order.vendor_id).maybeSingle()
      .then(({ data }) => setVendor(data));
  }, [active?.id, offer?.id]);

  useEffect(() => {
    if (!offer) return;
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [offer?.id]);

  useEffect(() => {
    if (offer && secs === 0 && me) {
      rejectOffer(offer.id, me.id, offer.rejected_partner_ids ?? []);
      setOffer(null);
    }
  }, [secs, offer?.id]);

  if (loading) return <Shell><PortalHeader title="Delivery partner" /></Shell>;

  if (!user) {
    return (
      <Shell>
        <PortalHeader title="Delivery partner" />
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Sign in to start delivering.</p>
          <Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Sign in</Link>
        </div>
      </Shell>
    );
  }

  if (!me) {
    return (
      <Shell>
        <PortalHeader title="Join as delivery partner" subtitle="Approval usually takes a day" />
        <div className="space-y-2 p-4">
          {([["name", "Your name"], ["mobile", "Mobile number"], ["vehicle_no", "Vehicle number"]] as const).map(([k, label]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
              <input
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Driving licence number</span>
            <input
              value={form.dl_number}
              inputMode="text"
              autoCapitalize="characters"
              placeholder="OD02 20210012345"
              onChange={(e) => setForm({ ...form, dl_number: normalizeDl(e.target.value) })}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm uppercase outline-none ${
                form.dl_number && dlError(form.dl_number) ? "border-destructive" : "border-border focus:border-primary"
              }`}
            />
            {form.dl_number && dlError(form.dl_number) ? (
              <span className="mt-1 block text-[11px] font-semibold text-destructive">{dlError(form.dl_number)}</span>
            ) : (
              <span className="mt-1 block text-[11px] text-muted-foreground">Format: 2 letters, 2 digits, then 11 digits.</span>
            )}
          </label>
          <button
            disabled={Boolean(dlError(form.dl_number))}
            onClick={async () => {
              const bad = dlError(form.dl_number);
              if (bad) return setMsg(bad);
              const { data, error } = await supabase.from("delivery_partners").insert({
                user_id: user.id, name: form.name, mobile: form.mobile, vehicle_no: form.vehicle_no,
                dl_number: form.dl_number.trim(), status: "PENDING_APPROVAL",
              }).select("id,name,status,is_online,is_busy,dl_number").single();
              if (error) setMsg(error.message);
              else setMe(data);
            }}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            Send for approval
          </button>
          {msg ? <p className="text-xs text-destructive">{msg}</p> : null}
        </div>
      </Shell>
    );
  }

  const trip = active;

  async function acceptOffer() {
    if (!offer || !me) return;
    await supabase.from("orders").update({ partner_id: me.id, status: "ASSIGNED", offered_to: null, offer_expires_at: null }).eq("id", offer.id);
    await supabase.from("delivery_partners").update({ is_busy: true }).eq("id", me.id);
    setActive({ ...offer, partner_id: me.id, status: "ASSIGNED" });
    setOffer(null);
  }

  async function verifyPickup() {
    if (!trip) return;
    const { data } = await supabase.from("orders").select("pickup_otp").eq("id", trip.id).maybeSingle();
    if (!data || data.pickup_otp !== pickupCode.trim()) return setMsg("Wrong pickup OTP. Ask the stall to read it again.");
    await supabase.from("orders").update({ status: "OUT_FOR_DELIVERY", picked_up_at: new Date().toISOString() }).eq("id", trip.id);
    setMsg(null);
    setActive({ ...trip, status: "OUT_FOR_DELIVERY" });
  }

  async function completeDelivery() {
    if (!trip || !me) return;
    if (!photo) return setMsg("Take the handover photo first.");
    const { data } = await supabase.from("orders").select("delivery_otp").eq("id", trip.id).maybeSingle();
    if (!data || data.delivery_otp !== dropCode.trim()) return setMsg("Wrong delivery OTP. Ask the customer to read it again.");
    await supabase.from("orders").update({
      status: "DELIVERED", delivered_at: new Date().toISOString(), proof_photo_url: photo,
      payment_status: trip.payment_mode === "COD" ? "PAID" : "PAID",
    }).eq("id", trip.id);
    await supabase.from("delivery_partners").update({ is_busy: false }).eq("id", me.id);
    setMsg(null);
    setActive(null);
    setPickupCode("");
    setDropCode("");
    setPhoto(null);
  }

  return (
    <Shell>
      <PortalHeader title={me.name} subtitle={me.status === "APPROVED" ? "Approved partner" : "Waiting for approval"} />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="card-soft border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Trips</p>
            <p className="text-lg font-bold">{earnings.trips}</p>
          </div>
          <div className="card-soft border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Earnings</p>
            <p className="text-lg font-bold">{inr(Math.round(earnings.total))}</p>
          </div>
        </div>

        <button
          onClick={async () => {
            await supabase.from("delivery_partners").update({ is_online: !me.is_online }).eq("id", me.id);
            setMe({ ...me, is_online: !me.is_online });
          }}
          className={`w-full rounded-xl border py-3 text-sm font-bold ${me.is_online ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
        >
          You are {me.is_online ? "ONLINE" : "OFFLINE"} · tap to change
        </button>

        {offer ? (
          <div className="card-soft border-2 border-primary p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">New order #{offer.code}</p>
              <p className="text-sm font-bold text-primary">{secs}s</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {vendor?.stall_name} → {offer.address_line} · {offer.distance_km} km
            </p>
            <p className="text-xs font-semibold">You earn {inr(Number(offer.delivery_fee))}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={acceptOffer} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">Accept</button>
              <button
                onClick={async () => {
                  await rejectOffer(offer.id, me.id, offer.rejected_partner_ids ?? []);
                  setOffer(null);
                }}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold"
              >
                Reject
              </button>
            </div>
          </div>
        ) : null}

        {trip && vendor ? (
          <div className="card-soft space-y-3 border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">#{trip.code}</p>
              <p className="text-xs font-semibold text-primary">{STATUS_LABEL[trip.status] ?? trip.status}</p>
            </div>

            <LiveMap
              from={
                trip.status === "OUT_FOR_DELIVERY" && posRef.current
                  ? posRef.current
                  : { lat: Number(vendor.lat), lng: Number(vendor.lng) }
              }
              to={
                trip.status === "OUT_FOR_DELIVERY"
                  ? { lat: Number(trip.drop_lat), lng: Number(trip.drop_lng) }
                  : { lat: Number(vendor.lat), lng: Number(vendor.lng) }
              }
              fromKind={trip.status === "OUT_FOR_DELIVERY" ? "rider" : "stall"}
              className="h-48 w-full overflow-hidden rounded-2xl border border-border"
            />

            {trip.status !== "OUT_FOR_DELIVERY" ? (
              <>
                <p className="text-xs text-muted-foreground">Pick up from {vendor.stall_name}</p>
                <NearBanner target={{ lat: Number(vendor.lat), lng: Number(vendor.lng) }} pos={posRef.current} label="stall" />
                <input
                  inputMode="numeric"
                  value={pickupCode}
                  onChange={(e) => setPickupCode(e.target.value)}
                  placeholder="Pickup OTP from stall"
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-center text-lg font-bold tracking-[0.3em] outline-none focus:border-primary"
                />
                <button onClick={verifyPickup} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">
                  Verify pickup
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Deliver to {trip.customer_name} · {trip.address_line}</p>
                <NearBanner target={{ lat: Number(trip.drop_lat), lng: Number(trip.drop_lng) }} pos={posRef.current} label="customer" />
                <a href={`tel:${trip.customer_mobile}`} className="block rounded-xl border border-border py-2.5 text-center text-sm font-bold">
                  Call customer
                </a>
                <label className="block rounded-xl border border-dashed border-border py-3 text-center text-sm font-semibold">
                  {photo ? "Photo captured · retake" : "Take handover photo"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = () => setPhoto(String(reader.result));
                      reader.readAsDataURL(f);
                    }}
                  />
                </label>
                {photo ? <img src={photo} alt="Handover proof" className="w-full rounded-xl object-cover" /> : null}
                <input
                  inputMode="numeric"
                  value={dropCode}
                  onChange={(e) => setDropCode(e.target.value)}
                  placeholder="Delivery OTP from customer"
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-center text-lg font-bold tracking-[0.3em] outline-none focus:border-primary"
                />
                <button onClick={completeDelivery} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">
                  Complete delivery
                </button>
              </>
            )}
            {msg ? <p className="text-xs font-semibold text-destructive">{msg}</p> : null}
          </div>
        ) : null}

        <a href="tel:9078492360" className="block rounded-xl border border-destructive py-3 text-center text-sm font-bold text-destructive">
          SOS · call support 9078492360
        </a>
      </div>
    </Shell>
  );
}

function NearBanner({ target, pos, label }: { target: { lat: number; lng: number }; pos: { lat: number; lng: number } | null; label: string }) {
  if (!pos) return <p className="text-[11px] text-muted-foreground">Turn on location to see how far the {label} is.</p>;
  const km = haversineKm(pos, target);
  return (
    <p className={`text-[11px] font-semibold ${km < 0.15 ? "text-primary" : "text-muted-foreground"}`}>
      {km < 0.15 ? `You have arrived at the ${label}` : `${km} km from the ${label}`}
    </p>
  );
}
