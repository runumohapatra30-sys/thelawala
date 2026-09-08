import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LogoutButton, Shell } from "@/components/Shell";
import { LiveMap } from "@/components/LiveMap";
import { supabase } from "@/integrations/supabase/client";
import { rejectOffer } from "@/lib/dispatch";
import { haversineKm, inr } from "@/lib/fees";
import { useSession } from "@/lib/session";
import { dlError, normalizeDl } from "@/lib/validation";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rider")({
  head: () => ({
    meta: [
      { title: "Delivery partner portal — ThelaWala Express" },
      { name: "description", content: "Go on duty, accept nearby ThelaWala orders, navigate to the stall, verify pickup and delivery PINs and track your daily earnings." },
      { property: "og:title", content: "Delivery partner portal — ThelaWala Express" },
      { property: "og:description", content: "Earn with ThelaWala street food deliveries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RiderPortal,
});

type Order = {
  id: string; code: string; status: string; grand_total: number; distance_km: number;
  delivery_fee: number; tip_amount: number; customer_name: string; customer_mobile: string; address_line: string;
  drop_lat: number; drop_lng: number; vendor_id: string; partner_id: string | null;
  offered_to: string | null; offer_expires_at: string | null; rejected_partner_ids: string[];
  payment_mode: string; payment_status: string;
};
type Partner = { id: string; name: string; status: string; is_online: boolean; is_busy: boolean; dl_number: string | null };
type Vendor = { stall_name: string; lat: number; lng: number; mobile: string | null; address: string | null };

const OTP_LEN = 6;

function RiderPortal() {
  const { user, loading } = useSession();
  const [me, setMe] = useState<Partner | null>(null);
  const [offer, setOffer] = useState<Order | null>(null);
  const [active, setActive] = useState<Order | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [secs, setSecs] = useState(45);
  const [pickupCode, setPickupCode] = useState("");
  const [dropCode, setDropCode] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [earnings, setEarnings] = useState({ trips: 0, total: 0 });
  const [form, setForm] = useState({ name: "", mobile: "", vehicle_no: "", dl_number: "" });
  const [dlDraft, setDlDraft] = useState("");
  const [dlMsg, setDlMsg] = useState<string | null>(null);
  const [dlSaving, setDlSaving] = useState(false);
  const [, setTick] = useState(0);
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
      setTick((t) => t + 1);
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

      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data: done } = await supabase.from("orders")
        .select("delivery_fee,tip_amount").eq("partner_id", me.id).eq("status", "DELIVERED")
        .gte("delivered_at", since.toISOString());
      setEarnings({
        trips: done?.length ?? 0,
        total: (done ?? []).reduce((a, d) => a + Number(d.delivery_fee) + Number(d.tip_amount ?? 0), 0),
      });
    };
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [me?.id]);

  useEffect(() => {
    const order = active ?? offer;
    if (!order) return;
    supabase.from("vendors").select("stall_name,lat,lng,mobile,address").eq("id", order.vendor_id).maybeSingle()
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

  if (loading) return <Shell><RiderHeader /></Shell>;

  if (!user) {
    return (
      <Shell>
        <RiderHeader />
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Sign in to start delivering.</p>
          <Link to="/auth" className="press mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Sign in</Link>
        </div>
      </Shell>
    );
  }

  if (!me) {
    return (
      <Shell>
        <RiderHeader subtitle="Join as delivery partner" />
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
              setMsg("");
              try {
                const { data, error } = await supabase.from("delivery_partners").insert({
                  user_id: user.id, name: form.name, mobile: form.mobile, vehicle_no: form.vehicle_no,
                  dl_number: form.dl_number.trim(), status: "PENDING",
                }).select("id,name,status,is_online,is_busy,dl_number").single();
                if (error) throw error;
                setMe(data);
                toast.success("Details submitted for review!");
              } catch (e: any) {
                const m = String(e?.message ?? "");
                toast.error(
                  m.includes("dl_format") ? "Driving licence format is not valid."
                  : m.includes("duplicate") ? "You have already registered as a delivery partner."
                  : m.includes("_check") ? "Some details are not accepted. Please check and try again."
                  : "Could not submit right now. Please try again.",
                );
                setMsg("");
              }
            }}

            className="press w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Send for approval
          </button>
          {msg ? <p className="text-xs text-destructive">{msg}</p> : null}
        </div>
      </Shell>
    );
  }

  const trip = active;
  const step = !trip ? 0 : trip.status === "OUT_FOR_DELIVERY" ? 2 : trip.status === "ARRIVED_AT_VENDOR" ? 1 : 0;

  async function acceptOffer() {
    if (!offer || !me) return;
    await supabase.from("orders").update({ partner_id: me.id, status: "ASSIGNED", offered_to: null, offer_expires_at: null }).eq("id", offer.id);
    await supabase.from("delivery_partners").update({ is_busy: true }).eq("id", me.id);
    setActive({ ...offer, partner_id: me.id, status: "ASSIGNED" });
    setOffer(null);
  }

  async function reachedStall() {
    if (!trip) return;
    await supabase.from("orders").update({ status: "ARRIVED_AT_VENDOR" }).eq("id", trip.id);
    setActive({ ...trip, status: "ARRIVED_AT_VENDOR" });
  }

  async function verifyPickup() {
    if (!trip) return;
    const { data } = await supabase.from("orders").select("pickup_otp").eq("id", trip.id).maybeSingle();
    if (!data || data.pickup_otp !== pickupCode.trim()) return setMsg("Wrong pickup PIN. Ask the stall to read it again.");
    await supabase.from("orders").update({ status: "OUT_FOR_DELIVERY", picked_up_at: new Date().toISOString() }).eq("id", trip.id);
    setMsg(null);
    setActive({ ...trip, status: "OUT_FOR_DELIVERY" });
  }

  async function completeDelivery() {
    if (!trip || !me) return;
    if (!photo) return setMsg("Take the handover photo first.");
    const { data } = await supabase.from("orders").select("delivery_otp").eq("id", trip.id).maybeSingle();
    if (!data || data.delivery_otp !== dropCode.trim()) return setMsg("Wrong delivery PIN. Ask the customer to read it again.");
    await supabase.from("orders").update({
      status: "DELIVERED", delivered_at: new Date().toISOString(), proof_photo_url: photo, payment_status: "PAID",
    }).eq("id", trip.id);
    await supabase.from("delivery_partners").update({ is_busy: false }).eq("id", me.id);
    setMsg(null);
    setActive(null);
    setPickupCode("");
    setDropCode("");
    setPhoto(null);
    setShowComplete(false);
  }

  const pos = posRef.current;
  const stallPoint = vendor ? { lat: Number(vendor.lat), lng: Number(vendor.lng) } : null;
  const dropPoint = trip ? { lat: Number(trip.drop_lat), lng: Number(trip.drop_lng) } : null;

  return (
    <Shell>
      <RiderHeader
        subtitle={me.status === "APPROVED" ? "Approved partner" : "Waiting for approval"}
        name={me.name}
        duty={me.is_online}
        dutyLocked={me.status !== "APPROVED"}
        earnings={earnings}
        onToggleDuty={async () => {
          await supabase.from("delivery_partners").update({ is_online: !me.is_online }).eq("id", me.id);
          setMe({ ...me, is_online: !me.is_online });
        }}
      />

      <div className="space-y-3 p-4">
        {me.status === "UNDER_REVIEW" ? (
          <div className="card-soft border-2 border-destructive p-3">
            <p className="text-sm font-bold text-destructive">Duty locked · licence under review</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You changed your driving licence, so your account is with the admin team for a check. You can go on duty again once
              it is approved.
            </p>
          </div>
        ) : null}

        {trip && vendor && stallPoint && dropPoint ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-border">
              <LiveMap
                from={step === 2 ? (pos ?? stallPoint) : (pos ?? stallPoint)}
                to={step === 2 ? dropPoint : stallPoint}
                fromKind={step === 2 ? "rider" : "rider"}
                className="h-56 w-full"
              />
            </div>

            <Stepper step={step} />

            <div className="card-soft border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {step === 2 ? "Drop at" : "Pick up from"}
                  </p>
                  <p className="truncate text-sm font-extrabold">
                    {step === 2 ? trip.customer_name : vendor.stall_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step === 2 ? trip.address_line : vendor.address ?? "Stall location"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold">
                  #{trip.code}
                </span>
              </div>
              <Distance pos={pos} target={step === 2 ? dropPoint : stallPoint} label={step === 2 ? "customer" : "stall"} />
              <div className="mt-3 flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${step === 2 ? dropPoint.lat : stallPoint.lat},${step === 2 ? dropPoint.lng : stallPoint.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="press flex-1 rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground"
                >
                  Open in Google Maps
                </a>
                <a
                  href={`tel:${step === 2 ? trip.customer_mobile : vendor.mobile ?? "9078492360"}`}
                  className="press grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border"
                  aria-label="Call"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 5c0 8 7 15 15 15l2-3-4-2-2 2a13 13 0 01-6-6l2-2-2-4z" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>

            <div
              className={`rounded-2xl border-2 p-3 ${
                trip.payment_mode === "COD" && trip.payment_status !== "PAID"
                  ? "border-brand bg-brand-soft"
                  : "border-primary/40 bg-primary/5"
              }`}
            >
              {trip.payment_mode === "COD" && trip.payment_status !== "PAID" ? (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wide">Collect cash</p>
                  <p className="text-2xl font-black">{inr(Number(trip.grand_total))}</p>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Paid online</p>
                  <p className="text-sm font-semibold text-muted-foreground">Do not collect any cash from the customer.</p>
                </>
              )}
            </div>

            {step === 0 ? (
              <button onClick={reachedStall} className="press w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">
                Reached Stall
              </button>
            ) : null}

            {step === 1 ? (
              <div className="card-soft space-y-3 border border-border p-3">
                <p className="text-sm font-bold">Enter the pickup PIN shown by the stall</p>
                <OtpBoxes value={pickupCode} onChange={setPickupCode} />
                <button
                  disabled={pickupCode.length < OTP_LEN}
                  onClick={verifyPickup}
                  className="press w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  Order Picked Up
                </button>
              </div>
            ) : null}

            {step === 2 ? (
              <button
                onClick={() => setShowComplete(true)}
                className="press w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
              >
                Complete delivery
              </button>
            ) : null}

            {msg ? <p className="text-xs font-semibold text-destructive">{msg}</p> : null}
          </>
        ) : (
          <div className="card-soft border border-dashed border-border p-6 text-center">
            <p className="text-sm font-bold">{me.is_online ? "Waiting for orders…" : "You are off duty"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {me.is_online ? "Stay near the stalls to get more orders." : "Turn duty ON from the top bar to start receiving orders."}
            </p>
          </div>
        )}

        <div className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Driving licence</p>
          <p className="text-[11px] text-muted-foreground">
            Current: {me.dl_number ?? "not added yet"}. Changing it sends your account for review and takes you off duty.
          </p>
          <input
            value={dlDraft || me.dl_number || ""}
            autoCapitalize="characters"
            placeholder="OD02 20210012345"
            onChange={(e) => {
              setDlDraft(normalizeDl(e.target.value));
              setDlMsg(null);
            }}
            className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-sm uppercase outline-none ${
              dlDraft && dlError(dlDraft) ? "border-destructive" : "border-border focus:border-primary"
            }`}
          />
          {dlDraft && dlError(dlDraft) ? (
            <p className="mt-1 text-[11px] font-semibold text-destructive">{dlError(dlDraft)}</p>
          ) : null}
          <button
            disabled={dlSaving || !dlDraft || Boolean(dlError(dlDraft)) || dlDraft === me.dl_number}
            onClick={async () => {
              const bad = dlError(dlDraft);
              if (bad) return setDlMsg(bad);
              setDlSaving(true);
              const { data, error } = await supabase
                .from("delivery_partners")
                .update({ dl_number: dlDraft.trim() })
                .eq("id", me.id)
                .select("id,name,status,is_online,is_busy,dl_number")
                .single();
              setDlSaving(false);
              if (error || !data) return setDlMsg(error?.message ?? "Could not save the licence.");
              setMe(data);
              setDlDraft("");
              setDlMsg("Licence saved. Your account is under review and duty is locked until admin approval.");
            }}
            className="press mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {dlSaving ? "Saving…" : "Update licence"}
          </button>
          {dlMsg ? <p className="mt-2 text-xs font-semibold text-primary">{dlMsg}</p> : null}
        </div>

        <a href="tel:9078492360" className="press block rounded-xl border-2 border-destructive py-3 text-center text-sm font-bold text-destructive">
          SOS · call support 9078492360
        </a>
      </div>

      {offer && vendor ? (
        <OfferDrawer
          offer={offer}
          vendor={vendor}
          pos={pos}
          secs={secs}
          onAccept={acceptOffer}
          onDecline={async () => {
            await rejectOffer(offer.id, me.id, offer.rejected_partner_ids ?? []);
            setOffer(null);
          }}
        />
      ) : null}

      {showComplete && trip ? (
        <CompleteDrawer
          value={dropCode}
          onChange={setDropCode}
          photo={photo}
          onPhoto={setPhoto}
          msg={msg}
          onClose={() => setShowComplete(false)}
          onConfirm={completeDelivery}
        />
      ) : null}
    </Shell>
  );
}

function RiderHeader({
  subtitle,
  name = "Delivery partner",
  duty,
  dutyLocked,
  earnings,
  onToggleDuty,
}: {
  subtitle?: string;
  name?: string;
  duty?: boolean;
  dutyLocked?: boolean;
  earnings?: { trips: number; total: number };
  onToggleDuty?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-primary px-4 py-3 text-primary-foreground">
      <div className="flex items-center gap-3">
        <Link to="/" className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-foreground/20">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">ThelaWala Express</p>
          <h1 className="truncate text-base font-extrabold">{name}</h1>
          {subtitle ? <p className="truncate text-[11px] opacity-80">{subtitle}</p> : null}
        </div>
        <LogoutButton className="bg-primary-foreground/20 text-primary-foreground" />
        {onToggleDuty ? (
          <button
            onClick={onToggleDuty}
            disabled={dutyLocked}
            className="press flex shrink-0 items-center gap-2 rounded-full bg-primary-foreground/15 px-2.5 py-1.5 disabled:opacity-50"
          >
            <span className="text-[11px] font-extrabold">Duty {duty ? "ON" : "OFF"}</span>
            <span className={`relative h-5 w-9 rounded-full transition-colors ${duty ? "bg-brand" : "bg-primary-foreground/40"}`}>
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${duty ? "left-[1.15rem]" : "left-0.5"}`}
              />
            </span>
          </button>
        ) : null}
      </div>
      {earnings ? (
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1 text-brand-foreground">
          <span className="text-xs font-extrabold">Today: {inr(Math.round(earnings.total))}</span>
          <span className="text-xs font-semibold opacity-70">| {earnings.trips} Orders</span>
        </div>
      ) : null}
    </header>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Reached Stall", "Order Picked Up", "Out for Delivery"];
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-center">
            <span className={`h-1 flex-1 rounded-full ${i === 0 ? "bg-transparent" : i <= step ? "bg-primary" : "bg-border"}`} />
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black ${
                i <= step ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className={`h-1 flex-1 rounded-full ${i === steps.length - 1 ? "bg-transparent" : i < step ? "bg-primary" : "bg-border"}`} />
          </div>
          <span className={`text-center text-[10px] font-bold ${i <= step ? "text-primary" : "text-muted-foreground"}`}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function Distance({ pos, target, label }: { pos: { lat: number; lng: number } | null; target: { lat: number; lng: number }; label: string }) {
  if (!pos) return <p className="mt-1 text-[11px] text-muted-foreground">Turn on location to see how far the {label} is.</p>;
  const km = haversineKm(pos, target);
  return (
    <p className={`mt-1 text-[11px] font-bold ${km < 0.15 ? "text-primary" : "text-muted-foreground"}`}>
      {km < 0.15 ? `You have arrived at the ${label}` : `${km} km away`}
    </p>
  );
}

function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <div className="flex justify-between gap-2">
        {Array.from({ length: OTP_LEN }).map((_, i) => (
          <div
            key={i}
            className={`grid h-12 flex-1 place-items-center rounded-xl border-2 text-xl font-black ${
              value.length === i ? "border-primary" : "border-border"
            }`}
          >
            {value[i] ?? ""}
          </div>
        ))}
      </div>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, OTP_LEN))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Enter PIN"
      />
    </div>
  );
}

