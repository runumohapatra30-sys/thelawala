import { useEffect, useState } from "react";
import {
  BatteryFull,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  MapPin,
  PackageCheck,
  Pencil,
  ShieldCheck,
  Truck,
  Usb,
  Volume2,
  PanelsTopLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  readSoundboxProductSettings,
  type SoundboxProductSettings,
} from "@/lib/soundboxProductSettings";

type Vendor = {
  id: string;
  stall_name: string;
  address: string | null;
};

type HardwareOrder = {
  id: string;
  payment_plan: string;
  total_amount: number;
  delivery_address: string;
  status: string;
  created_at: string;
};

const GALLERY = [
  { key: "front_image_url", label: "Front view" },
  { key: "back_image_url", label: "Back view" },
  { key: "packaging_image_url", label: "Packaging" },
] as const;

const FEATURES = [
  {
    Icon: Volume2,
    title: "Instant Order Chime",
    text: "Loud voice alerts for incoming orders and transactions.",
  },
  {
    Icon: BatteryFull,
    title: "All-Day Battery Backup",
    text: "Built-in rechargeable battery, ready for a full day.",
  },
  {
    Icon: Usb,
    title: "Type-C Fast Charging",
    text: "Standard DC 5V port; use a regular phone charger.",
  },
  {
    Icon: ShieldCheck,
    title: "Compact & Rugged Body",
    text: "Pocket-sized and durable for busy street carts.",
  },
  {
    Icon: PanelsTopLeft,
    title: "Wall-Mount & Table-Stand Ready",
    text: "Silicone feet and a rear hook slot for flexible placement.",
  },
];

const PACK_ITEMS = [
  "1 × Thelawala Smart Soundbox",
  "1 × Type-C USB Charging Cable",
  "1 × Quick Start User Manual",
  "1 × Merchant Partner Gift Voucher Pack",
];

const CHARGES = [
  "No Return Charges",
  "No Change Charges",
  "No Exchange Charges",
  "No Upgrade Charges",
];

