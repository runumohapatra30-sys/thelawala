import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { PayoutPanel } from "@/components/Payouts";
import { supabase } from "@/integrations/supabase/client";
import { offerToNearestPartner } from "@/lib/dispatch";
import { inr, STATUS_LABEL } from "@/lib/fees";
import { useSession } from "@/lib/session";
import { fssaiError, ifscError, normalizeFssai, panError, phoneError } from "@/lib/validation";
import { BBSR_ZONES, ID_PROOF_TYPES, uploadKycDoc } from "@/lib/kyc";
import { useLoudAlarm } from "@/lib/alarm";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vendor")({
  head: () => ({
    meta: [
      { title: "Stall partner portal — ThelaWala" },
      { name: "description", content: "Accept ThelaWala orders, mark food ready, share the pickup OTP and manage your stall menu and photos." },
      { property: "og:title", content: "Stall partner portal — ThelaWala" },
      { property: "og:description", content: "Run your street food stall on ThelaWala." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorPortal,
});

type Order = {
  id: string; code: string; status: string; grand_total: number; food_total: number;
  pickup_otp: string; qr_hash: string | null; customer_name: string; address_line: string; partner_id: string | null;
};
type Item = {
  id: string; name: string; price: number; mrp: number; in_stock: boolean;
  photo_url: string | null; food_type: string; category_id: string | null;
};
type Category = { id: string; name: string; emoji: string | null };

const EMPTY_DISH = {
  name: "",
  price: "",
  mrp: "",
  category_id: "",
  food_type: "VEG",
  details: "",
  unit: "1 plate",
};


function VendorPortal() {
  const { user, loading } = useSession();
  const [vendor, setVendor] = useState<{ id: string; stall_name: string; status: string; is_open: boolean; fssai_number: string | null } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({
    stall_name: "", owner_name: "", mobile: "", zone: "", address: "",
    fssai_number: "", pan: "", identity_proof_type: "Aadhaar", identity_number: "",
    bank_holder: "", bank_name: "", bank_account_no: "", bank_ifsc: "", upi_id: "",
  });
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [docs, setDocs] = useState<{ idDoc: File | null; fssaiCert: File | null; stallPhotos: File[]; bankProof: File | null }>({
    idDoc: null, fssaiCert: null, stallPhotos: [], bankProof: null,
  });
  const [terms, setTerms] = useState(false);
  const [regBusy, setRegBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fssaiDraft, setFssaiDraft] = useState("");
  const [fssaiMsg, setFssaiMsg] = useState<string | null>(null);
  const [fssaiSaving, setFssaiSaving] = useState(false);
  const [dish, setDish] = useState({ ...EMPTY_DISH });
  const [dishFile, setDishFile] = useState<File | null>(null);
  const [dishSaving, setDishSaving] = useState(false);
  const [dishOpen, setDishOpen] = useState(false);
  const [slip, setSlip] = useState<Order | null>(null);
  const [today, setToday] = useState({ orders: 0, sales: 0, rating: 0 });

  const newOrders = orders.filter((o) => o.status === "ORDER_PLACED");
  const pending = newOrders.length;
  const { muted, setMuted } = useLoudAlarm(pending > 0);

  useEffect(() => {
    if (!user) return;
    supabase.from("vendors").select("id,stall_name,status,is_open,fssai_number").eq("owner_id", user.id).maybeSingle()
      .then(({ data }) => setVendor(data));
    supabase.from("categories").select("id,name,emoji").order("sort_order").then(({ data }) => setCats(data ?? []));
  }, [user?.id]);

  const loadItems = (vendorId: string) =>
    supabase.from("menu_items").select("id,name,price,mrp,in_stock,photo_url,food_type,category_id").eq("vendor_id", vendorId)
      .then(({ data }) => setItems((data ?? []) as Item[]));

  useEffect(() => {
    if (!vendor) return;
    const load = () => {
      supabase.from("orders")
        .select("id,code,status,grand_total,food_total,pickup_otp,qr_hash,customer_name,address_line,partner_id")
        .eq("vendor_id", vendor.id).order("created_at", { ascending: false }).limit(30)
        .then(({ data }) => setOrders((data ?? []) as Order[]));
    };
    const loadToday = async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const [{ data: done }, { data: rates }] = await Promise.all([
        supabase.from("orders").select("food_total").eq("vendor_id", vendor.id).eq("status", "DELIVERED")
          .gte("delivered_at", since.toISOString()),
        supabase.from("order_ratings").select("food_stars").eq("vendor_id", vendor.id),
      ]);
      const stars = (rates ?? []).map((r) => Number(r.food_stars));
      setToday({
        orders: done?.length ?? 0,
        sales: (done ?? []).reduce((a, d) => a + Number(d.food_total), 0),
        rating: stars.length ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10 : 0,
      });
    };
    load();
    loadToday();
    loadItems(vendor.id);
    const t = setInterval(() => { load(); loadToday(); }, 8000);
    return () => clearInterval(t);
  }, [vendor?.id]);

  async function setStatus(o: Order, status: string) {
    let patch: Record<string, unknown> = { status };
    if (status === "PREPARING") {
      const { data: v } = await supabase.from("vendors").select("default_prep_minutes").eq("id", vendor?.id ?? "").maybeSingle();
      const mins = Number(v?.default_prep_minutes ?? 10);
      patch = {
        status,
        accepted_at: new Date().toISOString(),
        prep_minutes: mins,
        ready_at: new Date(Date.now() + mins * 60000).toISOString(),
      };
    }
    const { error } = await supabase.from("orders").update(patch).eq("id", o.id);
    if (error) {
      toast.error("Could not update this order. Please try again.");
      return;
    }
    if (status === "READY_FOR_PICKUP") await offerToNearestPartner(o.id);
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status } : x)));
  }

  async function addDish(): Promise<void> {
    if (!vendor) return;
    const price = Number(dish.price);
    if (!dish.name.trim() || !price) {
      toast.error("Add a dish name and price.");
      return;
    }
    setDishSaving(true);
    try {
      const photoUrl = dishFile ? await uploadDishPhoto(vendor.id, dishFile) : null;
      const { error } = await supabase.from("menu_items").insert({
        vendor_id: vendor.id,
        name: dish.name.trim(),
        price,
        mrp: Number(dish.mrp) || price,
        category_id: dish.category_id || null,
        food_type: dish.food_type,
        details: dish.details.trim() || null,
        unit: dish.unit.trim() || null,
        photo_url: photoUrl,
        in_stock: true,
      });
      if (error) throw error;
      setDish({ ...EMPTY_DISH });
      setDishFile(null);
      setDishOpen(false);
      await loadItems(vendor.id);
      toast.success("Dish added to your menu!");
    } catch {
      toast.error("Could not add the dish. Please try again.");
    } finally {
      setDishSaving(false);
    }
  }

  if (loading) return <Shell><PortalHeader title="Stall partner" /></Shell>;

  if (!user) {
    return (
      <Shell>
        <PortalHeader title="Stall partner" />
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Sign in to manage your stall.</p>
          <Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Sign in</Link>
        </div>
      </Shell>
    );
  }

  if (!vendor) {
    const inputCls = "w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary";
    const badCls = "w-full rounded-xl border border-destructive px-3 py-2.5 text-sm outline-none";
    const field = (k: keyof typeof form, label: string, err?: string | null, placeholder?: string) => (
      <label key={k} className="block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
        <input
          value={form[k]}
          placeholder={placeholder}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          className={err ? badCls : inputCls}
        />
        {err ? <span className="mt-1 block text-[11px] font-semibold text-destructive">{err}</span> : null}
      </label>
    );
    const fileRow = (label: string, file: File | null, onPick: (f: File | null) => void, accept = "image/*") => (
      <label className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="max-w-[55%] truncate text-xs font-bold text-primary">{file ? file.name : "Choose file"}</span>
        <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      </label>
    );
    const fssaiBad = form.fssai_number ? fssaiError(form.fssai_number) : null;
    const panBad = form.pan ? panError(form.pan) : null;
    const mobileBad = form.mobile ? phoneError(form.mobile) : null;
    const ifscBad = form.bank_ifsc ? ifscError(form.bank_ifsc) : null;

    async function submitRegistration() {
      if (!form.stall_name.trim() || !form.owner_name.trim()) return setMsg("Add your stall name and owner name.");
      if (!form.zone) return setMsg("Pick your delivery zone.");
      if (phoneError(form.mobile)) return setMsg(phoneError(form.mobile));
      if (fssaiError(form.fssai_number)) return setMsg(fssaiError(form.fssai_number));
      if (panError(form.pan)) return setMsg(panError(form.pan));
      if (!form.identity_number.trim()) return setMsg("Add your identity proof number.");
      if (!form.address.trim()) return setMsg("Add your stall address.");
      if (!docs.idDoc) return setMsg("Upload your identity proof document.");
      if (!docs.fssaiCert) return setMsg("Upload your FSSAI certificate.");
      if (docs.stallPhotos.length === 0) return setMsg("Add at least one stall photo.");
      if (!form.bank_holder.trim() || !form.bank_account_no.trim()) return setMsg("Add the account holder name and account number.");
      if (ifscError(form.bank_ifsc)) return setMsg(ifscError(form.bank_ifsc));
      if (!docs.bankProof) return setMsg("Upload a bank proof (passbook or cancelled cheque).");
      if (!terms) return setMsg("Please accept the partner terms to continue.");
      setRegBusy(true);
      setMsg(null);
      try {
        const [idUrl, certUrl, bankUrl, stallUrls] = await Promise.all([
          uploadKycDoc(user!.id, docs.idDoc!, "id-proof"),
          uploadKycDoc(user!.id, docs.fssaiCert!, "fssai-certificate"),
          uploadKycDoc(user!.id, docs.bankProof!, "bank-proof"),
          Promise.all(docs.stallPhotos.map((f) => uploadKycDoc(user!.id, f, "stall-photo"))),
        ]);
        const pos = await new Promise<GeolocationPosition | null>((res) =>
          navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => res(p), () => res(null)) : res(null),
        );
        const { data, error } = await supabase.from("vendors").insert({
          stall_name: form.stall_name.trim(),
          owner_name: form.owner_name.trim(),
          mobile: form.mobile.trim(),
          address: form.address.trim(),
          zone: form.zone,
          owner_id: user!.id,
          lat: pos?.coords.latitude ?? 20.2961,
          lng: pos?.coords.longitude ?? 85.8245,
          fssai_number: form.fssai_number.trim(),
          pan_number: form.pan.trim(),
          identity_proof_type: form.identity_proof_type,
          identity_number: form.identity_number.trim(),
          id_document_url: idUrl,
          fssai_certificate_url: certUrl,
          cuisine_types: cuisines,
          stall_photos: stallUrls,
          bank_holder: form.bank_holder.trim(),
          bank_name: form.bank_name.trim() || null,
          bank_account_no: form.bank_account_no.trim(),
          bank_ifsc: form.bank_ifsc.trim().toUpperCase(),
          upi_id: form.upi_id.trim() || null,
          bank_proof_url: bankUrl,
          terms_accepted_at: new Date().toISOString(),
          status: "PENDING",
        }).select("id,stall_name,status,is_open,fssai_number").single();
        if (error) throw error;
        setVendor(data);
        toast.success("Stall application submitted! The admin team will review it within a day.");
      } catch (e: any) {
        const m = String(e?.message ?? "");
        toast.error(
          m.includes("fssai_format") ? "FSSAI number must be 14 digits starting with 1 or 2."
          : m.includes("duplicate") ? "You have already registered a stall."
          : m.includes("_check") ? "Some details are not accepted. Please check and try again."
          : "Could not submit right now. Please try again.",
        );
      } finally {
        setRegBusy(false);
      }
    }

    return (
      <Shell>
        <PortalHeader title="Register your stall" subtitle="Approval usually takes a day" />
        <div className="space-y-2 p-4 pb-40">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Stall details</p>
          {field("stall_name", "Stall name")}
          {field("owner_name", "Owner full name")}
          {field("mobile", "Mobile number", mobileBad, "+91…")}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Delivery zone</span>
            <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className={inputCls}>
              <option value="">Choose zone…</option>
              {BBSR_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </label>
          {field("address", "Stall address")}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Cuisine types</span>
            <div className="flex flex-wrap gap-1.5">
              {["Morning Tiffin", "Chaat & Snacks", "Sweets & Desserts", "Rolls & Wraps", "Beverages", "Meals"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCuisines((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold ${cuisines.includes(c) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">FSSAI licence number</span>
            <input
              value={form.fssai_number}
              inputMode="numeric"
              placeholder="14 digits, e.g. 22024001000891"
              onChange={(e) => setForm({ ...form, fssai_number: normalizeFssai(e.target.value) })}
              className={fssaiBad ? badCls : inputCls}
            />
            {fssaiBad ? <span className="mt-1 block text-[11px] font-semibold text-destructive">{fssaiBad}</span> : null}
          </label>
          {fileRow("FSSAI certificate (photo/PDF)", docs.fssaiCert, (f) => setDocs({ ...docs, fssaiCert: f }), "image/*,application/pdf")}
          <label className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground">Stall photos ({docs.stallPhotos.length} chosen)</span>
            <span className="text-xs font-bold text-primary">Add photos</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setDocs({ ...docs, stallPhotos: Array.from(e.target.files ?? []).slice(0, 5) })} />
          </label>

          <p className="pt-2 text-xs font-black uppercase tracking-wide text-muted-foreground">Owner identity</p>
          {field("pan", "PAN number", panBad, "ABCPS1234F")}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Identity proof type</span>
            <select value={form.identity_proof_type} onChange={(e) => setForm({ ...form, identity_proof_type: e.target.value })} className={inputCls}>
              {ID_PROOF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {field("identity_number", "Identity proof number")}
          {fileRow("Identity proof document", docs.idDoc, (f) => setDocs({ ...docs, idDoc: f }))}

          <p className="pt-2 text-xs font-black uppercase tracking-wide text-muted-foreground">Bank details for payouts</p>
          {field("bank_holder", "Account holder name")}
          {field("bank_name", "Bank name")}
          {field("bank_account_no", "Account number")}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">IFSC code</span>
            <input
              value={form.bank_ifsc}
              autoCapitalize="characters"
              placeholder="SBIN0001234"
              onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11) })}
              className={ifscBad ? badCls : inputCls}
            />
            {ifscBad ? <span className="mt-1 block text-[11px] font-semibold text-destructive">{ifscBad}</span> : null}
          </label>
          {field("upi_id", "UPI ID (optional)", null, "name@bank")}
          {fileRow("Bank proof (passbook / cancelled cheque)", docs.bankProof, (f) => setDocs({ ...docs, bankProof: f }))}

          <label className="flex items-start gap-2 rounded-xl border border-border p-3">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" />
            <span className="text-xs text-muted-foreground">
              I agree to ThelaWala&apos;s <Link to="/terms" className="font-bold text-primary">partner terms</Link> and confirm these details are correct.
            </span>
          </label>

          <button
            disabled={regBusy}
            onClick={submitRegistration}
            className="press w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {regBusy ? "Uploading documents…" : "Send for approval"}
          </button>
          {msg ? <p className="text-xs font-semibold text-destructive">{msg}</p> : null}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PortalHeader title={vendor.stall_name} subtitle={vendor.status === "APPROVED" ? "Live on ThelaWala" : "Waiting for approval"} />
      <div className="space-y-3 p-4">
        {pending > 0 ? (
          <div className="animate-pulse rounded-2xl bg-destructive px-3 py-2.5 text-center text-sm font-black text-destructive-foreground">
            🔔 {pending} new order{pending > 1 ? "s" : ""} waiting — accept or reject below
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <div className="card-soft border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Today&apos;s orders</p>
            <p className="text-sm font-black">{today.orders}</p>
          </div>
          <div className="card-soft border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Today&apos;s sales</p>
            <p className="text-sm font-black">{inr(Math.round(today.sales))}</p>
          </div>
          <div className="card-soft border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Food rating</p>
            <p className="text-sm font-black">{today.rating ? `${today.rating} ★` : "—"}</p>
          </div>
        </div>

        <PayoutPanel party="VENDOR" id={vendor.id} />

        <VendorHours vendorId={vendor.id} />


        <div className="card-soft border border-border p-3">
          <p className="text-sm font-bold">FSSAI licence</p>
          <p className="text-[11px] text-muted-foreground">Current: {vendor.fssai_number ?? "not added yet"}</p>
          <input
            value={fssaiDraft || vendor.fssai_number || ""}
            inputMode="numeric"
            placeholder="14 digits, e.g. 12345678901234"
            onChange={(e) => {
              setFssaiDraft(normalizeFssai(e.target.value));
              setFssaiMsg(null);
            }}
            className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
              fssaiDraft && fssaiError(fssaiDraft) ? "border-destructive" : "border-border focus:border-primary"
            }`}
          />
          {fssaiDraft && fssaiError(fssaiDraft) ? (
            <p className="mt-1 text-[11px] font-semibold text-destructive">{fssaiError(fssaiDraft)}</p>
          ) : null}
          <button
            disabled={fssaiSaving || !fssaiDraft || Boolean(fssaiError(fssaiDraft)) || fssaiDraft === vendor.fssai_number}
            onClick={async () => {
              const bad = fssaiError(fssaiDraft);
              if (bad) {
                setFssaiDraft("");
                return setFssaiMsg(bad);
              }
              setFssaiSaving(true);
              const { data, error } = await supabase
                .from("vendors")
                .update({ fssai_number: fssaiDraft.trim() })
                .eq("id", vendor.id)
                .select("id,stall_name,status,is_open,fssai_number")
                .single();
              setFssaiSaving(false);
              if (error || !data) {
                setFssaiDraft("");
                return setFssaiMsg("Could not save. Your earlier FSSAI number is unchanged and your stall stays online.");
              }
              setVendor(data);
              setFssaiDraft("");
              setFssaiMsg("FSSAI number updated.");
            }}
            className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {fssaiSaving ? "Saving…" : "Update FSSAI number"}
          </button>
          {fssaiMsg ? <p className="mt-2 text-xs font-semibold text-primary">{fssaiMsg}</p> : null}
        </div>


        {pending > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-destructive px-3 py-2 text-destructive-foreground">
              <p className="flex items-center gap-2 text-sm font-black">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                {pending} new order{pending > 1 ? "s" : ""} waiting
              </p>
              <button
                onClick={() => setMuted(!muted)}
                className="press rounded-full bg-white/20 px-3 py-1 text-[11px] font-black"
              >
                {muted ? "Unmute alarm" : "Mute alarm"}
              </button>
            </div>

            {newOrders.map((o) => (
              <div
                key={o.id}
                className="animate-scale-in overflow-hidden rounded-3xl border-2 border-primary bg-card shadow-[0_16px_40px_-18px_rgba(12,131,31,0.55)]"
              >
                <div className="flex items-center justify-between bg-primary px-4 py-2 text-primary-foreground">
                  <p className="text-xs font-black tracking-wide">NEW ORDER · #{o.code}</p>
                  <p className="text-sm font-black">{inr(Number(o.grand_total))}</p>
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-base font-black">{o.customer_name}</p>
                  <p className="text-xs leading-snug text-muted-foreground">{o.address_line}</p>
                  <div className="flex gap-2 pt-1">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold">Pickup OTP {o.pickup_otp}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_1.6fr] gap-2">
                    <button
                      onClick={() => setStatus(o, "CANCELLED")}
                      className="press rounded-2xl border-2 border-destructive py-3.5 text-sm font-black text-destructive"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setStatus(o, "PREPARING")}
                      className="press rounded-2xl bg-primary py-3.5 text-sm font-black text-primary-foreground shadow-lg"
                    >
                      Accept order
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <section className="space-y-2">
          <p className="text-sm font-bold">Live orders</p>
          {orders.length === 0 ? <p className="text-xs text-muted-foreground">No orders yet.</p> : null}
          {orders.filter((o) => o.status !== "ORDER_PLACED").map((o) => (
            <div key={o.id} className="card-soft border border-border p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">#{o.code}</p>
                  <p className="text-[11px] text-muted-foreground">{o.customer_name} · {o.address_line}</p>
                  <p className="mt-1 text-xs font-semibold text-primary">{STATUS_LABEL[o.status] ?? o.status}</p>
                  {o.delivery_instructions ? (
                    <p className="mt-1 text-[11px] font-semibold text-foreground">📝 {o.delivery_instructions}</p>
                  ) : null}
                  {o.status === "PREPARING" ? <span className="mt-1 inline-block"><PrepCountdown readyAt={o.ready_at} /></span> : null}
                </div>
                <p className="text-sm font-bold">{inr(Number(o.grand_total))}</p>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {o.status === "PREPARING" ? (
                  <button onClick={() => setStatus(o, "READY_FOR_PICKUP")} className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground">Ready for Pickup</button>
                ) : null}
                {o.status !== "CANCELLED" ? (
                  <button onClick={() => setSlip(o)} className="flex-1 rounded-xl border border-primary py-2 text-xs font-bold text-primary">
                    Print / View order slip
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </section>

        <section className="card-soft border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Your menu</p>
            <button
              onClick={() => setDishOpen(!dishOpen)}
              className="press rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground"
            >
              {dishOpen ? "Close" : "+ Add new dish"}
            </button>
          </div>

          {dishOpen ? (
            <div className="mt-3 space-y-2 rounded-2xl bg-muted p-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Item name</span>
                <input
                  value={dish.name}
                  onChange={(e) => setDish({ ...dish, name: e.target.value })}
                  placeholder="Dahi bara aloo dum"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Price (₹)</span>
                  <input
                    inputMode="numeric"
                    value={dish.price}
                    onChange={(e) => setDish({ ...dish, price: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Cut price (₹, optional)</span>
                  <input
                    inputMode="numeric"
                    value={dish.mrp}
                    onChange={(e) => setDish({ ...dish, mrp: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Category</span>
                <select
                  value={dish.category_id}
                  onChange={(e) => setDish({ ...dish, category_id: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
                >
                  <option value="">Choose a category</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Food type</span>
                <div className="flex gap-2">
                  {(["VEG", "NONVEG"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDish({ ...dish, food_type: t })}
                      className={`flex-1 rounded-xl border py-2 text-xs font-black ${
                        dish.food_type === t ? "border-primary text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      {t === "VEG" ? "🟢 Veg" : "🔴 Non-veg"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Serving size</span>
                <input
                  value={dish.unit}
                  onChange={(e) => setDish({ ...dish, unit: e.target.value })}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Description</span>
                <textarea
                  value={dish.details}
                  onChange={(e) => setDish({ ...dish, details: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Dish photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDishFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
                {dishFile ? (
                  <img src={URL.createObjectURL(dishFile)} alt="Selected dish" className="mt-2 h-24 w-24 rounded-xl object-cover" />
                ) : null}
              </label>
              <button
                disabled={dishSaving}
                onClick={addDish}
                className="press w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                {dishSaving ? "Saving…" : "Add dish to menu"}
              </button>
            </div>
          ) : null}

          {items.map((i) => (
            <div key={i.id} className="mt-2 flex items-center gap-3">
              <label className="relative shrink-0 cursor-pointer">
                <img
                  src={i.photo_url ?? "/food/food-tiffin.jpg"}
                  alt={i.name}
                  className="h-12 w-12 rounded-xl object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 rounded-b-xl bg-black/55 text-center text-[8px] font-bold text-white">
                  {i.photo_url ? "Change" : "Add photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f || !vendor) return;
                    try {
                      const url = await uploadDishPhoto(vendor.id, f);
                      const { error } = await supabase.from("menu_items").update({ photo_url: url }).eq("id", i.id);
                      if (error) throw error;
                      setItems((prev) => prev.map((x) => (x.id === i.id ? { ...x, photo_url: url } : x)));
                      toast.success("Photo updated. Customers can see it now.");
                    } catch {
                      toast.error("Could not upload that photo. Please try again.");
                    }
                  }}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  <span className={i.food_type === "NONVEG" ? "text-destructive" : "text-primary"}>■</span> {i.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{inr(Number(i.price))}</p>
              </div>
              <button
                onClick={async () => {
                  const next = !i.in_stock;
                  setItems(items.map((x) => (x.id === i.id ? { ...x, in_stock: next } : x)));
                  const { error } = await supabase.from("menu_items").update({ in_stock: next }).eq("id", i.id);
                  if (error) {
                    setItems(items);
                    toast.error("Could not change stock right now.");
                  }
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black ${
                  i.in_stock ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                }`}
              >
                {i.in_stock ? "In stock" : "Out of stock"}
              </button>
            </div>
          ))}
          {items.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No dishes added yet.</p> : null}
        </section>
      </div>

      {slip ? <OrderSlip order={slip} onClose={() => setSlip(null)} /> : null}
    </Shell>
  );
}

/** Uploads a dish photo and returns a long-lived link the customer app can show. */
async function uploadDishPhoto(vendorId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${vendorId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("dish-photos").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data: signed, error: signErr } = await supabase.storage
    .from("dish-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 3650);
  if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Photo link failed");
  return signed.signedUrl;
}

function OrderSlip({ order, onClose }: { order: Order; onClose: () => void }) {
  const [lines, setLines] = useState<{ id: string; name: string; qty: number }[]>([]);
  useEffect(() => {
    supabase.from("order_items").select("id,name,qty").eq("order_id", order.id).then(({ data }) => setLines(data ?? []));
  }, [order.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[360px] rounded-2xl bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-extrabold">Order slip #{order.code}</p>
            <p className="text-[11px] text-muted-foreground">{order.customer_name}</p>
          </div>
          <button onClick={onClose} className="text-sm font-bold text-muted-foreground">Close</button>
        </div>

        <div className="mt-3 space-y-1 border-y border-dashed border-border py-2">
          {lines.map((l) => (
            <p key={l.id} className="flex justify-between text-sm font-semibold">
              <span className="truncate">{l.name}</span>
              <span>× {l.qty}</span>
            </p>
          ))}
          {lines.length === 0 ? <p className="text-xs text-muted-foreground">Loading items…</p> : null}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Drop: {order.address_line}</p>

        <div className="mt-3 grid place-items-center rounded-xl bg-white p-3">
          <QRCodeSVG
            value={JSON.stringify({ order_id: order.id, qr_hash: order.qr_hash })}
            size={168}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
          Stick this on the parcel. The delivery partner scans it to pick up.
        </p>

        <button onClick={() => window.print()} className="press mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">
          Print slip
        </button>
      </div>
    </div>
  );
}