function OfferDrawer({
  offer, vendor, pos, secs, onAccept, onDecline,
}: {
  offer: Order; vendor: Vendor; pos: { lat: number; lng: number } | null; secs: number;
  onAccept: () => void; onDecline: () => void;
}) {
  const total = 30;
  const left = Math.min(secs, total);
  const pct = (left / total) * 100;
  const pickupKm = pos ? haversineKm(pos, { lat: Number(vendor.lat), lng: Number(vendor.lng) }) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-card p-4 pb-6">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        <div className="flex items-center gap-3">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--color-primary) ${pct}%, var(--color-border) 0)` }}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-lg font-black text-primary">{left}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">New order</p>
            <p className="truncate text-lg font-extrabold">{vendor.stall_name}</p>
            <p className="truncate text-xs text-muted-foreground">{offer.address_line}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-muted/60 p-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Pickup</p>
            <p className="text-sm font-extrabold">{pickupKm !== null ? `${pickupKm} km` : "—"}</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Drop</p>
            <p className="text-sm font-extrabold">{offer.distance_km} km</p>
          </div>
          <div className="rounded-xl bg-brand-soft p-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">You earn</p>
            <p className="text-sm font-extrabold">{inr(Number(offer.delivery_fee))}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={onDecline} className="press flex-1 rounded-xl border-2 border-border py-3 text-sm font-bold">
            Decline
          </button>
          <button onClick={onAccept} className="press flex-[2] rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteDrawer({
  value, onChange, photo, onPhoto, msg, onClose, onConfirm,
}: {
  value: string; onChange: (v: string) => void; photo: string | null; onPhoto: (v: string) => void;
  msg: string | null; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-card p-4 pb-6">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-extrabold">Verify delivery PIN</p>
            <p className="text-xs text-muted-foreground">Ask the customer for the PIN shown in their app.</p>
          </div>
          <button onClick={onClose} className="press text-sm font-bold text-muted-foreground">Close</button>
        </div>

        <div className="mt-4">
          <OtpBoxes value={value} onChange={onChange} />
        </div>

        <label className="press mt-3 block rounded-xl border-2 border-dashed border-border py-3 text-center text-sm font-bold">
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
              reader.onload = () => onPhoto(String(reader.result));
              reader.readAsDataURL(f);
            }}
          />
        </label>
        {photo ? <img src={photo} alt="Handover proof" className="mt-2 max-h-40 w-full rounded-xl object-cover" /> : null}

        {msg ? <p className="mt-2 text-xs font-semibold text-destructive">{msg}</p> : null}

        <button
          disabled={value.length < OTP_LEN || !photo}
          onClick={onConfirm}
          className="press mt-3 w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground disabled:opacity-50"
        >
          Confirm &amp; Complete Delivery
        </button>
      </div>
    </div>
  );
}
