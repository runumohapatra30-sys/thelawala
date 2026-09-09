import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { AddressBook } from "@/components/AddressBook";
import { supabase } from "@/integrations/supabase/client";
import { cart, cartTotals, useCart } from "@/lib/cart";
import { couponDiscount, findCoupon, listCoupons, type Coupon } from "@/lib/coupons";
import { computeBill, haversineKm, inr, type Settings } from "@/lib/fees";
import { startOnlinePayment } from "@/lib/checkout";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Checkout — ThelaWala" },
      { name: "description", content: "Add your name, mobile, pincode and address, choose cash or online payment and place your ThelaWala order." },
      { property: "og:title", content: "Checkout — ThelaWala" },
      { property: "og:description", content: "Transparent bill with distance-based delivery fee." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cart,
});

const otp = () => String(Math.floor(100000 + Math.random() * 900000));
const pin4 = () => String(Math.floor(Math.random() * 10000)).padStart(4, "0");

function Cart() {
  const navigate = useNavigate();
  const { user } = useSession();
  const lines = useCart();
  const { foodTotal, mrpTotal } = cartTotals(lines);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [vendor, setVendor] = useState<{ id: string; stall_name: string; lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ full_name: "", mobile: "", pincode: "", line: "", landmark: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [payment, setPayment] = useState<"COD" | "ONLINE">("COD");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [offers, setOffers] = useState<Coupon[]>([]);
  const [tip, setTip] = useState(0);
  const [instructions, setInstructions] = useState("");
  const [locating, setLocating] = useState(false);
  const autoTried = useRef(false);
  const coordsRef = useRef(coords);
  const formRef = useRef(form);
  coordsRef.current = coords;
  formRef.current = form;

  useEffect(() => {
    listCoupons().then((cs) => setOffers(cs.filter((c) => c.is_active).slice(0, 3)));
  }, []);

  useEffect(() => {
    supabase.from("system_settings").select("*").maybeSingle().then(({ data }) => {
      setSettings(data as Settings | null);
      if (data && !data.enable_cod) setPayment("ONLINE");
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("wallets")
      .select("balance,status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setWalletBalance(data?.status === "ACTIVE" ? Number(data.balance) : 0));
  }, [user?.id]);

  useEffect(() => {
    const vid = lines[0]?.vendorId;
    if (!vid) return;
    supabase.from("vendors").select("id,stall_name,lat,lng").eq("id", vid).maybeSingle().then(({ data }) => setVendor(data));
  }, [lines[0]?.vendorId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          full_name: data.full_name,
          mobile: data.mobile,
          pincode: data.pincode,
          line: data.line,
          landmark: data.landmark ?? "",
        });
        setCoords({ lat: Number(data.lat), lng: Number(data.lng) });
      });
  }, [user?.id]);

  async function fillFromCoords(lat: number, lng: number, overwrite: boolean) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };
      const a = json.address ?? {};
      const line = [a["house_number"], a["road"], a["neighbourhood"], a["suburb"], a["city_district"], a["city"] ?? a["town"] ?? a["village"]]
        .filter(Boolean)
        .join(", ");
      const pin = a["postcode"] ?? "";
      setForm((f) => ({
        ...f,
        line: overwrite || !f.line ? line || json.display_name || f.line : f.line,
        landmark: f.landmark || a["neighbourhood"] || a["suburb"] || "",
        pincode: overwrite || !f.pincode ? pin || f.pincode : f.pincode,
      }));
    } catch {
      /* reverse geocoding is best-effort */
    }
  }

  function locate(overwrite = true) {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      async (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        await fillFromCoords(p.coords.latitude, p.coords.longitude, overwrite);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setErr("Could not read your location. Please allow location access.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    const t = setTimeout(() => {
      if (!coordsRef.current && !formRef.current.line) locate(true);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distanceKm = vendor && coords ? haversineKm(coords, { lat: Number(vendor.lat), lng: Number(vendor.lng) }) : 0;
  const bill = settings ? computeBill({ settings, foodTotal, mrpTotal, distanceKm }) : null;
  const couponOff = coupon ? couponDiscount(coupon, foodTotal) : 0;
  const netTotal = bill ? Math.max(0, Math.round((bill.grandTotal - couponOff + tip) * 100) / 100) : 0;
  const walletUse = bill && useWallet ? Math.min(walletBalance, netTotal) : 0;
  const payable = bill ? Math.round((netTotal - walletUse) * 100) / 100 : 0;

  async function applyCoupon() {
    setCouponMsg(null);
    const res = await findCoupon(codeInput, foodTotal);
    if (res.error || !res.coupon) {
      setCoupon(null);
      return setCouponMsg(res.error ?? "This coupon code is not valid.");
    }
    setCoupon(res.coupon);
    setCouponMsg(`${res.coupon.code} applied · you save ${inr(couponDiscount(res.coupon, foodTotal))}`);
  }

  if (lines.length === 0) {
    return (
      <Shell>
        <PortalHeader title="Your cart" />
        <p className="px-4 py-20 text-center text-sm text-muted-foreground">Your cart is empty. Add something hot.</p>
      </Shell>
    );
  }

  async function place() {
    setErr(null);
    if (!user) return navigate({ to: "/auth" });
    if (!form.full_name || form.mobile.length < 10 || form.pincode.length < 6 || !form.line)
      return setErr("Please fill name, 10-digit mobile, 6-digit pincode and full address.");
    if (!coords) return setErr("Please set your delivery location on the map.");
    if (!bill || !vendor) return;

    setBusy(true);
    const { data: sameAddr } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", user.id)
      .eq("line", form.line)
      .eq("pincode", form.pincode)
      .maybeSingle();
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    if (sameAddr) {
      await supabase.from("addresses").update({ is_default: true }).eq("id", sameAddr.id);
    } else {
      await supabase.from("addresses").insert({
        user_id: user.id,
        full_name: form.full_name,
        mobile: form.mobile,
        pincode: form.pincode,
        line: form.line,
        landmark: form.landmark || null,
        lat: coords.lat,
        lng: coords.lng,
        is_default: true,
      });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        code: `TW${Date.now().toString().slice(-7)}`,
        user_id: user.id,
        vendor_id: vendor.id,
        customer_name: form.full_name,
        customer_mobile: form.mobile,
        address_line: form.landmark ? `${form.line}, ${form.landmark}` : form.line,
        pincode: form.pincode,
        drop_lat: coords.lat,
        drop_lng: coords.lng,
        distance_km: bill.distanceKm,
        food_total: bill.foodTotal,
        delivery_fee: bill.deliveryFee,
        platform_fee: bill.platformFee,
        handling_fee: bill.handlingFee,
        packing_fee: bill.packingFee,
        surge_fee: bill.surgeFee,
        grand_total: netTotal,
        coupon_code: coupon?.code ?? null,
        discount_amount: couponOff,
        wallet_paid: walletUse,
        tip_amount: tip,
        delivery_instructions: instructions.trim() || null,
        payment_mode: payable === 0 ? "WALLET" : payment,
        payment_status: payable === 0 ? "PAID" : "PENDING",
        pickup_otp: otp(),
        delivery_otp: pin4(),
        status: "ORDER_PLACED",
      })
      .select("id")
      .single();

    if (error || !order) {
      setBusy(false);
      return setErr(error?.message ?? "Could not place the order.");
    }

    await supabase.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        item_id: l.itemId,
        name: l.name,
        qty: l.qty,
        price: l.price,
        mrp: l.mrp,
        photo_url: l.photo,
      })),
    );

    if (coupon && couponOff > 0) {
      await supabase.from("coupon_redemptions").insert({
        coupon_id: coupon.id,
        user_id: user.id,
        order_id: order.id,
        amount: couponOff,
      });
    }

    if (walletUse > 0) {
      const { error: wErr } = await supabase.rpc("wallet_debit", {
        _amount: walletUse,
        _order_id: order.id,
        _note: "Paid for order",
      });
      if (wErr) {
        setBusy(false);
        return setErr(wErr.message);
      }
    }

    cart.clear();

    if (payable > 0 && payment === "ONLINE") {
      try {
        await startOnlinePayment({
          gateway: settings?.payment_gateway,
          amount: payable,
          purpose: "ORDER",
          orderId: order.id,
          name: form.full_name,
          email: user.email ?? "",
          mobile: form.mobile,
        });
        return;
      } catch (e) {
        setBusy(false);
        return setErr(e instanceof Error ? e.message : "Could not open the payment page.");
      }
    }

    setBusy(false);
    navigate({ to: "/orders/$id", params: { id: order.id }, search: { placed: 1 } });
  }

  return (
    <Shell>
      <PortalHeader title="Checkout" subtitle={vendor?.stall_name ?? "Your order"} />
      <div className="space-y-3 p-4 pb-36">
        <div className="card-elevated rise-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-border p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{form.full_name || "Delivering to you"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{form.line || "Add your full address below"}</p>
          </div>
          <a href="#delivery-details" className="press shrink-0 rounded-full border border-primary px-3 py-1.5 text-[11px] font-black text-primary">
            Change
          </a>
        </div>

        <div className="card-elevated rise-in p-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-black text-primary-foreground">
            ⚡ Free delivery in 15 mins
          </p>
          <div className="mt-3 space-y-3">
            {lines.map((l) => (
              <div key={l.itemId} className="flex items-center gap-3">
                <img src={l.photo ?? "/food/food-tiffin.jpg"} alt={l.name} className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.unit}</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary px-2 py-1 text-primary-foreground">
                  <button aria-label="Remove one" onClick={() => cart.remove(l.itemId)} className="px-1 font-bold">−</button>
                  <span className="text-xs font-bold">{l.qty}</span>
                  <button aria-label="Add one" onClick={() => cart.add(l)} className="px-1 font-bold">+</button>
                </div>
                <p className="w-14 text-right text-sm font-bold">{inr(l.price * l.qty)}</p>
              </div>
            ))}
          </div>
        </div>

        <AddressBook
          userId={user?.id}
          onPick={(a) => {
            setForm({ full_name: a.full_name, mobile: a.mobile, pincode: a.pincode, line: a.line, landmark: a.landmark ?? "" });
            setCoords({ lat: Number(a.lat), lng: Number(a.lng) });
          }}
        />

        <div id="delivery-details" className="card-elevated rise-in space-y-2 border border-border p-3">

          <p className="text-sm font-bold">Delivery details</p>
          {([
            ["full_name", "Full name", "text"],
            ["mobile", "Mobile number", "tel"],
            ["pincode", "Pincode", "tel"],
            ["landmark", "Landmark (optional)", "text"],
          ] as const).map(([k, label, type]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
              <input
                type={type}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Full address</span>
            <textarea
              rows={2}
              value={form.line}
              onChange={(e) => setForm({ ...form, line: e.target.value })}
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <button
            onClick={() => locate(true)}
            disabled={locating}
            className="w-full rounded-xl border border-primary py-2.5 text-sm font-bold text-primary disabled:opacity-60"
          >
            {locating
              ? "Finding your address…"
              : coords
                ? `Location set (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) · Update`
                : "Use my current location"}
          </button>
          {coords && vendor ? (
            <p className="text-xs text-muted-foreground">
              {distanceKm} km from {vendor.stall_name}
            </p>
          ) : null}
        </div>

        <div className="card-elevated rise-in space-y-2 p-3">
          <p className="text-sm font-bold">Tip &amp; delivery note</p>
          <p className="text-[11px] text-muted-foreground">A tip goes fully to your delivery partner.</p>
          <div className="flex flex-wrap gap-2">
            {[0, 10, 20, 30, 50].map((t) => (
              <button
                key={t}
                onClick={() => setTip(t)}
                className={`press rounded-full border px-3 py-1.5 text-[11px] font-black ${tip === t ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {t === 0 ? "No tip" : `₹${t}`}
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Delivery instructions (e.g. ring the bell, less spicy)"
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="card-elevated rise-in p-3">
          <p className="text-sm font-bold">Coupons &amp; offers</p>
          <div className="mt-2 flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
            />
            {coupon ? (
              <button
                onClick={() => { setCoupon(null); setCodeInput(""); setCouponMsg(null); }}
                className="press shrink-0 rounded-xl border border-border px-3 text-xs font-black"
              >
                Remove
              </button>
            ) : (
              <button onClick={applyCoupon} className="press shrink-0 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground">
                Apply
              </button>
            )}
          </div>
          {couponMsg ? (
            <p className={`mt-1.5 text-[11px] font-semibold ${coupon ? "text-primary" : "text-destructive"}`}>{couponMsg}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {offers.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCodeInput(c.code); setCoupon(null); setCouponMsg(null); }}
                className="press rounded-full border border-dashed border-primary px-2.5 py-1 text-[11px] font-black text-primary"
              >
                {c.code} · {c.description}
              </button>
            ))}
          </div>
        </div>

        <div className="card-elevated rise-in p-3">
          <p className="text-sm font-bold">Bill details</p>
          {bill ? (
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row label="Item total (MRP)" value={inr(bill.mrpTotal)} />
              {bill.discount > 0 ? <Row label="Stall discount" value={`− ${inr(bill.discount)}`} good /> : null}
              <Row label={`Delivery fee (${bill.distanceKm} km)`} value={bill.deliveryFee ? inr(bill.deliveryFee) : "FREE"} />
              {bill.platformFee ? <Row label="Platform fee" value={inr(bill.platformFee)} /> : null}
              {bill.handlingFee ? <Row label="Handling fee" value={inr(bill.handlingFee)} /> : null}
              {bill.packingFee ? <Row label="Packing fee" value={inr(bill.packingFee)} /> : null}
              {bill.surgeFee ? <Row label="Surge fee" value={inr(bill.surgeFee)} /> : null}
              {couponOff > 0 ? <Row label={`Coupon ${coupon?.code}`} value={`− ${inr(couponOff)}`} good /> : null}
              {tip > 0 ? <Row label="Tip for delivery partner" value={inr(tip)} /> : null}
              {walletUse > 0 ? <Row label="Paid from wallet" value={`− ${inr(walletUse)}`} good /> : null}
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>To pay</span>
                <span>{inr(payable)}</span>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Loading charges…</p>
          )}
        </div>

        <div className="card-elevated rise-in p-3">
          <p className="text-sm font-bold">Payment method</p>
          {walletBalance > 0 ? (
            <button
              onClick={() => setUseWallet(!useWallet)}
              className={`mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold ${useWallet ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              Use wallet balance ({inr(walletBalance)})<span>{useWallet ? "ON" : "OFF"}</span>
            </button>
          ) : null}
          {payable === 0 ? (
            <p className="mt-2 text-xs font-semibold text-primary">Fully paid by your wallet.</p>
          ) : null}
          <div className="mt-2 grid gap-2">
            {settings?.enable_cod !== false ? (
              <PayBtn active={payment === "COD"} onClick={() => setPayment("COD")} label="Cash on delivery" hint="Pay the delivery partner" />
            ) : null}
            {settings?.enable_online_payment ? (
              <PayBtn active={payment === "ONLINE"} onClick={() => setPayment("ONLINE")} label="Pay online (UPI / card)" hint={`Secured by ${settings.payment_gateway}`} />
            ) : (
              <p className="text-xs text-muted-foreground">Online payment is currently switched off.</p>
            )}
          </div>
        </div>

        {err ? <p className="text-xs font-semibold text-destructive">{err}</p> : null}
      </div>

      <div className="fixed inset-x-0 bottom-[104px] z-40 mx-auto w-full max-w-[480px] px-3">
        <div className="rounded-2xl bg-card p-2 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-1 pb-2">
            <p className="truncate text-[11px] font-semibold text-muted-foreground">
              📍 {form.line || "Set your delivery address"}
            </p>
            {coords && vendor ? (
              <span className="shrink-0 text-[11px] font-black text-primary">{distanceKm} km away</span>
            ) : null}
          </div>
          <button
            disabled={busy || !bill}
            onClick={place}
            className="press flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-primary-foreground disabled:opacity-50"
          >
            <span className="text-sm font-black">{bill ? inr(payable) : "—"}</span>
            <span className="text-sm font-black">{busy ? "PLACING…" : "Select Payment Method ›"}</span>
          </button>
        </div>
      </div>
    </Shell>
  );
}

function PayBtn({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left ${active ? "border-primary" : "border-border"}`}
    >
      <p className={`text-sm font-bold ${active ? "text-primary" : ""}`}>{label}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </button>
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