const ORDER_STATUS: Record<string, string> = {
  REQUESTED: "Request received",
  CONFIRMED: "Confirmed",
  DISPATCHED: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function money(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function VendorSoundbox({ vendor }: { vendor: Vendor }) {
  const [product, setProduct] = useState<SoundboxProductSettings | null>(null);
  const [orders, setOrders] = useState<HardwareOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [plan, setPlan] = useState<"ONE_TIME" | "SPLIT_PAY">("ONE_TIME");
  const [address, setAddress] = useState(vendor.address?.trim() ?? "");
  const [draftAddress, setDraftAddress] = useState(vendor.address?.trim() ?? "");
  const [editingAddress, setEditingAddress] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [settingsResult, { data: orderRows, error: orderError }] = await Promise.all([
        readSoundboxProductSettings()
          .then((data) => ({ data, error: null }))
          .catch((error: Error) => ({
            data: null,
            error,
          })),
        supabase
          .from("soundbox_hardware_orders")
          .select("id,payment_plan,total_amount,delivery_address,status,created_at")
          .eq("vendor_id", vendor.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      const { data: settings, error: settingsError } = settingsResult;
      if (!alive) return;
      if (settingsError)
        toast.error(`Could not load Soundbox product details: ${settingsError.message}`);
      if (orderError) toast.error(`Could not load Soundbox orders: ${orderError.message}`);
      setProduct(settings);
      setOrders(orderRows ?? []);
      setLoading(false);
    };
    void load();

    const channel = supabase
      .channel(`vendor-soundbox-${vendor.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "soundbox_hardware_orders",
          filter: `vendor_id=eq.${vendor.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [vendor.id]);

  const gallery = GALLERY.map((item) => ({
    ...item,
    url: product?.[item.key] ?? null,
  }));
  const currentImage = gallery[selectedImage] ?? gallery[0]!;
  const total = plan === "ONE_TIME" ? 499 : 490;

  async function placeOrder() {
    const deliveryAddress = address.trim();
    if (!deliveryAddress) {
      toast.error("Add a delivery address before placing your order.");
      setEditingAddress(true);
      setDraftAddress(address);
      return;
    }
    if (!product?.is_in_stock) {
      toast.error("The Soundbox is currently out of stock.");
      return;
    }
    setPlacingOrder(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setPlacingOrder(false);
      toast.error(authError?.message ?? "Sign in again to place your order.");
      return;
    }
    const { data, error } = await supabase
      .from("soundbox_hardware_orders")
      .insert({
        vendor_id: vendor.id,
        owner_id: authData.user.id,
        payment_plan: plan,
        total_amount: total,
        delivery_address: deliveryAddress,
      })
      .select("id,payment_plan,total_amount,delivery_address,status,created_at")
      .single();
    setPlacingOrder(false);
    if (error) {
      toast.error(
        error.message.includes("row-level security")
          ? "This Soundbox is no longer available. Please refresh and try again."
          : `Could not place your order: ${error.message}`,
      );
      return;
    }
    setOrders((previous) => [data, ...previous].slice(0, 10));
    toast.success("Soundbox order request received. Our team will confirm it shortly.");
  }

  return (
    <div className="space-y-4 pb-5">
      <section className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-sm">
        <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-100 px-5 py-8">
          {currentImage?.url ? (
            <img
              src={currentImage.url}
              alt={`Thelawala Smart Soundbox — ${currentImage.label}`}
              className="h-56 w-full object-contain transition-opacity duration-300"
            />
          ) : (
            <div className="grid h-48 w-48 place-items-center rounded-[42px] border border-orange-100 bg-white text-[#FF5200] shadow-[0_22px_50px_-30px_rgba(255,82,0,0.7)]">
              <Volume2 className="h-20 w-20" strokeWidth={1.4} />
            </div>
          )}
          <span
            className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black shadow-sm ${product?.is_in_stock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${product?.is_in_stock ? "bg-emerald-500" : "bg-red-500"}`}
            />
            {product?.is_in_stock ? "In Stock" : "Out of Stock"}
          </span>
          <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
            {currentImage?.label}
          </div>
          <button
            type="button"
            aria-label="Previous Soundbox photo"
            onClick={() =>
              setSelectedImage((index) => (index + gallery.length - 1) % gallery.length)
            }
            className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next Soundbox photo"
            onClick={() => setSelectedImage((index) => (index + 1) % gallery.length)}
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
          {gallery.map((image, index) => (
            <button
              key={image.key}
              type="button"
              onClick={() => setSelectedImage(index)}
              className={`rounded-xl border p-1.5 text-left transition-colors ${selectedImage === index ? "border-[#FF5200] bg-orange-50" : "border-slate-100 bg-slate-50"}`}
            >
              <div className="grid h-12 place-items-center overflow-hidden rounded-lg bg-white">
                {image.url ? (
                  <img src={image.url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Volume2 className="h-5 w-5 text-orange-300" />
                )}
              </div>
              <span className="mt-1 block truncate text-center text-[10px] font-bold text-slate-600">
                {image.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF5200]">
          Made for your stall
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Thelawala Smart Soundbox
        </h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
          Real-Time Audio Order Alerts &amp; Payment Confirmation Device
        </p>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Never miss an order again, even during the busiest rush hours! The moment a customer
          places an order on Thelawala Express, this portable soundbox triggers an instant, loud
          audio chime and announcement. No Wi-Fi setup needed—simply turn it on and start receiving
          orders directly at your food cart or stall.
        </p>
      </section>

      <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-base font-black text-slate-900">Small device. Big peace of mind.</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-[#FF5200]">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-xs font-black text-slate-800">{title}</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                  {text}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] border border-orange-100 bg-orange-50/70 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-black text-slate-900">Choose your payment plan</p>
            <p className="mt-1 text-xs text-slate-500">
              Daily service rental: <strong className="text-[#FF5200]">Only ₹6 / Day</strong>
            </p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#FF5200]">
            FLEXIBLE
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            role="radio"
            aria-checked={plan === "ONE_TIME"}
            onClick={() => setPlan("ONE_TIME")}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${plan === "ONE_TIME" ? "border-[#FF5200] bg-white shadow-sm" : "border-white bg-white/60"}`}
          >
            <span className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">One-Time Purchase</span>
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border ${plan === "ONE_TIME" ? "border-[#FF5200] bg-[#FF5200] text-white" : "border-slate-300"}`}
              >
                {plan === "ONE_TIME" ? <Check className="h-3 w-3" /> : null}
              </span>
            </span>
            <span className="mt-3 block text-3xl font-black text-slate-900">₹499</span>
            <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
              Flat full payment
            </span>
            <span className="mt-3 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-[#FF5200]">
              Daily Service Rental: Only ₹6 / Day
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={plan === "SPLIT_PAY"}
            onClick={() => setPlan("SPLIT_PAY")}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${plan === "SPLIT_PAY" ? "border-[#FF5200] bg-white shadow-sm" : "border-white bg-white/60"}`}
          >
            <span className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">Split Pay EMI</span>
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border ${plan === "SPLIT_PAY" ? "border-[#FF5200] bg-[#FF5200] text-white" : "border-slate-300"}`}
              >
                {plan === "SPLIT_PAY" ? <Check className="h-3 w-3" /> : null}
              </span>
            </span>
            <span className="mt-3 block text-3xl font-black text-slate-900">
              ₹49 <small className="text-sm font-bold text-slate-500">× 10 days</small>
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-slate-500">Total: ₹490</span>
            <span className="mt-3 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-[#FF5200]">
              Daily Service Rental: Only ₹6 / Day
            </span>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHARGES.map((charge) => (
            <span
              key={charge}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-700"
            >
              <Check className="h-3 w-3" />
              {charge}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-[#FF5200]">
            <PackageCheck className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-black text-slate-900">What’s in the pack</h3>
            <p className="text-[11px] text-slate-500">Everything you need to get started</p>
          </div>
        </div>
        <ul className="mt-4 space-y-3">
          {PACK_ITEMS.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2.5 text-sm font-semibold text-slate-700"
            >
              <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
          <Truck className="h-4 w-4 shrink-0 text-[#FF5200]" />
          <span>
            <strong>Doorstep tech assistance.</strong> A dedicated field support agent will help at
            your stall with hardware issues or replacements.
          </span>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#FF5200]" />
            <h3 className="text-sm font-black text-slate-900">Delivery address</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraftAddress(address);
              setEditingAddress((value) => !value);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-black text-[#FF5200]"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editingAddress ? "Close" : "Edit"}
          </button>
        </div>
        <p className="mt-2 text-sm font-bold text-slate-800">{vendor.stall_name}</p>
        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-500">
          {address || "Add your stall delivery address."}
        </p>
        {editingAddress ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={draftAddress}
              onChange={(event) => setDraftAddress(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Enter your full stall address"
              className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF5200]"
            />
            <button
              type="button"
              onClick={() => {
                const value = draftAddress.trim();
                if (!value) {
                  toast.error("Enter a delivery address.");
                  return;
                }
                setAddress(value);
                setEditingAddress(false);
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
            >
              Use this address
            </button>
          </div>
        ) : null}
      </section>

      <button
        type="button"
        disabled={loading || placingOrder || !product?.is_in_stock}
        onClick={() => void placeOrder()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5200] px-5 py-4 text-sm font-black text-white shadow-[0_14px_30px_-14px_rgba(255,82,0,0.8)] transition hover:bg-[#e94b00] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {placingOrder
          ? "Placing your request…"
          : product?.is_in_stock
            ? `Order Soundbox Now · ${money(total)}`
            : "Currently out of stock"}
      </button>
      <p className="text-center text-[10px] leading-relaxed text-slate-500">
        This submits your order request; payment is not collected on this screen. Our team will
        confirm the plan and delivery details with you.
      </p>

      {orders.length ? (
        <section className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-black text-slate-900">Your Soundbox orders</h3>
          <div className="mt-3 space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800">
                    {ORDER_STATUS[order.status] ?? order.status}
                  </span>
                  <span className="text-sm font-black text-[#FF5200]">
                    {money(Number(order.total_amount))}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  {order.payment_plan === "ONE_TIME" ? "One-time purchase" : "Split Pay · 10 days"}{" "}
                  · {new Date(order.created_at).toLocaleDateString("en-IN")}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">
                  {order.delivery_address}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
