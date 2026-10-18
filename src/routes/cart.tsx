import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { GUEST_PROFILE_EVENT, openLoginModal } from "@/components/LoginModal";
import type { SavedAddress } from "@/components/AddressBook";
import { supabase } from "@/integrations/supabase/client";
import { cart, cartTotals, useCart } from "@/lib/cart";
import { couponDiscount, findCoupon, listCoupons, PENDING_HOME_COUPON_KEY, type Coupon } from "@/lib/coupons";
import { computeBill, haversineKm, inr, type Settings } from "@/lib/fees";
import { checkoutGate, minimumOrderValue, stallOfferDiscount } from "@/lib/pricing";
import { payInAppWithCashfree } from "@/lib/checkout";
import { codRestrictionUntil } from "@/lib/codPolicy";
import { useSession } from "@/lib/session";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Banknote, Bike, BellOff, ChevronRight, ChevronsRight, CircleDollarSign, CreditCard, DoorOpen, MapPin, Phone, PhoneOff, Plus, ShieldCheck, ShoppingCart, Smartphone, Tag } from "lucide-react";
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
type PlacementStage = "idle" | "placing";

function Cart() {
  const navigate = useNavigate();
  const { user } = useSession();
  const userId = user?.id;
  const lines = useCart();
  const cartVendorId = lines[0]?.vendorId;
  const { foodTotal, baseTotal, mrpTotal } = cartTotals(lines);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment">("cart");
  const [placementStage, setPlacementStage] = useState<PlacementStage>("idle");

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
  const [payment, setPayment] = useState<"COD" | "ONLINE" | "SPLIT">("COD");
  const [codRestriction, setCodRestriction] = useState<number | null>(null);
  const [codPolicyChecked, setCodPolicyChecked] = useState(false);
  const [codPolicyError, setCodPolicyError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [offers, setOffers] = useState<Coupon[]>([]);
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [otherTipActive, setOtherTipActive] = useState(false);
  const [onlineMethod, setOnlineMethod] = useState<"UPI" | "CARD">("UPI");
  const [instructions, setInstructions] = useState("");
  const [locating, setLocating] = useState(false);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addressConfirmOpen, setAddressConfirmOpen] = useState(false);
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
  const autoTried = useRef(false);
  const coordsRef = useRef(coords);
  const formRef = useRef(form);
  coordsRef.current = coords;
  formRef.current = form;

  useEffect(() => {
    listCoupons().then((cs) => setOffers(cs.filter((c) => c.is_active).slice(0, 3)));
  }, []);

  useEffect(() => {
    try {
      const pendingCode = window.localStorage.getItem(PENDING_HOME_COUPON_KEY);
      if (pendingCode) setCodeInput(pendingCode);
    } catch {
      // Continue without a home-modal coupon when browser storage is unavailable.
    }
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
    if (!userId) return;
    supabase
      .from("wallets")
      .select("balance,status")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setWalletBalance(data?.status === "ACTIVE" ? Number(data.balance) : 0));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setCodPolicyChecked(false);
    setCodPolicyError(false);
    setCodRestriction(null);
    const now = Date.now();
    void supabase
      .from("orders")
      .select("cancelled_at")
      .eq("user_id", userId)
      .eq("payment_mode", "COD")
      .eq("status", "CANCELLED")
      .eq("cancelled_by", "CUSTOMER")
      .gte("cancelled_at", new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString())
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error("Could not check COD cancellation history:", error);
          setCodPolicyError(true);
          setPayment("ONLINE");
        } else {
          const until = codRestrictionUntil(
            (data ?? []).map((row) => row.cancelled_at).filter((value): value is string => Boolean(value)),
            now,
          );
          setCodRestriction(until);
          if (until) setPayment("ONLINE");
        }
        setCodPolicyChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    const vid = cartVendorId;
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
  }, [cartVendorId]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
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
  }, [userId]);

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
  const minimumShortfall = blockedReason?.startsWith("Minimum order")
    ? Math.max(0, minimumOrderValue(distanceKm) - baseTotal)
    : 0;
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
  const onlineDue = payment === "SPLIT" ? Math.round(payable * 50) / 100 : payable;
  const standardDeliveryFee = bill ? 22 + Math.max(0, bill.distanceKm - 2) * 3.5 : 0;
  const deliverySavings = bill ? Math.max(0, standardDeliveryFee - bill.deliveryFee) : 0;
  const savings = Math.round((Math.max(0, mrpTotal - foodTotal) + stallOff + couponOff + deliverySavings) * 100) / 100;
  const instructionOptions = [
    { label: "Avoid ringing bell", Icon: BellOff },
    { label: "Leave at the door", Icon: DoorOpen },
    { label: "Leave with security", Icon: ShieldCheck },
    { label: "Avoid calling", Icon: PhoneOff },
  ];
  const suggested = recommendations
    .filter((item) => !lines.some((line) => line.itemId === item.id))
    .slice(0, 6);

  const applyCoupon = useCallback(async (code = codeInput) => {
    setCouponMsg(null);
    const res = await findCoupon(code, foodTotal);
    if (res.error || !res.coupon) {
      setCoupon(null);
      return setCouponMsg(res.error ?? "This coupon code is not valid.");
    }
    setCoupon(res.coupon);
    setCouponMsg(
      `${res.coupon.code} applied · you save ${inr(couponDiscount(res.coupon, foodTotal))}`,
    );
  }, [codeInput, foodTotal]);

  useEffect(() => {
    let pendingCode: string | null = null;
    try {
      pendingCode = window.localStorage.getItem(PENDING_HOME_COUPON_KEY);
      if (pendingCode && pendingCode === codeInput) window.localStorage.removeItem(PENDING_HOME_COUPON_KEY);
      else pendingCode = null;
    } catch {
      // Manual coupon entry remains available when browser storage is unavailable.
    }
    if (pendingCode) void applyCoupon(pendingCode);
  }, [applyCoupon, codeInput]);

  if (lines.length === 0) {
    return (
      <Shell>
        <PortalHeader title="Your cart" />
        <section className="grid min-h-[55vh] place-items-center px-6 py-12 text-center">
          <div>
            <div className="relative mx-auto grid h-32 w-32 place-items-center rounded-full bg-brand-soft text-primary">
              <ShoppingCart className="h-16 w-16" strokeWidth={1.6} />
              <span className="absolute -right-1 top-1 text-4xl" aria-hidden="true">🛒</span>
              <span className="absolute -bottom-1 left-1 text-3xl" aria-hidden="true">🍽️</span>
            </div>
            <h2 className="mt-6 font-display text-3xl text-primary">ThelaWala cart is empty</h2>
            <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">Add your favourite hot street food and it will appear here.</p>
            <Link to="/" className="press mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground">Browse food</Link>
          </div>
        </section>
      </Shell>
    );
  }

  function proceedToPayment() {
    setErr(null);
    if (!coords) {
      setPickerOpen(true);
      return;
    }
    if (!user) {
      openLoginModal();
      return;
    }
    if (!form.full_name || form.mobile.length < 10 || form.pincode.length < 6 || !form.line) {
      setErr("Please add your name, 10-digit mobile number, PIN code and full address.");
      document.getElementById("delivery-details")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (blockedReason) return setErr(blockedReason);
    if ((payment === "COD" || payment === "SPLIT") && (codPolicyError || !codPolicyChecked || codRestriction)) {
      setPayment("ONLINE");
      return setErr("Cash on Delivery is unavailable. Please choose full online payment.");
    }
    if (!bill || !vendor) return;
    setCheckoutStep("payment");
  }

  async function place() {
    setErr(null);
    if (!coords) {
      setPickerOpen(true);
      return;
    }
    if (!user) {
      openLoginModal();
      return;
    }
    if (!form.full_name || form.mobile.length < 10 || form.pincode.length < 6 || !form.line)
      return setErr("Please fill name, 10-digit mobile, 6-digit pincode and full address.");
    if (!coords)
      return setErr("Tap “Use my current location” — every order needs your live location.");
    if (blockedReason) return setErr(blockedReason);
    if (!bill || !vendor) return;
    if ((payment === "COD" || payment === "SPLIT") && payable > 0) {
      const checkedAt = Date.now();
      const { data: cancellations, error: cancellationError } = await supabase
        .from("orders")
        .select("cancelled_at")
        .eq("user_id", user.id)
        .eq("payment_mode", "COD")
        .eq("status", "CANCELLED")
        .eq("cancelled_by", "CUSTOMER")
        .gte("cancelled_at", new Date(checkedAt - 120 * 24 * 60 * 60 * 1000).toISOString());
      if (cancellationError) {
        console.error("Could not verify COD eligibility before checkout:", cancellationError);
        setPayment("ONLINE");
        return setErr("We couldn't verify Cash on Delivery eligibility. Please use full online payment.");
      }
      const until = codRestrictionUntil(
        (cancellations ?? []).map((row) => row.cancelled_at).filter((value): value is string => Boolean(value)),
        checkedAt,
      );
      if (until) {
        setCodRestriction(until);
        if (payment === "COD") {
          setPayment("ONLINE");
          return setErr(`Cash on Delivery is paused until ${new Date(until).toLocaleDateString()}. Please choose split payment or pay online.`);
        }
      } else if (payment === "SPLIT") {
        return setErr("The split payment option is only available while Cash on Delivery is restricted.");
      }
    }

    const regularSubtotal = lines
      .filter((line) => !line.promotionalMinimum)
      .reduce((sum, line) => sum + line.price * line.qty, 0);
    const lockedOffer = lines.find(
      (line) => line.promotionalMinimum && regularSubtotal < line.promotionalMinimum,
    );
    if (lockedOffer) {
      return setErr(`Add ${inr(lockedOffer.promotionalMinimum! - regularSubtotal)} more in regular menu items to keep the ₹1 offer.`);
    }

    const startPlacement = () => {
      setPlacementStage("placing");
    };
    setBusy(true);
    const isOnlineCheckout = payment === "ONLINE" || payment === "SPLIT";
    if (!(payable > 0 && isOnlineCheckout)) startPlacement();
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
    if (payable > 0 && isOnlineCheckout) {
      try {
        const res = await payInAppWithCashfree({
          amount: payment === "SPLIT" ? Math.round(payable * 50) / 100 : payable,
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
        startPlacement();
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
        delivery_instructions: [
          `KOT: ${lines.map((line) => `${line.qty}x ${line.name}${line.options?.length ? ` (${line.options.join(", ")})` : ""}`).join(", ")}`,
          instructions.trim(),
        ].filter(Boolean).join("\n") || null,
        payment_mode: payable === 0 ? "WALLET" : payment === "SPLIT" ? "COD" : payment,
        payment_status: payable === 0 || payment === "ONLINE" && paidRef
          ? "PAID"
          : payment === "SPLIT" && paidRef ? "PARTIAL" : "PENDING",
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
      setPlacementStage("idle");
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

    setBusy(false);
    await navigate({
      to: "/orders/$id",
      params: { id: order.id },
      search: { placed: 1 },
      replace: true,
    });
    cart.clear();
  }

  return (
    <Shell>
      {checkoutStep === "cart" ? (
        <>
      <header className="sticky top-0 z-30 border-b border-border bg-background px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back to home" className="press grid h-10 w-10 place-items-center rounded-full border border-border">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black">Your Cart</h1>
            <p className="truncate text-[11px] text-muted-foreground">{vendor?.stall_name ?? "ThelaWala"} · {lines.reduce((sum, line) => sum + line.qty, 0)} items</p>
          </div>
            <span className="shrink-0 rounded-full bg-brand-soft px-3 py-2 text-xs font-black text-primary">{inr(savings)} saved!</span>
        </div>
        <ol aria-label="Checkout progress" className="mt-4 grid grid-cols-3 gap-2">
          {(["Menu", "Cart", "Checkout"] as const).map((step, index) => (
            <li key={step} className={`flex items-center gap-2 text-[11px] font-extrabold ${index <= 1 ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${index === 1 ? "bg-primary text-white" : index === 0 ? "bg-brand-soft text-primary" : "bg-muted text-muted-foreground"}`}>{index === 0 ? "✓" : index + 1}</span>
              {step}
              {index < 2 ? <span className="h-px flex-1 bg-border" /> : null}
            </li>
          ))}
        </ol>
      </header>
      <div className="space-y-3 bg-muted/45 p-3 pb-48">
        <div className="card-soft rise-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">Bhubaneswar</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {form.line || "Choose a delivery address"}
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
            <p className="text-base font-black">Your local order</p>
            <span className="text-xs text-muted-foreground">{lines.reduce((sum, line) => sum + line.qty, 0)} items</span>
          </div>
          <div className="mt-3 space-y-3">
            {lines.map((l) => (
              <div key={l.itemId} className="flex items-center gap-3 border-b border-border/70 pb-3 last:border-0 last:pb-0">
                <img
                  src={l.photo ?? "/food/food-tiffin.jpg"}
                  alt={l.name}
                  className="h-16 w-16 shrink-0 rounded-2xl bg-muted object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{l.name}</p>
                  <p className="line-clamp-2 text-[11px] font-medium leading-snug text-muted-foreground">{vendor?.stall_name ?? "Local stall"} · {l.unit || "Street food"}</p>
                  <p className="mt-1 text-xs font-bold text-primary">{inr(l.price)} <span className="font-medium text-muted-foreground">each</span></p>
                </div>
                <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-muted px-1.5 text-foreground">
                  <button
                    aria-label="Remove one"
                    onClick={() => cart.remove(l.itemId)}
                    className="grid h-7 w-7 place-items-center rounded-full bg-white font-bold text-primary shadow-sm"
                  >
                    −
                  </button>
                  <span className="min-w-3 text-center text-xs font-bold">{l.qty}</span>
                  <button
                    aria-label="Add one"
                    onClick={() => cart.add(l)}
                    className="grid h-7 w-7 place-items-center rounded-full bg-primary font-bold text-white"
                  >
                    +
                  </button>
                </div>
                <p className="min-w-14 text-right text-sm font-extrabold">{inr(l.price * l.qty)}</p>
              </div>
            ))}
          </div>
        </div>

        {suggested.length > 0 ? (
          <section className="py-2">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground">Popular with your order</h2>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Popular add-ons from {vendor?.stall_name}
                </p>
              </div>
            </div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-2 no-scrollbar">
              {suggested.map((item) => (
                <article
                  key={item.id}
                  className="w-36 shrink-0 snap-start rounded-3xl border border-border bg-card p-2 shadow-sm"
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
                      className="press absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-card"
                    >
                      <Plus className="h-5 w-5" strokeWidth={2.4} />
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-9 text-xs font-extrabold leading-tight">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.unit || "Street food"}</p>
                  <p className="mt-1 text-sm font-black text-primary">
                    {inr(Number(item.price))}{" "}
                    {Number(item.mrp) > Number(item.price) ? (
                      <span className="text-[10px] font-medium text-muted-foreground line-through">
                        {inr(Number(item.mrp))}
                      </span>
                    ) : null}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <button onClick={() => setPickerOpen(true)} className="card-soft press rise-in flex w-full items-center gap-3 p-4 text-left">
          <MapPin className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">Bhubaneswar</p>
            <p className="truncate text-[12px] text-muted-foreground">
              {coords ? form.line || "Selected location" : "Choose a delivery address"}
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
          <p className="text-sm font-bold">Delivery notes</p>
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

        <div className="card-soft rise-in space-y-3 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand text-brand-foreground"><Bike className="h-5 w-5" /></span>
            <div><p className="text-[11px] font-black uppercase text-muted-foreground">Delivery tip</p><p className="text-sm font-bold">100% goes to your delivery partner</p></div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 30].map((amount) => (
              <button
                key={amount}
                onClick={() => { setTip(amount); setOtherTipActive(false); }}
                className={`press relative rounded-lg border px-2 py-2.5 text-xs font-black ${tip === amount && !otherTipActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
              >
                ₹{amount}{amount === 20 ? <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-1.5 py-0.5 text-[8px] text-brand-foreground">Most tipped</span> : null}
              </button>
            ))}
            <button
              onClick={() => setOtherTipActive((active) => !active)}
              className={`press rounded-lg border px-2 py-2.5 text-xs font-black ${otherTipActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
            >Other</button>
          </div>
          {otherTipActive ? (
            <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-sm font-bold">₹</span>
              <input inputMode="numeric" value={customTip} onChange={(event) => { const value = event.target.value.replace(/\D/g, "").slice(0, 3); setCustomTip(value); setTip(Number(value) || 0); }} placeholder="Enter tip" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          ) : null}
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
                onClick={() => void applyCoupon()}
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

        <div className="rise-in border-y border-border px-1 py-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Bill details</p>
          {bill ? (
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row label="Item Total" value={inr(bill.foodTotal)} />
              {stallOff > 0 ? (
                <Row
                  label={`${vendor?.stall_name ?? "Stall"} offer (${Number(vendor?.offer_percent ?? 0)}% off)`}
                  value={`− ${inr(stallOff)}`}
                  good
                />
              ) : null}
              <Row label="Handling Fee" value={inr(bill.handlingFee)} />
              <Row
                label={`Delivery Partner Fee (${bill.distanceKm} km)`}
                value={bill.deliveryFee ? inr(bill.deliveryFee) : "FREE"}
              />
              <Row label="Platform Fee" value={inr(bill.platformFee)} />
              <Row label="GST and Charges" value={inr(bill.packingFee + bill.surgeFee)} />
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

        <div className="card-soft p-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-black text-destructive">NOTE: </span>Orders cannot be cancelled and are non-refundable once packed for delivery.
          <Link to="/terms" className="mt-1 block font-black text-primary underline">Read cancellation policy</Link>
        </div>
        {err ? <p className="text-xs font-semibold text-destructive">{err}</p> : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px]">
        <div className="border-t border-border bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(17,24,39,0.1)]">
          <button type="button" onClick={() => setCheckoutStep("payment")} className="mb-2 flex w-full items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2.5 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-primary"><Banknote className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black">{payment === "COD" ? "Cash/Pay on Delivery" : onlineMethod === "UPI" ? "UPI payment" : "Credit or debit card"}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{payment === "COD" ? "Pay cash at the time of delivery." : `Pay securely with ${settings?.payment_gateway ?? "online payment"}.`}</span>
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-black text-primary">Change <ChevronRight className="h-3.5 w-3.5" /></span>
          </button>
          {blockedReason ? <p className="px-1 pb-2 text-[11px] font-bold text-destructive">{minimumShortfall > 0 ? `Add ${inr(minimumShortfall)} more to order` : blockedReason}</p> : null}
          <button disabled={busy || !!blockedReason || !hasLocation} onClick={() => void place()} className="press flex w-full items-center justify-between gap-3 rounded-xl bg-primary px-4 py-4 text-left text-primary-foreground shadow-md disabled:opacity-50">
            <span className="flex items-center gap-2"><ChevronsRight className="h-5 w-5" /><span className="text-sm font-black">{busy ? "Placing your order…" : minimumShortfall > 0 ? `Add ${inr(minimumShortfall)} more to order` : payment === "COD" ? "Place Cash Order" : `Pay with ${onlineMethod}`}</span></span>
            <span className="shrink-0 text-base font-black">{bill ? inr(payable) : "—"}</span>
          </button>
        </div>
      </div>
        </>
      ) : (
        <>
          <header className="sticky top-0 z-30 bg-background px-4 py-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCheckoutStep("cart")} aria-label="Back to your cart" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-black">Pay on Delivery &amp; UPI</h1>
                <p className="text-[11px] text-muted-foreground">Choose how you&apos;d like to pay</p>
              </div>
            </div>
            <ol aria-label="Checkout progress" className="mt-4 grid grid-cols-3 gap-2">
              {(["Menu", "Cart", "Checkout"] as const).map((step, index) => (
                <li key={step} className={`flex items-center gap-2 text-[11px] font-extrabold ${index < 2 ? "text-primary" : "text-muted-foreground"}`}>
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${index < 2 ? "bg-brand-soft text-primary" : "bg-primary text-white"}`}>{index < 2 ? "✓" : index + 1}</span>
                  {step}
                  {index < 2 ? <span className="h-px flex-1 bg-border" /> : null}
                </li>
              ))}
            </ol>
          </header>
          <main className="space-y-3 bg-muted/45 p-3 pb-36">
            <section className="card-soft space-y-3 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground"><MapPin className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black leading-snug">{form.full_name || "Delivery details"}{form.mobile ? ` · ${form.mobile}` : ""}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{form.line}{form.pincode ? ` · ${form.pincode}` : ""}</p>
                  {form.landmark ? <p className="truncate text-[11px] text-muted-foreground">{form.landmark}</p> : null}
                </div>
                <button type="button" onClick={() => { setCheckoutStep("cart"); setTimeout(() => document.getElementById("delivery-details")?.scrollIntoView({ behavior: "smooth" }), 0); }} className="text-xs font-black text-primary">Edit</button>
              </div>
            </section>

            <section className="card-soft space-y-2 p-4">
              <p className="text-sm font-bold">Delivery notes</p>
              <p className="text-xs text-muted-foreground">{instructions || "No delivery notes added."}</p>
            </section>

            <section className="card-soft space-y-3 p-4">
              <div>
                <h2 className="text-base font-black">Pay on Delivery</h2>
                <p className="text-xs text-muted-foreground">Pay your delivery partner when your food arrives.</p>
              </div>
              {codRestriction ? (
                <p className="rounded-xl bg-[#FFF0E9] px-3 py-2.5 text-xs font-semibold text-[#9A3412]">
                  Cash on Delivery is temporarily unavailable until {new Date(codRestriction).toLocaleDateString()}. Choose split payment or full online payment.
                </p>
              ) : codPolicyError ? (
                <p className="rounded-xl bg-[#FFF0E9] px-3 py-2.5 text-xs font-semibold text-[#9A3412]">
                  We couldn&apos;t confirm Cash on Delivery eligibility. Full online payment is available instead.
                </p>
              ) : !codPolicyChecked ? (
                <p className="rounded-xl bg-muted px-3 py-2.5 text-xs font-medium text-muted-foreground">
                  Checking Cash on Delivery availability…
                </p>
              ) : null}
              {settings?.enable_cod !== false && codPolicyChecked && !codPolicyError && !codRestriction ? (
                <PayBtn active={payment === "COD"} onClick={() => setPayment("COD")} label="Cash/Pay on Delivery" hint="Cash at your doorstep" Icon={Banknote} />
              ) : null}
              {codRestriction && settings?.enable_cod !== false && settings?.enable_online_payment ? (
                <PayBtn
                  active={payment === "SPLIT"}
                  onClick={() => setPayment("SPLIT")}
                  label="50% online + 50% on delivery"
                  hint={`Pay ${inr(Math.round(payable * 50) / 100)} now; the remaining balance is due to your rider.`}
                  Icon={CircleDollarSign}
                />
              ) : null}
              {settings?.enable_online_payment ? (
                <>
                  <PayBtn active={payment === "ONLINE" && onlineMethod === "UPI"} onClick={() => { setPayment("ONLINE"); setOnlineMethod("UPI"); }} label="UPI" hint={`Secure payment via ${settings.payment_gateway}`} Icon={Smartphone} />
                  {payment === "ONLINE" && onlineMethod === "UPI" ? (
                    <div className="flex flex-wrap gap-2 pl-1">
                      {["Google Pay", "Paytm", "PhonePe"].map((app) => <span key={app} className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground">{app}</span>)}
                    </div>
                  ) : null}
                  <PayBtn active={payment === "ONLINE" && onlineMethod === "CARD"} onClick={() => { setPayment("ONLINE"); setOnlineMethod("CARD"); }} label="Credit or debit card" hint="Visa, Mastercard and more" Icon={CreditCard} />
                </>
              ) : (
                <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">UPI and card payments are currently unavailable.</p>
              )}
              {walletBalance > 0 ? (
                <button type="button" onClick={() => setUseWallet((active) => !active)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-bold ${useWallet ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                  Use wallet balance ({inr(walletBalance)})<span>{useWallet ? "Selected" : "Not selected"}</span>
                </button>
              ) : null}
            </section>

            <section className="card-soft p-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Order total</span><span className="font-bold">{inr(netTotal)}</span></div>
              {walletUse > 0 ? <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">Wallet balance</span><span className="font-bold text-primary">− {inr(walletUse)}</span></div> : null}
              {payment === "SPLIT" ? (
                <>
                  <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">Pay online now</span><span className="font-bold">{inr(onlineDue)}</span></div>
                  <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">Due on delivery</span><span className="font-bold">{inr(payable - onlineDue)}</span></div>
                </>
              ) : null}
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-black"><span>{payment === "SPLIT" ? "Total remaining after wallet" : "To pay"}</span><span>{inr(payable)}</span></div>
            </section>
            {err ? <p className="rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive">{err}</p> : null}
          </main>
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" disabled={busy || !!blockedReason || ((payment === "ONLINE" || payment === "SPLIT") && !settings?.enable_online_payment)} onClick={() => void place()} className="press flex w-full items-center justify-between rounded-xl bg-primary px-4 py-4 text-left text-primary-foreground shadow-card disabled:opacity-50">
              <span><span className="block text-[10px] font-bold opacity-75">{busy ? "SECURELY PROCESSING" : payment === "SPLIT" ? "PAY ONLINE NOW" : "TOTAL TO PAY"}</span><span className="text-lg font-black">{inr(onlineDue)}</span></span>
              <span className="flex items-center gap-2 text-sm font-black">{busy ? "Please wait…" : minimumShortfall > 0 ? `Add ${inr(minimumShortfall)} more to order` : payment === "COD" ? `Pay ${inr(payable)} with Cash` : payment === "SPLIT" ? `Pay 50% now via ${onlineMethod}` : `Pay ${inr(payable)} with ${onlineMethod}`}<ChevronRight className="h-4 w-4" /></span>
            </button>
          </div>
        </>
      )}

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

      <AnimatePresence mode="wait" initial={false}>
        {placementStage !== "idle" ? (
          <motion.div
            key={placementStage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-white px-6 text-center"
            aria-live="assertive"
          >
            <motion.div initial={{ y: 10, scale: 0.97 }} animate={{ y: 0, scale: 1 }} className="w-full max-w-sm">
                <div className="relative mx-auto grid h-40 w-40 place-items-center rounded-full">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-[5px] border-border border-t-primary" />
                  <motion.span animate={{ scale: [1, 1.55], opacity: [0.55, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} className="absolute h-16 w-16 rounded-full border-2 border-primary" />
                  <span className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-white text-foreground">
                    <MapPin className="h-9 w-9" strokeWidth={2.5} />
                  </span>
                </div>
                <p className="mt-7 text-sm font-bold text-foreground">Placing order to</p>
                <h2 className="mt-1 text-2xl font-black text-primary">Bhubaneswar</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{[form.line, form.landmark, form.pincode].filter(Boolean).join(", ")}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </Shell>
  );
}

function PayBtn({
  active,
  onClick,
  label,
  hint,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  Icon?: import("react").ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left ${active ? "border-primary" : "border-border"}`}
    >
      <p className={`flex items-center gap-1.5 text-sm font-bold ${active ? "text-primary" : ""}`}>{Icon ? <Icon className="h-4 w-4" /> : null}{label}</p>
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
