import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { cart, cartTotals, useCart } from "@/lib/cart";
import { computeBill, haversineKm, inr, type Settings } from "@/lib/fees";
import { createPayuPayment } from "@/lib/payments.functions";
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

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErr("Could not read your location. Please allow location access."),
      { enableHighAccuracy: true },
    );
  }

  const distanceKm = vendor && coords ? haversineKm(coords, { lat: Number(vendor.lat), lng: Number(vendor.lng) }) : 0;
  const bill = settings ? computeBill({ settings, foodTotal, mrpTotal, distanceKm }) : null;
  const walletUse = bill && useWallet ? Math.min(walletBalance, bill.grandTotal) : 0;
  const payable = bill ? Math.round((bill.grandTotal - walletUse) * 100) / 100 : 0;

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
        grand_total: bill.grandTotal,
        wallet_paid: walletUse,
        payment_mode: payable === 0 ? "WALLET" : payment,
        payment_status: payable === 0 ? "PAID" : "PENDING",
        pickup_otp: otp(),
        delivery_otp: otp(),
        status: "PLACED",
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
        const checkout = await createPayuPayment({
          data: {
            amount: payable,
            purpose: "ORDER",
            orderId: order.id,
            name: form.full_name,
            email: user.email ?? "",
            mobile: form.mobile,
            origin: window.location.origin,
          },
        });
        const f = document.createElement("form");
        f.method = "POST";
        f.action = checkout.action;
        Object.entries(checkout.params).forEach(([k, v]) => {
          const i = document.createElement("input");
          i.type = "hidden";
          i.name = k;
          i.value = v;
          f.appendChild(i);
        });
        document.body.appendChild(f);
        f.submit();
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
        <div className="card-soft grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-border p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{form.full_name || "Delivering to you"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{form.line || "Add your full address below"}</p>
          </div>
          <a href="#delivery-details" className="press shrink-0 rounded-full border border-primary px-3 py-1.5 text-[11px] font-black text-primary">
            Change
          </a>
        </div>

        <div className="card-soft border border-border p-3">
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

        <div id="delivery-details" className="card-soft space-y-2 border border-border p-3">
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
          <button onClick={locate} className="w-full rounded-xl border border-primary py-2.5 text-sm font-bold text-primary">
            {coords ? `Location set (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) · Update` : "Use my current location"}
          </button>
          {coords && vendor ? (
            <p className="text-xs text-muted-foreground">
              {distanceKm} km from {vendor.stall_name}
            </p>
          ) : null}
        </div>

        <div className="card-soft border border-border p-3">
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

        <div className="card-soft border border-border p-3">
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

      <div className="fixed inset-x-0 bottom-[62px] z-40 mx-auto w-full max-w-[480px] px-3">
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
