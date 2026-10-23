import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building2,
  Banknote,
  Clock4,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { processSeamlessPayment } from "@/lib/checkout";

interface ThelaWalaPaymentScreenProps {
  totalAmount: number;
  paymentSessionId: string;
  onSuccess: (details: any) => void;
  onCancel?: () => void;
  isProduction?: boolean;
}

interface AccordionSectionProps {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  emoji: string;
  activeId: string;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

// ଲିକ୍ୱିଡ୍ ଗ୍ଲାସ୍ (Liquid Frosted Glass) Accordion Item
function AccordionItem({
  id,
  title,
  subtitle,
  badge,
  emoji,
  activeId,
  onToggle,
  children,
}: AccordionSectionProps) {
  const isOpen = activeId === id;

  return (
    <div className="mb-3.5 overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl transition-all duration-300">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/40 active:scale-[0.99]"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/15 to-transparent text-xl shadow-inner">
            {emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
              {badge && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-gray-500 leading-tight mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="rounded-full bg-white/70 p-1.5 shadow-sm text-gray-500">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-white/50 bg-white/50 p-4 transition-all animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export function ThelaWalaPaymentScreen({
  totalAmount = 250,
  paymentSessionId,
  onSuccess,
  onCancel,
  isProduction = false,
}: ThelaWalaPaymentScreenProps) {
  const [activeTab, setActiveTab] = useState<string>("upi");
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null);

  // Form states
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [selectedBank, setSelectedBank] = useState("");

  const handleAccordionToggle = (id: string) => {
    setActiveTab(activeTab === id ? "" : id);
  };

  // କ୍ୟାଶ୍‌ଫ୍ରି ସିମ୍‌ଲେସ୍ କଲ୍
  const handlePayment = async (methodType: string, payload: any = {}) => {
    try {
      setLoadingMethod(methodType);
      toast.loading("Payment initialize heuchhi...");

      let res;
      if (methodType === "upi_app") {
        res = await processSeamlessPayment({
          paymentSessionId,
          upiApp: payload.app,
          isProduction,
        });
      } else if (methodType === "upi_id") {
        if (!upiId || !upiId.includes("@")) {
          toast.dismiss();
          toast.error("Dayakari valid UPI ID enter karantu");
          setLoadingMethod(null);
          return;
        }
        res = await processSeamlessPayment({
          paymentSessionId,
          upiId: upiId.trim(),
          isProduction,
        });
      } else if (methodType === "cod") {
        toast.dismiss();
        toast.success("Cash on Delivery Order Confirmed!");
        onSuccess({ method: "cod", status: "SUCCESS" });
        setLoadingMethod(null);
        return;
      } else {
        // Fallback standard modal for cards/netbanking if direct api needs modal
        res = await processSeamlessPayment({
          paymentSessionId,
          isProduction,
        });
      }

      toast.dismiss();
      toast.success("Payment Successful!");
      onSuccess(res);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Payment process re samasya hela");
    } finally {
      setLoadingMethod(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-orange-50/50 via-amber-50/20 to-slate-100/70 p-4 pb-28 font-sans">
      {/* Top Header */}
      <div className="mb-4 flex items-center justify-between pt-1">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-orange-600">
            Step 3 of 3 • Final Step
          </span>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Select Payment
          </h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50/80 px-3 py-1 shadow-xs backdrop-blur-md">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span className="text-[11px] font-bold text-emerald-800">100% Secure</span>
        </div>
      </div>

      {/* Liquid Glass Price Summary Card */}
      <div className="relative mb-5 overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white/90 via-white/60 to-white/30 p-5 shadow-[0_10px_30px_rgba(255,102,0,0.06)] backdrop-blur-2xl">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-400/10 blur-xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              Total Amount to Pay
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black text-gray-900 tracking-tight">
                ₹{totalAmount}
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                (All taxes & fees incl.)
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-600">
              <Sparkles size={12} /> ThelaWala
            </span>
          </div>
        </div>
      </div>

      {/* 1. UPI Section */}
      <AccordionItem
        id="upi"
        title="UPI (Direct In-App)"
        subtitle="Google Pay, PhonePe, Paytm, BHIM"
        badge="Instant"
        emoji="⚡"
        activeId={activeTab}
        onToggle={handleAccordionToggle}
      >
        <div className="space-y-4">
          <p className="text-[11px] font-medium text-gray-500">
            Select your preferred UPI app to pay directly:
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              disabled={loadingMethod !== null}
              onClick={() => handlePayment("upi_app", { app: "gpay" })}
              className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white/90 p-3 shadow-xs hover:border-orange-500 hover:shadow-sm active:scale-95 transition-all"
            >
              <span className="text-xl mb-1">🟢</span>
              <span className="text-xs font-bold text-gray-800">GPay</span>
            </button>

            <button
              type="button"
              disabled={loadingMethod !== null}
              onClick={() => handlePayment("upi_app", { app: "phonepe" })}
              className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white/90 p-3 shadow-xs hover:border-orange-500 hover:shadow-sm active:scale-95 transition-all"
            >
              <span className="text-xl mb-1">🟣</span>
              <span className="text-xs font-bold text-gray-800">PhonePe</span>
            </button>

            <button
              type="button"
              disabled={loadingMethod !== null}
              onClick={() => handlePayment("upi_app", { app: "paytm" })}
              className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white/90 p-3 shadow-xs hover:border-orange-500 hover:shadow-sm active:scale-95 transition-all"
            >
              <span className="text-xl mb-1">🔵</span>
              <span className="text-xs font-bold text-gray-800">Paytm</span>
            </button>
          </div>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-gray-200/80"></div>
            <span className="mx-3 text-[10px] font-semibold text-gray-400 uppercase">
              OR Pay via UPI ID
            </span>
            <div className="flex-grow border-t border-gray-200/80"></div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter UPI ID (e.g. mobile@upi)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white/90 px-3.5 py-2.5 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-inner"
            />
            <button
              type="button"
              disabled={loadingMethod !== null}
              onClick={() => handlePayment("upi_id")}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 active:scale-[0.99] transition-all hover:brightness-105"
            >
              Verify & Pay ₹{totalAmount}
            </button>
          </div>
        </div>
      </AccordionItem>

      {/* 2. QR Code Section */}
      <AccordionItem
        id="qr"
        title="Scan & Pay (QR Code)"
        subtitle="Scan with any UPI scanner app"
        badge="Zero Fee"
        emoji="📷"
        activeId={activeTab}
        onToggle={handleAccordionToggle}
      >
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-white/90 p-3 shadow-sm backdrop-blur-md">
            <div className="text-center">
              <QrCode size={56} className="mx-auto text-orange-500/80 mb-2" />
              <p className="text-[11px] font-bold text-gray-700">Dynamic QR Ready</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Auto-detected upon scan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handlePayment("standard_flow")}
            className="mt-3.5 w-full rounded-xl border border-orange-500/30 bg-orange-500/10 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-500/15"
          >
            Open Fullscreen QR 🔍
          </button>
        </div>
      </AccordionItem>

      {/* 3. Cards Section */}
      <AccordionItem
        id="card"
        title="Credit / Debit / ATM Card"
        subtitle="Visa, Mastercard, RuPay, Maestro"
        badge="RBI Compliant"
        emoji="💳"
        activeId={activeTab}
        onToggle={handleAccordionToggle}
      >
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              Card Number
            </label>
            <input
              type="text"
              maxLength={19}
              placeholder="XXXX XXXX XXXX XXXX"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                Valid Thru
              </label>
              <input
                type="text"
                placeholder="MM / YY"
                maxLength={5}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                CVV
              </label>
              <input
                type="password"
                placeholder="CVV"
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={loadingMethod !== null}
            onClick={() => handlePayment("standard_flow")}
            className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-md hover:bg-orange-600 active:scale-[0.99] transition-all"
          >
            Pay ₹{totalAmount} via Card
          </button>
        </div>
      </AccordionItem>

      {/* 4. Net Banking */}
      <AccordionItem
        id="netbanking"
        title="Net Banking"
        subtitle="All Indian Banks Supported"
        emoji="🏛️"
        activeId={activeTab}
        onToggle={handleAccordionToggle}
      >
        <div className="space-y-3">
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white/90 px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:border-orange-500 focus:outline-none"
          >
            <option value="">-- Choose your Bank --</option>
            <option value="SBI">State Bank of India (SBI)</option>
            <option value="HDFC">HDFC Bank</option>
            <option value="ICICI">ICICI Bank</option>
            <option value="AXIS">Axis Bank</option>
            <option value="PNB">Punjab National Bank</option>
          </select>
          <button
            type="button"
            disabled={!selectedBank || loadingMethod !== null}
            onClick={() => handlePayment("standard_flow")}
            className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-md disabled:bg-gray-300 transition-all"
          >
            Proceed to Secure NetBanking
          </button>
        </div>
      </AccordionItem>

      {/* 5. Pay Later */}
      <AccordionItem
        id="paylater"
        title="Pay Later"
        subtitle="Simpl, LazyPay, ICICI PayLater"
        badge="Credit"
        emoji="⏳"
        activeId={activeTab}
        onToggle={handleAccordionToggle}
      >
        <div className="rounded-xl bg-amber-50/70 p-3 text-center border border-amber-200/50">
          <p className="text-xs font-medium text-amber-900">
            Instant credit available on your registered mobile number.
          </p>
          <button
            type="button"
            onClick={() => handlePayment("standard_flow")}
            className="mt-3 w-full rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-xs"
          >
            Check PayLater Eligibility
          </button>
        </div>
      </AccordionItem>

      {/* 6. Cash on Delivery (COD) */}
      <AccordionItem
        id="cod"
        title="Cash on Delivery (COD)"
        subtitle="Pay via cash or UPI to delivery agent"
        emoji="💵"
        activeId={activeTab}
        onToggle={handleAccordionToggle}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-orange-500/10 p-3 text-orange-950">
            <Info size={16} className="shrink-0 text-orange-600 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Order confirmaton pare delivery agent ThelaWala pack nei pahanchanle apana cash ba QR scan kari deiparibe.
            </p>
          </div>
          <button
            type="button"
            disabled={loadingMethod !== null}
            onClick={() => handlePayment("cod")}
            className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition-all"
          >
            Confirm COD Order (₹{totalAmount})
          </button>
        </div>
      </AccordionItem>
    </div>
  );
}
