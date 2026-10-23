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
import { useSession } from "@/lib/session";
import { usePromotionalCredit } from "@/lib/promotionalCredit";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ArrowLeft, ChevronDown, ChevronUp, ShieldCheck, CheckCircle2, 
  MapPin, ShoppingCart, Tag, CreditCard, Banknote, Smartphone, Landmark, Check
} from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: Cart,
});

const otp = () => String(Math.floor(100000 + Math.random() * 900000));
const pin4 = () => String(Math.floor(1000 + Math.random() * 9000));

export function Cart() {
  const navigate = useNavigate();
  const { user } = useSession();
  const userId = user?.id;
  const promotionalCredit = usePromotionalCredit(userId);
  const lines = useCart();
  const cartVendorId = lines[0]?.vendorId;
  const { foodTotal, baseTotal } = cartTotals(lines);

  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment">("cart");
  const [placementStage, setPlacementStage] = useState<"idle" | "placing">("idle");
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const [vendor, setVendor] = useState<{ id: string; stall_name: string; lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ full_name: "", mobile: "", pincode: "", line: "", landmark: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({ lat: 20.2961, lng: 85.8245 });

  // Flipkart style Accordion states: 'upi' | 'card' | 'netbanking' | 'cod'
  const [selectedAccordion, setSelectedAccordion] = useState<string>("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>("phonepe");
  const [customUpiId, setCustomUpiId] = useState<string>("");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [validThru, setValidThru] = useState("");
  const [cvv, setCvv] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    if (!cartVendorId) return;
    supabase
      .from("vendors")
      .select("id,stall_name,lat,lng")
      .eq("id", cartVendorId)
      .maybeSingle()
      .then(({ data }) => setVendor(data as any));
  }, [cartVendorId]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name || "",
            mobile: data.mobile || "",
            pincode: data.pincode || "",
            line: data.line || "",
            landmark: data.landmark || "",
          });
          if (data.lat && data.lng) setCoords({ lat: Number(data.lat), lng: Number(data.lng) });
        }
      });
  }, [userId]);

  const deliveryFee = foodTotal > 0 ? 25 : 0;
  const platformFee = foodTotal > 0 ? 3 : 0;
  const codFee = selectedAccordion === "cod" ? 10 : 0; // Nominal COD handling fee
  const payable = foodTotal + deliveryFee + platformFee + tip + codFee;

  async function handleFinalPlaceOrder() {
    setErr(null);
    if (!user) {
      openLoginModal();
      return;
    }
    if (!form.full_name || form.mobile.length < 10 || !form.line) {
      setCheckoutStep("cart");
      setErr("Maherbaani kari ne puru delivery address ane mobile number bhari dyo.");
      return;
    }

    let paidReference: string | null = null;

    // Online Payments (UPI, Card, Netbanking) via Cashfree
    if (selectedAccordion !== "cod" && payable > 0) {
      try {
        const paymentRes = await payInAppWithCashfree({
          amount: payable,
          purpose: "ORDER",
          name: form.full_name,
          email: user.email ?? "",
          mobile: form.mobile,
        });

        if (!paymentRes.ok) {
          setErr("Payment fail thayu chhe athva radd karva ma aavyu chhe. COD try karo!");
          return;
        }
        paidReference = paymentRes.reference;
      } catch (e: any) {
        setErr("Payment Gateway connect nathi thayu. Tame Cash on Delivery (COD) select kari shako chho!");
        return;
      }
    }

    setBusy(true);

    try {
      const orderCode = `TW${Date.now().toString().slice(-7)}`;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          code: orderCode,
          user_id: user.id,
          vendor_id: vendor?.id || lines[0]?.vendorId,
          customer_name: form.full_name,
          customer_mobile: form.mobile,
          address_line: form.landmark ? `${form.line}, ${form.landmark}` : form.line,
          pincode: form.pincode,
          drop_lat: coords?.lat ?? 20.2961,
          drop_lng: coords?.lng ?? 85.8245,
          distance_km: 2.5,
          food_total: foodTotal,
          delivery_fee: deliveryFee,
          platform_fee: platformFee,
          grand_total: payable,
          payment_mode: selectedAccordion === "cod" ? "COD" : "ONLINE",
          payment_status: selectedAccordion === "cod" ? "PENDING" : "PAID",
          gateway_reference_id: paidReference,
          pickup_otp: otp(),
          delivery_otp: pin4(),
          status: "ORDER_PLACED",
        })
        .select("id")
        .single();

      if (error || !order) {
        setBusy(false);
        setErr(error?.message || "Order place nathi thai shakyo.");
        return;
      }

      await supabase.from("order_items").insert(
        lines.map((l) => ({
          order_id: order.id,
          item_id: l.itemId,
          name: l.name,
          qty: l.qty,
          price: l.price,
          mrp: l.price,
          photo_url: l.photo,
        }))
      );

      setBusy(false);
      setCreatedOrderId(order.id);
      setPlacementStage("placing");
      cart.clear();
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message || "Koi bhul aavi chhe.");
    }
  }

  if (lines.length === 0 && placementStage !== "placing") {
    return (
      <Shell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-orange-100 text-[#FF6600]">
            <ShoppingCart className="h-12 w-12" />
          </div>
          <h2 className="mt-4 text-xl font-black">Your Cart is Empty</h2>
          <p className="mt-1 text-xs text-gray-500">Tame ajuni koi food item add nathi kari.</p>
          <Link to="/" className="mt-6 rounded-full bg-[#FF6600] px-6 py-3 text-xs font-black text-white">
            Browse Menu
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {checkoutStep === "cart" ? (
        <div className="min-h-screen bg-gray-50 pb-32">
          {/* Header */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3.5">
            <Link to="/" className="grid h-9 w-9 place-items-center rounded-full bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-base font-black text-gray-900">Step 2 of 3: Cart</h1>
              <p className="text-[11px] text-gray-500">{lines.length} items in your order</p>
            </div>
          </header>

          <main className="p-4 space-y-4 max-w-lg mx-auto">
            {err && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600 border border-red-200">
                {err}
              </div>
            )}

            {/* Cart Items */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm divide-y divide-gray-100">
              {lines.map((l) => (
                <div key={l.itemId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {l.photo && <img src={l.photo} alt={l.name} className="h-12 w-12 rounded-xl object-cover" />}
                    <div>
                      <p className="text-xs font-bold text-gray-900 line-clamp-1">{l.name}</p>
                      <p className="text-xs font-black text-[#FF6600]">₹{l.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg bg-orange-50 px-2 py-1 text-xs font-black text-[#FF6600]">
                    <button onClick={() => cart.remove(l.itemId)}>−</button>
                    <span>{l.qty}</span>
                    <button onClick={() => cart.add(l)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery Details */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Delivery Address</h3>
              <input
                type="text"
                placeholder="Receiver's Full Name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs outline-none focus:border-[#FF6600]"
              />
              <input
                type="tel"
                placeholder="10-digit Mobile Number"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs outline-none focus:border-[#FF6600]"
              />
              <textarea
                placeholder="House / Flat / Street address in Bhubaneswar"
                value={form.line}
                onChange={(e) => setForm({ ...form, line: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs outline-none focus:border-[#FF6600]"
                rows={2}
              />
            </div>

            {/* Price Details */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Food Subtotal</span>
                <span className="font-bold text-gray-900">₹{foodTotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span className="font-bold text-gray-900">₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform Fee</span>
                <span className="font-bold text-gray-900">₹{platformFee}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-black text-gray-900">
                <span>Total Amount</span>
                <span className="text-[#FF6600]">₹{payable}</span>
              </div>
            </div>
          </main>

          {/* Bottom Proceed Bar */}
          <div className="fixed inset-x-0 bottom-0 z-30 bg-white border-t border-gray-100 p-3 shadow-lg max-w-lg mx-auto">
            <button
              onClick={() => {
                if (!form.full_name || form.mobile.length < 10 || !form.line) {
                  setErr("Krupa kari ne pehla delivery address puro lakho.");
                  return;
                }
                setErr(null);
                setCheckoutStep("payment");
              }}
              className="w-full rounded-2xl bg-[#FF6600] py-4 text-sm font-black text-white shadow-lg shadow-orange-500/25 active:scale-95 flex items-center justify-between px-6"
            >
              <span>Total: ₹{payable}</span>
              <span>Select Payment Method →</span>
            </button>
          </div>
        </div>
      ) : (
        /* FLIPKART STYLE STEP 3: PAYMENTS ACCORDION VIEW */
        <div className="min-h-screen bg-gray-50 pb-28">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3.5">
            <div className="flex items-center gap-3">
              <button onClick={() => setCheckoutStep("cart")} className="grid h-9 w-9 place-items-center rounded-full bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div>
                <p className="text-[11px] font-bold text-gray-400">Step 3 of 3</p>
                <h1 className="text-base font-black text-gray-900">Payments</h1>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> 100% Secure
            </span>
          </header>

          <main className="p-4 space-y-3 max-w-lg mx-auto">
            {/* Total Amount Header Card */}
            <div className="flex items-center justify-between rounded-2xl bg-blue-50/60 border border-blue-100 p-4">
              <div>
                <span className="text-xs font-bold text-gray-500">Total Amount</span>
                <p className="text-xl font-black text-blue-950">₹{payable}</p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800">
                {lines.length} Items
              </span>
            </div>

            {err && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600 border border-red-200">
                {err}
              </div>
            )}

            {/* 1. UPI ACCORDION */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedAccordion("upi")}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100/70 text-lg">⚡</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-gray-900">UPI</h4>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Instant</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Pay by any UPI app (PhonePe, GPay, Paytm)</p>
                  </div>
                </div>
                {selectedAccordion === "upi" ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>

              {selectedAccordion === "upi" && (
                <div className="border-t border-gray-100 bg-gray-50/70 p-4 space-y-3">
                  <div className="space-y-2">
                    {/* PhonePe Option with Logo styling */}
                    <label 
                      onClick={() => setSelectedUpiApp("phonepe")} 
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-[#5f259f] flex items-center justify-center text-white text-[10px] font-black">
                          पे
                        </div>
                        <span className="text-xs font-bold text-gray-800">PhonePe UPI</span>
                      </div>
                      <input 
                        type="radio" 
                        name="upi_method" 
                        checked={selectedUpiApp === "phonepe"} 
                        onChange={() => setSelectedUpiApp("phonepe")} 
                        className="accent-[#FF6600]"
                      />
                    </label>

                    {/* Google Pay Option */}
                    <label 
                      onClick={() => setSelectedUpiApp("gpay")} 
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-blue-600">
                          G
                        </div>
                        <span className="text-xs font-bold text-gray-800">Google Pay</span>
                      </div>
                      <input 
                        type="radio" 
                        name="upi_method" 
                        checked={selectedUpiApp === "gpay"} 
                        onChange={() => setSelectedUpiApp("gpay")} 
                        className="accent-[#FF6600]"
                      />
                    </label>

                    {/* Paytm Option */}
                    <label 
                      onClick={() => setSelectedUpiApp("paytm")} 
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-[#002e6e] flex items-center justify-center text-white text-[9px] font-black">
                          Pay
                        </div>
                        <span className="text-xs font-bold text-gray-800">Paytm UPI</span>
                      </div>
                      <input 
                        type="radio" 
                        name="upi_method" 
                        checked={selectedUpiApp === "paytm"} 
                        onChange={() => setSelectedUpiApp("paytm")} 
                        className="accent-[#FF6600]"
                      />
                    </label>

                    {/* WhatsApp Pay */}
                    <label 
                      onClick={() => setSelectedUpiApp("whatsapp")} 
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[10px] font-bold">
                          💬
                        </div>
                        <span className="text-xs font-bold text-gray-800">WhatsApp Payment</span>
                      </div>
                      <input 
                        type="radio" 
                        name="upi_method" 
                        checked={selectedUpiApp === "whatsapp"} 
                        onChange={() => setSelectedUpiApp("whatsapp")} 
                        className="accent-[#FF6600]"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinalPlaceOrder}
                    disabled={busy}
                    className="w-full rounded-xl bg-[#FFC200] py-3.5 text-xs font-black text-black shadow-sm active:scale-95 transition-all"
                  >
                    {busy ? "Connecting UPI..." : `Pay ₹${payable}`}
                  </button>
                </div>
              )}
            </div>

            {/* 2. CREDIT / DEBIT / ATM CARD ACCORDION */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedAccordion("card")}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Credit / Debit / ATM Card</h4>
                    <p className="text-[10px] text-gray-500">Visa, MasterCard, RuPay</p>
                  </div>
                </div>
                {selectedAccordion === "card" ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>

              {selectedAccordion === "card" && (
                <div className="border-t border-gray-100 bg-gray-50/70 p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">Card Number</label>
                    <input
                      type="text"
                      placeholder="XXXX XXXX XXXX XXXX"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs outline-none focus:border-[#FF6600]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500">Valid Thru</label>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        maxLength={5}
                        value={validThru}
                        onChange={(e) => setValidThru(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs outline-none focus:border-[#FF6600]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500">CVV</label>
                      <input
                        type="password"
                        placeholder="CVV"
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs outline-none focus:border-[#FF6600]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleFinalPlaceOrder}
                    disabled={busy}
                    className="w-full rounded-xl bg-[#FFC200] py-3.5 text-xs font-black text-black shadow-sm active:scale-95 transition-all"
                  >
                    {busy ? "Processing..." : `Pay ₹${payable}`}
                  </button>
                </div>
              )}
            </div>

            {/* 3. CASH ON DELIVERY ACCORDION (FULLY FUNCTIONAL) */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedAccordion("cod")}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Banknote className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Cash on Delivery (COD)</h4>
                    <p className="text-[10px] text-gray-500">Pay cash when food is delivered</p>
                  </div>
                </div>
                {selectedAccordion === "cod" ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>

              {selectedAccordion === "cod" && (
                <div className="border-t border-gray-100 bg-gray-50/70 p-4 space-y-3">
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Street food delivered fresh to your doorstep. Keep cash ready for payment!
                  </p>
                  <button
                    type="button"
                    onClick={handleFinalPlaceOrder}
                    disabled={busy}
                    className="w-full rounded-xl bg-[#FFC200] py-3.5 text-xs font-black text-black shadow-sm active:scale-95 transition-all"
                  >
                    {busy ? "Placing Order..." : "Place Order"}
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* MATCHING FULL SCREEN ORANGE ORDER SUCCESSFUL DIALOG */}
      {placementStage === "placing" && (
        <div className="fixed inset-0 z-[150] flex flex-col bg-white overflow-y-auto">
          <div className="flex items-center px-4 py-4 border-b border-gray-100">
            <button
              onClick={() => {
                cart.clear();
                void navigate({ to: "/" });
              }}
              className="flex items-center gap-1.5 text-sm font-black text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" /> Order details
            </button>
          </div>

          <div className="flex flex-col items-center px-6 pt-6 pb-10">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#FF6600] bg-orange-50 text-[#FF6600]">
              <Check className="h-10 w-10" strokeWidth={3} />
            </div>

            <h2 className="mt-4 text-2xl font-black text-gray-900">Order Successful</h2>
            <p className="mt-1 text-xs text-gray-400 italic">"Hot & fresh street food on its way"</p>
            <span className="mt-2 text-xs font-bold text-[#FF6600]">
              order ID: #{createdOrderId ? createdOrderId.slice(-7) : Date.now().toString().slice(-7)}
            </span>

            <div className="mt-6 w-full max-w-sm rounded-2xl bg-gray-50 p-4 border border-gray-100">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-sm font-black text-gray-900">Order summary</h3>
                <span className="rounded-full bg-black px-3 py-1 text-[10px] font-bold text-white">
                  {selectedAccordion === "cod" ? "COD" : "Prepaid"}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Grand Total</span>
                  <span className="font-black text-gray-900">₹{payable}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  cart.clear();
                  void navigate({ to: "/" });
                }}
                className="mt-6 w-full rounded-full bg-[#FF6600] py-3.5 text-xs font-black text-white shadow-lg shadow-orange-500/25 active:scale-95 transition-all text-center"
              >
                Continue to shop
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
