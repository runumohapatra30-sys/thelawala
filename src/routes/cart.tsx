import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { GUEST_PROFILE_EVENT, openLoginModal } from "@/components/LoginModal";
import type { SavedAddress } from "@/components/AddressBook";
import { supabase } from "@/integrations/supabase/client";
import { cart, cartTotals, useCart } from "@/lib/cart";
import { couponDiscount, findCoupon, listCoupons, type Coupon } from "@/lib/coupons";
import { computeBill, haversineKm, inr, type Settings } from "@/lib/fees";
import { checkoutGate, minimumOrderValue, stallOfferDiscount } from "@/lib/pricing";
import { payInAppWithCashfree } from "@/lib/checkout";
import { useSession } from "@/lib/session";
import { ArrowLeft, BellOff, ChevronRight, CircleIndianRupee, DoorOpen, MapPin, MoreVertical, Phone, PhoneOff, Plus, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Checkout — ThelaWala" },
      {
        name: "description",
        content:
          "Add your name, mobile, pincode and address, choose cash or online payment and place your ThelaWala order.",
      },
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
  const { foodTotal, baseTotal } = cartTotals(lines);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [vendor, setVendor] = useState<{
    id: string;
    stall_name: string;
    lat: number;
    lng: number;
    offer_percent: number | null;
    offer_label: string | null;
  } | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    mobile: "",
    pincode: "",
    line: "",
    landmark: "",
  });
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
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addressConfirmOpen, setAddressConfirmOpen] = useState(false);
  const [codConfirmOpen, setCodConfirmOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<
    Array<{
      id: string;
      vendor_id: string;
      name: string;
      photo_url: string | null;
      unit: string | null;
      price: number;
      mrp: number;
      in_stock: boolean;
    }>
  >([]);
  const [guestProfile, setGuestProfile] = useState(() => ({
    name: typeof window === "undefined" ? "" : localStorage.getItem("thelawala.guest_name") || "",
    mobile:
      typeof window === "undefined" ? "" : localStorage.getItem("thelawala.guest_mobile") || "",
  }));
  const autoTried = useRef(false);
  const coordsRef = useRef(coords);
  const formRef = useRef(form);
  coordsRef.current = coords;
  formRef.current = form;

  useEffect(() => {
    listCoupons().then((cs) => setOffers(cs.filter((c) => c.is_active).slice(0, 3)));
  }, []);

  useEffect(() => {
    const guestName = localStorage.getItem("thelawala.guest_name");
    const guestMobile = localStorage.getItem("thelawala.guest_mobile");
    if (guestName || guestMobile)
      setForm((current) => ({
        ...current,
        full_name: current.full_name || guestName || "",
        mobile: current.mobile || guestMobile || "",
      }));
    const updateGuest = (event: Event) => {
      const profile = (event as CustomEvent<{ name: string; mobile: string }>).detail;
      setGuestProfile(profile);
      setForm((current) => ({ ...current, full_name: profile.name, mobile: profile.mobile }));
    };
    window.addEventListener(GUEST_PROFILE_EVENT, updateGuest);
    return () => window.removeEventListener(GUEST_PROFILE_EVENT, updateGuest);
  }, []);

  useEffect(() => {
    supabase
      .from("system_settings")
      .select("*")
      .maybeSingle()
      .then(({ data }) => {
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
    supabase
      .from("vendors")
      .select("id,stall_name,lat,lng,offer_percent,offer_label")
      .eq("id", vid)
      .maybeSingle()
      .then(({ data }) => setVendor(data));
    supabase
      .from("menu_items")
      .select("id,vendor_id,name,photo_url,unit,price,mrp,in_stock")
      .eq("vendor_id", vid)
      .eq("in_stock", true)
      .limit(12)
      .then(({ data }) => setRecommendations((data ?? []) as typeof recommendations));
  }, [lines[0]?.vendorId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2)
      .then(({ data }) => {
        const list = (data ?? []) as SavedAddress[];
        setSaved(list);
        const first = list[0];
        if (!first) return;
        // A saved location already carries its map point, so we do not ask again.
        setForm({
          full_name: first.full_name,
          mobile: first.mobile,
          pincode: first.pincode,
          line: first.line,
          landmark: first.landmark ?? "",
        });
        if (!coordsRef.current && Number(first.lat) && Number(first.lng))
          setCoords({ lat: Number(first.lat), lng: Number(first.lng) });
      });
  }, [user?.id]);

  // The last location the customer used is remembered, so we never ask for it again
  // unless they choose a new address themselves.
  useEffect(() => {
    if (coordsRef.current) return;
    try {
      const raw = localStorage.getItem("tw_last_location");
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        lat: number;
        lng: number;
        line?: string;
        pincode?: string;
        landmark?: string;
      };
      if (!Number(saved.lat) || !Number(saved.lng)) return;
      setCoords({ lat: Number(saved.lat), lng: Number(saved.lng) });
      setForm((f) => ({
        ...f,
        line: f.line || saved.line || "",
        pincode: f.pincode || saved.pincode || "",
        landmark: f.landmark || saved.landmark || "",
      }));
    } catch {
      /* remembered location is optional */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickSaved(a: SavedAddress) {
    setForm({
      full_name: a.full_name,
      mobile: a.mobile,
      pincode: a.pincode,
      line: a.line,
      landmark: a.landmark ?? "",
    });
    setCoords({ lat: Number(a.lat), lng: Number(a.lng) });
    try {
      localStorage.setItem(
        "tw_last_location",
        JSON.stringify({
          lat: Number(a.lat),
          lng: Number(a.lng),
          line: a.line,
          pincode: a.pincode,
          landmark: a.landmark ?? "",
        }),
      );
    } catch {
      /* remembering the location is optional */
    }
    setPickerOpen(false);
    setAddressConfirmOpen(true);
  }

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
      const line = [
        a["house_number"],
        a["road"],
        a["neighbourhood"],
        a["suburb"],
        a["city_district"],
        a["city"] ?? a["town"] ?? a["village"],
      ]
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
        setForm((f) => {
          try {
            localStorage.setItem(
              "tw_last_location",
              JSON.stringify({
                lat: p.coords.latitude,
                lng: p.coords.longitude,
                line: f.line,
                pincode: f.pincode,
                landmark: f.landmark,
              }),
            );
          } catch {
            /* remembering the location is optional */
          }
          return f;
        });
        setLocating(false);
          setPickerOpen(false);
          setAddressConfirmOpen(true);
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
    // No silent location prompt: the customer picks from a small popup instead.
    const t = setTimeout(() => {
      if (!coordsRef.current) setPickerOpen(true);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distanceKm =
    vendor && coords
      ? haversineKm(coords, { lat: Number(vendor.lat), lng: Number(vendor.lng) })
      : 0;
  const gate = vendor && coords ? checkoutGate(distanceKm, baseTotal) : ({ ok: true } as const);
  const blockedReason = gate.ok ? null : gate.reason;
  // No automatic MRP discount any more: a discount exists only when the stall runs its own offer.
  const hasLocation = Boolean(vendor && coords);
  const bill = hasLocation
    ? computeBill({ settings, foodTotal, mrpTotal: foodTotal, distanceKm })
    : null;
  const stallOff = stallOfferDiscount(foodTotal, vendor?.offer_percent);
  const couponOff = coupon ? couponDiscount(coupon, foodTotal) : 0;
  const netTotal = bill
    ? Math.max(0, Math.round((bill.grandTotal - stallOff - couponOff + tip) * 100) / 100)
    : 0;
  const walletUse = bill && useWallet ? Math.min(walletBalance, netTotal) : 0;
  const payable = bill ? Math.round((netTotal - walletUse) * 100) / 100 : 0;
  const unlockTarget = foodTotal < 200 ? 200 : Math.ceil(foodTotal / 100) * 100;
  const unlockLeft = Math.max(0, unlockTarget - foodTotal);
  const unlockProgress = Math.min(100, (foodTotal / unlockTarget) * 100);
  const standardDeliveryFee = bill ? 22 + Math.max(0, bill.distanceKm - 2) * 3.5 : 0;
  const deliverySavings = bill ? Math.max(0, standardDeliveryFee - bill.deliveryFee) : 0;
  const freeDeliveryUnlocked = Boolean(bill && foodTotal >= 200 && bill.distanceKm <= 5);
  const deliveryPromo = freeDeliveryUnlocked
    ? "You've unlocked free delivery"
    : bill && foodTotal >= 200
      ? "₹30 delivery discount unlocked"
      : foodTotal < 200
        ? `Add ${inr(unlockLeft)} more to unlock free delivery`
        : "Choose an address to unlock free delivery";
  const savings = Math.round((stallOff + couponOff + deliverySavings) * 100) / 100;
  const instructionOptions = [
    { label: "Avoid ringing bell", Icon: BellOff },
    { label: "Leave at the door", Icon: DoorOpen },
    { label: "Leave with security", Icon: ShieldCheck },
    { label: "Avoid calling", Icon: PhoneOff },
  ];
  const suggested = recommendations
    .filter((item) => !lines.some((line) => line.itemId === item.id))
    .slice(0, 6);

  async function applyCoupon() {
    setCouponMsg(null);
    const res = await findCoupon(codeInput, foodTotal);
    if (res.error || !res.coupon) {
      setCoupon(null);
      return setCouponMsg(res.error ?? "This coupon code is not valid.");
    }
    setCoupon(res.coupon);
    setCouponMsg(
      `${res.coupon.code} applied · you save ${inr(couponDiscount(res.coupon, foodTotal))}`,
    );
  }

  if (lines.length === 0) {
    return (
      <Shell>
        <PortalHeader title="Your cart" />
        <p className="px-4 py-20 text-center text-sm text-muted-foreground">
          Your cart is empty. Add something hot.
        </p>
      </Shell>
    );
  }

  async function place(confirmed = false) {
    setErr(null);
    if (!coords) {
      setPickerOpen(true);
      return;
    }
    if (payment === "COD" && !confirmed) {
      setCodConfirmOpen(true);
      return;
    }
    if (!user) {
      if (!guestProfile.name) {
        openLoginModal();
        return;
      }
      if (!form.full_name || form.mobile.length < 10 || form.pincode.length < 6 || !form.line)
        return setErr("Please fill name, 10-digit mobile, 6-digit pincode and full address.");
      if (!coords)
        return setErr("Tap “Use my current location” — every order needs your live location.");
      if (blockedReason) return setErr(blockedReason);
      if (!bill || !vendor) return;

      const localOrder = {
        id: `local-${Date.now()}`,
        code: `TW${Date.now().toString().slice(-7)}`,
        status: "ORDER_PLACED",
        created_at: new Date().toISOString(),
        customer_name: form.full_name,
        customer_mobile: form.mobile,
        address_line: form.landmark ? `${form.line}, ${form.landmark}` : form.line,
        pincode: form.pincode,
        vendor_id: vendor.id,
        vendor_name: vendor.stall_name,
        grand_total: netTotal,
        food_total: bill.foodTotal,
        delivery_fee: bill.deliveryFee,
        payment_mode: "COD",
        items: lines,
      };
      const existing = JSON.parse(
        localStorage.getItem("thelawala.local_orders") || "[]",
      ) as unknown[];
      localStorage.setItem("thelawala.local_orders", JSON.stringify([localOrder, ...existing]));
      cart.clear();
      toast.success("Order placed successfully");
      await navigate({ to: "/" });
      return;
    }
    if (!form.full_name || form.mobile.length < 10 || form.pincode.length < 6 || !form.line)
      return setErr("Please fill name, 10-digit mobile, 6-digit pincode and full address.");
    if (!coords)
      return setErr("Tap “Use my current location” — every order needs your live location.");
    if (blockedReason) return setErr(blockedReason);
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
      await supabase
        .from("addresses")
        .update({ is_default: true, lat: coords.lat, lng: coords.lng })
        .eq("id", sameAddr.id);
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
      // Only two saved locations are kept — drop the oldest extras.
      const { data: all } = await supabase
        .from("addresses")
        .select("id")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      const extra = (all ?? []).slice(2).map((a) => a.id);
      if (extra.length) await supabase.from("addresses").delete().in("id", extra);
    }

    // Online payment always happens first, inside the app. No confirmed payment, no order.
    let paidRef: string | null = null;
    if (payable > 0 && payment === "ONLINE") {
      try {
        const res = await payInAppWithCashfree({
          amount: payable,
          purpose: "ORDER",
          name: form.full_name,
          email: user.email ?? "",
          mobile: form.mobile,
        });
        if (!res.ok) {
          setBusy(false);
          return setErr("Payment Failed! Please try again. Your items are still in the cart.");
        }
        paidRef = res.reference;
      } catch {
        setBusy(false);
        return setErr("Payment Failed! Please try again. Your items are still in the cart.");
      }
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
        base_food_total: Math.round(baseTotal * 100) / 100,
        delivery_fee: bill.deliveryFee,
        platform_fee: bill.platformFee,
        handling_fee: bill.handlingFee,
        packing_fee: bill.packingFee,
        surge_fee: bill.surgeFee,
        grand_total: netTotal,
        coupon_code: coupon?.code ?? null,
        discount_amount: Math.round((couponOff + stallOff) * 100) / 100,
        wallet_paid: walletUse,
        tip_amount: tip,
        delivery_instructions: instructions.trim() || null,
        payment_mode: payable === 0 ? "WALLET" : payment,
        payment_status: payable === 0 || paidRef ? "PAID" : "PENDING",
        gateway_reference_id: paidRef,
        pickup_otp: otp(),
        delivery_otp: pin4(),
        status: "ORDER_PLACED",
      })
      .select("id")
      .single();

    if (order) console.log(`[Order Created -> Sent to Stall ID: ${vendor.id}] order ${order.id}`);

    if (error || !order) {
      console.error("[Order Create Failed]", error);
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

    setBusy(false);
    navigate({ to: "/orders/$id", params: { id: order.id }, search: { placed: 1 } });
  }

  return (
    <Shell>
      <header className="sticky top-0 z-30 bg-card px-4 pb-3 pt-4 shadow-card">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back to home" className="press grid h-10 w-10 place-items-center rounded-full border border-border">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black">Your Cart</h1>
            <p className="truncate text-[11px] text-muted-foreground">{vendor?.stall_name ?? "ThelaWala"} · {lines.reduce((sum, line) => sum + line.qty, 0)} items</p>
          </div>
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </header>
      <div className="bg-brand px-4 py-2 text-center text-sm font-black text-primary">
        {savings > 0 ? `${inr(savings)} saved on this order` : deliveryPromo}
      </div>
      <div className="space-y-3 bg-muted/45 p-3 pb-48">
        <div className="rounded-lg border border-brand bg-brand-soft p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-black">{deliveryPromo}</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${unlockProgress}%` }}
            />
          </div>
        </div>
        <div className="card-soft rise-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{form.full_name || "Delivering to you"}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {form.line || "Add your full address below"}
            </p>
          </div>
          <a
            href="#delivery-details"
            className="press shrink-0 rounded-full border border-primary px-3 py-1.5 text-[11px] font-black text-primary"
          >
            Change
          </a>
        </div>

        <div className="card-soft rise-in p-4">
          <div className="flex items-center justify-between border-b border-dashed border-border pb-3">
            <p className="text-base font-black">15 mins <span className="ml-1 rounded-full bg-brand px-2 py-1 text-[10px] text-primary">⚡ Superfast</span></p>
            <span className="text-xs text-muted-foreground">{lines.reduce((sum, line) => sum + line.qty, 0)} items</span>
          </div>
          <div className="mt-3 space-y-3">
            {lines.map((l) => (
              <div key={l.itemId} className="flex items-center gap-3">
                <img
                  src={l.photo ?? "/food/food-tiffin.jpg"}
                  alt={l.name}
                  className="h-14 w-14 rounded-lg bg-muted object-contain p-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.unit}</p>
                </div>
                <div className="flex h-9 items-center gap-3 rounded-lg border border-primary bg-card px-2 text-primary shadow-card">
                  <button
                    aria-label="Remove one"
                    onClick={() => cart.remove(l.itemId)}
                    className="px-1 font-bold"
                  >
                    −
                  </button>
                  <span className="text-xs font-bold">{l.qty}</span>
                  <button
                    aria-label="Add one"
                    onClick={() => cart.add(l)}
                    className="px-1 font-bold"
                  >
                    +
                  </button>
                </div>
                <p className="w-14 text-right text-sm font-bold">{inr(l.price * l.qty)}</p>
              </div>
            ))}
          </div>
        </div>

        {suggested.length > 0 ? (
          <section className="py-2">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl text-primary">You may also like</h2>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Popular add-ons from {vendor?.stall_name}
                </p>
              </div>
            </div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-2 no-scrollbar">
              {suggested.map((item) => (
                <article
                  key={item.id}
                  className="w-36 shrink-0 snap-start rounded-2xl bg-card p-2 shadow-card"
                >
                  <div className="product-tile relative aspect-square">
                    <img
                      src={item.photo_url ?? "/food/food-tiffin.jpg"}
                      alt={item.name}
                      className="h-full w-full object-contain p-2"
                    />
                    <button
                      type="button"
                      aria-label={`Add ${item.name}`}
                      onClick={() =>
                        cart.add({
                          itemId: item.id,
                          vendorId: item.vendor_id,
                          name: item.name,
                          photo: item.photo_url,
                          unit: item.unit,
                          base: Number(item.price),
                          price: Number(item.price),
                          mrp: Number(item.mrp),
                        })
                      }
                      className="press absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-primary shadow-card"
                    >
                      <Plus className="h-5 w-5" strokeWidth={2.4} />
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-9 text-xs font-extrabold leading-tight">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm font-black text-primary">{inr(Number(item.price))}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <button onClick={() => setPickerOpen(true)} className="card-soft press rise-in flex w-full items-center gap-3 p-4 text-left">
          <MapPin className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">Delivering to {form.full_name || "you"}</p>
            <p className="truncate text-[12px] text-muted-foreground">
              {coords ? form.line || "Selected location" : "No location chosen yet"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>

        {pickerOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/55"
            onClick={() => setPickerOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="rise-in w-full max-w-[480px] space-y-3 rounded-t-[2rem] bg-card p-5 pb-8"
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-border" />
              <p className="text-xl font-black">Choose delivery location</p>
              <p className="text-xs text-muted-foreground">
                Pick a saved location or use your current one.
              </p>
              {saved.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pickSaved(a)}
                  className="press flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left"
                >
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-black">{a.full_name} · {a.mobile}</span><span className="block truncate text-[11px] text-muted-foreground">{a.line}{a.landmark ? `, ${a.landmark}` : ""} — {a.pincode}</span></span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
              <button
                onClick={() => {
                  setPickerOpen(false);
                  locate(true);
                }}
                className="press w-full rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground"
              >
                Use my current location
              </button>
              <button
                onClick={() => {
                  setPickerOpen(false);
                  setCoords(null);
                  document
                    .getElementById("delivery-details")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="press w-full rounded-2xl border border-border py-3 text-sm font-black"
              >
                Add a new address
              </button>
            </div>
          </div>
        ) : null}

        <div
          id="delivery-details"
          className="card-elevated rise-in space-y-2 border border-border p-3"
        >
          <p className="text-sm font-bold">Delivery details</p>
          {(
            [
              ["full_name", "Full name", "text"],
              ["mobile", "Mobile number", "tel"],
              ["pincode", "Pincode", "tel"],
              ["landmark", "Landmark (optional)", "text"],
            ] as const
          ).map(([k, label, type]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                {label}
              </span>
              <input
                type={type}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Full address
            </span>
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
              {distanceKm} km from {vendor.stall_name} · minimum order{" "}
              {inr(minimumOrderValue(distanceKm))} · we deliver up to 15 km
            </p>
          ) : null}
        </div>

        <div className="card-soft rise-in space-y-3 p-4">
          <p className="text-[11px] font-black uppercase text-muted-foreground">Delivery tip</p>
          <p className="text-sm font-bold">A small tip, a big gesture!</p>
          <p className="text-[11px] text-muted-foreground">
            A tip goes fully to your delivery partner.
          </p>
          <div className="flex flex-wrap gap-2">
            {[0, 10, 20, 30].map((t) => (
              <button
                key={t}
                onClick={() => setTip(t)}
                className={`press min-w-16 flex-1 rounded-lg border px-3 py-2.5 text-xs font-black ${tip === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"}`}
              >
                {t === 0 ? "No tip" : `₹${t}`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {instructionOptions.map(({ label, Icon }) => {
              const active = instructions === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setInstructions(active ? "" : label)}
                  className={`press flex min-h-14 items-center gap-2 rounded-lg border p-2 text-left text-[11px] font-bold ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Delivery instructions (e.g. ring the bell, less spicy)"
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="coupon-card rise-in p-4">
          <p className="flex items-center gap-2 text-base font-black"><Tag className="h-5 w-5 text-primary" /> Use coupons</p>
          <div className="mt-2 flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
            />
            {coupon ? (
              <button
                onClick={() => {
                  setCoupon(null);
                  setCodeInput("");
                  setCouponMsg(null);
                }}
                className="press shrink-0 rounded-xl border border-border px-3 text-xs font-black"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={applyCoupon}
                className="press shrink-0 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground"
              >
                Apply
              </button>
            )}
          </div>
          {couponMsg ? (
            <p
              className={`mt-1.5 text-[11px] font-semibold ${coupon ? "text-primary" : "text-destructive"}`}
            >
              {couponMsg}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {offers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCodeInput(c.code);
                  setCoupon(null);
                  setCouponMsg(null);
                }}
                className="press rounded-full border border-dashed border-primary px-2.5 py-1 text-[11px] font-black text-primary"
              >
                {c.code} · {c.description}
              </button>
            ))}
          </div>
        </div>

        <div className="card-soft rise-in p-4">
          <p className="text-[11px] font-black uppercase text-muted-foreground">Bill details</p>
          {bill ? (
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row label="Item total" value={inr(bill.foodTotal)} />
              {stallOff > 0 ? (
                <Row
                  label={`${vendor?.stall_name ?? "Stall"} offer (${Number(vendor?.offer_percent ?? 0)}% off)`}
                  value={`− ${inr(stallOff)}`}
                  good
                />
              ) : null}
              <Row
                label={`Delivery fee (${bill.distanceKm} km)`}
                value={bill.deliveryFee ? inr(bill.deliveryFee) : "FREE"}
              />
              {bill.platformFee ? <Row label="Platform fee" value={inr(bill.platformFee)} /> : null}
              {bill.handlingFee ? <Row label="Handling fee" value={inr(bill.handlingFee)} /> : null}
              {bill.packingFee ? <Row label="Packing fee" value={inr(bill.packingFee)} /> : null}
              {bill.surgeFee ? <Row label="Surge fee" value={inr(bill.surgeFee)} /> : null}
              {couponOff > 0 ? (
                <Row label={`Coupon ${coupon?.code}`} value={`− ${inr(couponOff)}`} good />
              ) : null}
              {tip > 0 ? <Row label="Tip for delivery partner" value={inr(tip)} /> : null}
              {walletUse > 0 ? (
                <Row label="Paid from wallet" value={`− ${inr(walletUse)}`} good />
              ) : null}
              <div className="mt-3 flex justify-between border-t border-dashed border-border pt-3 text-base font-black">
                <span>To pay</span>
                <span>{inr(payable)}</span>
              </div>
              {savings > 0 ? (
                <div className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-xs font-black text-primary">
                  You are saving {inr(savings)} on this order
                </div>
              ) : null}
            </dl>
          ) : !hasLocation ? (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Choose a saved address or use your current location. Your delivery fee is worked out
                from the exact distance to the stall.
              </p>
              <button
                onClick={() => locate(true)}
                disabled={locating}
                className="press w-full rounded-xl bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60"
              >
                {locating ? "Finding your location…" : "Use my current location"}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Loading charges…</p>
          )}
        </div>

        <div className="card-soft rise-in p-4">
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
              <PayBtn
                active={payment === "COD"}
                onClick={() => setPayment("COD")}
                label="Cash on delivery"
                hint="Pay the delivery partner"
              />
            ) : null}
            {settings?.enable_online_payment ? (
              <PayBtn
                active={payment === "ONLINE"}
                onClick={() => setPayment("ONLINE")}
                label="Pay online (UPI / card)"
                hint={`Secured by ${settings.payment_gateway}`}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Online payment is currently switched off.
              </p>
            )}
          </div>
        </div>

        <div className="card-soft p-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-black text-destructive">NOTE: </span>Orders cannot be cancelled once the stall starts preparing them.
          <Link to="/terms" className="mt-1 block font-black text-primary underline">Read cancellation policy</Link>
        </div>
        {err ? <p className="text-xs font-semibold text-destructive">{err}</p> : null}
      </div>

      <div className="fixed inset-x-0 bottom-[92px] z-40 mx-auto w-full max-w-[520px]">
        <div className="sticky-checkout border-x-0 p-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-1 pb-2">
            <p className="truncate text-[11px] font-semibold text-muted-foreground">
              📍 {form.line || "Set your delivery address"}
            </p>
            {coords && vendor ? (
              <span className="shrink-0 text-[11px] font-black text-primary">
                {distanceKm} km away
              </span>
            ) : null}
          </div>
          {blockedReason ? (
            <p className="px-1 pb-2 text-[11px] font-bold text-destructive">{blockedReason}</p>
          ) : null}
          <button disabled={busy || !!blockedReason} onClick={() => void place()} className="press grid w-full grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] items-center gap-3 text-left disabled:opacity-50">
            <span>
              <span className="block text-[10px] font-bold opacity-65">
                {lines.reduce((sum, line) => sum + line.qty, 0)} ITEMS
              </span>
              <span className="text-base font-black">{bill ? inr(payable) : "—"}</span>
            </span>
            <span className="rounded-xl bg-primary px-4 py-4 text-center text-sm font-black text-primary-foreground shadow-card">
              {busy
                ? "PLACING…"
                : !hasLocation
                  ? "Set your address first"
                  : blockedReason
                    ? "Not available"
                    : payment === "COD" ? "Place cash order" : "Proceed to pay"}
            </span>
          </button>
        </div>
      </div>

      {addressConfirmOpen ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/60 p-5" onClick={() => setAddressConfirmOpen(false)}>
          <div className="rise-in w-full max-w-sm rounded-2xl bg-card p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
            <p className="text-2xl font-black">Confirm details</p>
            <div className="mt-4 flex gap-3"><MapPin className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-black">Bhubaneswar</p><p className="text-sm text-muted-foreground">{form.line}{form.landmark ? `, ${form.landmark}` : ""} — {form.pincode}</p></div></div>
            <div className="mt-4 flex gap-3"><Phone className="mt-0.5 h-5 w-5 text-primary" /><p className="font-black">{form.full_name || "Receiver"}, {form.mobile || "add mobile number"}</p></div>
            <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => { setAddressConfirmOpen(false); document.getElementById("delivery-details")?.scrollIntoView({ behavior: "smooth" }); }} className="press rounded-xl bg-brand-soft py-3 text-sm font-black text-primary">Edit details</button><button onClick={() => setAddressConfirmOpen(false)} className="press rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground">Confirm</button></div>
          </div>
        </div>
      ) : null}

      {codConfirmOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/60" onClick={() => setCodConfirmOpen(false)}>
          <div className="rise-in w-full max-w-[520px] rounded-t-[2rem] bg-card p-5 pb-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-primary"><CircleIndianRupee className="h-9 w-9" /></div>
            <h2 className="mt-4 text-2xl font-black">Place cash order?</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Give cash or ask your delivery partner for a UPI QR code when your order is delivered.</p>
            <div className="mt-6 grid grid-cols-2 gap-2"><button onClick={() => setCodConfirmOpen(false)} className="press rounded-xl bg-muted py-3.5 font-black">Cancel</button><button onClick={() => { setCodConfirmOpen(false); void place(true); }} className="press rounded-xl bg-primary py-3.5 font-black text-primary-foreground">Yes, place order</button></div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

function PayBtn({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
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
