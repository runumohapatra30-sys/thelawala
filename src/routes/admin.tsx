import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HandCoins, IndianRupee, Megaphone, ReceiptText, RotateCcw, SlidersHorizontal, Users } from "lucide-react";
import { PortalHeader, Shell } from "@/components/Shell";
import { SupportQueue } from "@/components/SupportQueue";
import { PayoutQueue, LiveOrders, CustomerManager } from "@/components/AdminPanels";
import { MarketingManager } from "@/components/MarketingManager";
import { PageStudio } from "@/components/PageStudio";
import { AdminReports } from "@/components/AdminReports";
import { SystemHealthCard } from "@/components/SystemHealthCard";
import { ThaliwalaLoader } from "@/components/ThaliwalaLoader";
import { AdminApprovals } from "@/components/AdminApprovals";
import { RevenueSplit } from "@/components/RevenueSplit";
import { CashRemittances } from "@/components/CashRemittances";
import { AdminOrdersSection } from "@/components/admin/AdminOrdersSection";
import { LiveDispatchBoard } from "@/components/admin/LiveDispatchBoard";
import { AdminSettlement } from "@/components/admin/AdminSettlement";
import { AdminRefunds } from "@/components/admin/AdminRefunds";
import { supabase } from "@/integrations/supabase/client";
import { listCoupons, type Coupon } from "@/lib/coupons";
import { inr, type Settings } from "@/lib/fees";
import { useIsAdmin, useSession } from "@/lib/session";
import { toast } from "sonner";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — ThelaWala" },
      { name: "description", content: "ThelaWala control room: delivery fee rules, extra charges, payment settings, stall and rider approvals, orders and earnings." },
      { property: "og:title", content: "Administration — ThelaWala" },
      { property: "og:description", content: "Fee rules, approvals, orders and platform earnings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type Tab = "orders" | "settle" | "refunds" | "money" | "people" | "market" | "settings";

const TABS: { key: Tab; label: string; Icon: typeof ReceiptText }[] = [
  { key: "orders", label: "Orders", Icon: ReceiptText },
  { key: "settle", label: "Settlement", Icon: HandCoins },
  { key: "refunds", label: "Refunds", Icon: RotateCcw },
  { key: "money", label: "Money", Icon: IndianRupee },
  { key: "people", label: "Verification Requests", Icon: Users },
  { key: "market", label: "Marketing", Icon: Megaphone },
  { key: "settings", label: "Settings", Icon: SlidersHorizontal },
];

function Admin() {
  const { user, loading } = useSession();
  const isAdmin = useIsAdmin(user?.id);
  const [s, setS] = useState<Settings | null>(null);
  const [closures, setClosures] = useState<{ id: string; amount: number; status: string }[]>([]);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("orders");
  const [studio, setStudio] = useState(false);

  const loadMoney = () => {
    supabase.from("wallet_closure_requests").select("id,amount,status").eq("status", "PENDING").then(({ data }) => setClosures(data ?? []));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadMoney();
    supabase.from("system_settings").select("*").maybeSingle().then(({ data }) => setS(data as Settings));
  }, [isAdmin]);

  if (loading) return <Shell><PortalHeader title="Administration" /><ThaliwalaLoader /></Shell>;

  if (!user || !isAdmin) {
    return (
      <Shell>
        <PortalHeader title="Administration" />
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">
            {user ? "This account does not have administrator access." : "Sign in with an administrator account."}
          </p>
          {!user ? (
            <Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Sign in</Link>
          ) : null}
        </div>
      </Shell>
    );
  }

  const num = (k: keyof Settings, label: string) =>
    s ? (
      <label key={k} className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>
        <input
          type="number"
          step="0.01"
          value={String(s[k] ?? "")}
          onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
    ) : null;

  const toggle = (k: keyof Settings, label: string) =>
    s ? (
      <button
        key={k}
        onClick={() => setS({ ...s, [k]: !s[k] })}
        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold ${s[k] ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
      >
        {label}<span>{s[k] ? "ON" : "OFF"}</span>
      </button>
    ) : null;

  return (
    <Shell>
      <PortalHeader title="Administration" subtitle="Orders, settlement, refunds and earnings" />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-4 gap-2">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-[10px] font-bold ${
                tab === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "orders" ? (
          <>
            <LiveDispatchBoard />
            <AdminOrdersSection />
            <LiveOrders />
          </>
        ) : null}

        {tab === "settle" ? (
          <>
            <AdminSettlement />
            <CashRemittances />
            <PayoutQueue />
          </>
        ) : null}

        {tab === "refunds" ? (
          <>
            <AdminRefunds />
            <section className="card-soft border border-border p-3">
              <p className="text-sm font-bold">Wallet closure requests</p>
              {closures.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">Nothing pending.</p> : null}
              {closures.map((c) => (
                <div key={c.id} className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Return {inr(Number(c.amount))}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { await supabase.rpc("decide_wallet_closure", { _request_id: c.id, _approve: true }); loadMoney(); }}
                      className="rounded-lg border border-primary px-3 py-1 text-xs font-bold text-primary"
                    >
                      Paid &amp; close
                    </button>
                    <button
                      onClick={async () => { await supabase.rpc("decide_wallet_closure", { _request_id: c.id, _approve: false }); loadMoney(); }}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-bold text-muted-foreground"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : null}

        {tab === "money" ? (
          <>
            <RevenueSplit />
            <AdminReports />
            <SystemHealthCard />
          </>
        ) : null}

        {tab === "people" ? (
          <>
            <AdminApprovals />
            <SupportQueue adminId={user.id} />
            <CustomerManager />
          </>
        ) : null}

        {tab === "market" ? (
          <>
            <button
              onClick={() => setStudio((v) => !v)}
              className="w-full rounded-xl border border-primary py-2.5 text-xs font-black text-primary"
            >
              {studio ? "← Back to banners & campaigns" : "Open Visual Page Studio"}
            </button>
            {studio ? <PageStudio /> : <MarketingManager />}
          </>
        ) : null}

        {tab === "settings" && s ? (
          <>
            <section className="card-soft space-y-2 border border-border p-3">
              <p className="text-sm font-bold">Delivery fee rule</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["FIXED", "Fixed"],
                  ["PER_KM", "Per km"],
                  ["SLAB", "Distance slabs"],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setS({ ...s, delivery_fee_mode: mode })}
                    className={`rounded-xl border px-2 py-2 text-[11px] font-black ${
                      (s.delivery_fee_mode ?? "PER_KM") === mode
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(s.delivery_fee_mode ?? "PER_KM") === "FIXED" ? (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    One flat delivery fee for every order, whatever the distance is.
                  </p>
                  {num("base_delivery_fee", "Flat delivery fee (₹)")}
                </>
              ) : null}

              {(s.delivery_fee_mode ?? "PER_KM") === "PER_KM" ? (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    The fixed fee covers the base distance, then the per-kilometre rate is added for every extra
                    kilometre.
                  </p>
                  {num("base_delivery_fee", "Fixed delivery fee (₹)")}
                  {num("base_delivery_distance_km", "Covered by the fixed fee (km)")}
                  {num("extra_fee_per_km", "Extra fee per km beyond that (₹)")}
                </>
              ) : null}

              {(s.delivery_fee_mode ?? "PER_KM") === "SLAB" ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Set one fee per distance band. Each row shows exactly how many kilometres it covers.
                  </p>
                  {slabsOf(s).map((row, i, all) => {
                    const from = i === 0 ? 0 : all[i - 1]!.upto_km;
                    const update = (patch: Partial<typeof row>) => {
                      const next = all.map((r, j) => (j === i ? { ...r, ...patch } : r));
                      setS({ ...s, delivery_fee_slabs: next as unknown as Settings["delivery_fee_slabs"] });
                    };
                    return (
                      <div key={i} className="rounded-xl border border-border p-2">
                        <p className="text-[11px] font-bold text-primary">
                          {from} – {row.upto_km} km · {inr(row.fee)}
                        </p>
                        <div className="mt-1 grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            step="0.5"
                            value={row.upto_km}
                            onChange={(e) => update({ upto_km: Number(e.target.value) })}
                            className="rounded-lg border border-border px-2 py-1.5 text-xs"
                            placeholder="Up to km"
                          />
                          <input
                            type="number"
                            value={row.fee}
                            onChange={(e) => update({ fee: Number(e.target.value) })}
                            className="rounded-lg border border-border px-2 py-1.5 text-xs"
                            placeholder="Fee ₹"
                          />
                          <button
                            onClick={() =>
                              setS({
                                ...s,
                                delivery_fee_slabs: all.filter((_, j) => j !== i) as unknown as Settings["delivery_fee_slabs"],
                              })
                            }
                            className="rounded-lg border border-border text-[11px] font-bold text-muted-foreground"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
                      const all = slabsOf(s);
                      const last = all[all.length - 1];
                      const next = [...all, { upto_km: (last?.upto_km ?? 0) + 2, fee: (last?.fee ?? 15) + 10 }];
                      setS({ ...s, delivery_fee_slabs: next as unknown as Settings["delivery_fee_slabs"] });
                    }}
                    className="w-full rounded-xl border border-primary py-2 text-xs font-black text-primary"
                  >
                    + Add a distance band
                  </button>
                </div>
              ) : null}

              {num("free_delivery_threshold", "Free delivery above order value (₹, blank = never)")}
            </section>

            <section className="card-soft space-y-2 border border-border p-3">
              <p className="text-sm font-bold">Extra charges</p>
              <div className="grid gap-2">
                {toggle("enable_platform_fee", "Platform fee")}
                {num("platform_fee", "Platform fee amount (₹)")}
                {toggle("enable_handling_fee", "Handling fee")}
                {num("handling_fee", "Handling fee amount (₹)")}
                {toggle("enable_packing_fee", "Packing fee")}
                {num("packing_fee", "Packing fee amount (₹)")}
                {toggle("enable_surge_fee", "Surge fee")}
                {num("surge_fee", "Surge fee amount (₹)")}
                {num("cancel_penalty_fee", "Cancellation fee (₹)")}
                {num("vendor_commission_pct", "Commission from stalls (%)")}
              </div>
            </section>

            <section className="card-soft space-y-2 border border-border p-3">
              <p className="text-sm font-bold">Payments &amp; login</p>
              <div className="grid gap-2">
                {toggle("enable_cod", "Cash on delivery")}
                {toggle("enable_online_payment", "Online payment")}
                {toggle("enable_google_login", "Google one-tap login")}
              </div>
              <div className="space-y-1 rounded-xl border border-border px-3 py-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Payment gateway (only one runs)</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["CASHFREE", "PAYU"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setS({ ...s, payment_gateway: g })}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                        s.payment_gateway === g ? "border-primary text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      {g === "CASHFREE" ? "Cashfree" : "PayU"}
                    </button>
                  ))}
                </div>
              </div>

              {num("wallet_min_topup", "Minimum wallet transaction (₹)")}
              {num("wallet_max_topup", "Maximum wallet transaction (₹)")}
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Support number</span>
                <input
                  value={s.support_number}
                  onChange={(e) => setS({ ...s, support_number: e.target.value })}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </section>

            <CashfreeKeys />
            <PayuKeys />

            <button
              onClick={async () => {
                const { error } = await supabase.from("system_settings").update(s).eq("id", true);
                setSaved(!error);
              }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              {saved ? "Settings saved" : "Save settings"}
            </button>

            <CouponManager />
          </>
        ) : null}
      </div>
    </Shell>
  );
}


function CouponManager() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [form, setForm] = useState({ code: "", description: "", discount_type: "FLAT", discount_value: "", min_order: "0" });
  const [busy, setBusy] = useState(false);

  const load = () => listCoupons().then(setRows);
  useEffect(() => { load(); }, []);

  async function create() {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discount_value);
    if (!/^[A-Z0-9]{4,15}$/.test(code)) { toast.error("Code must be 4-15 letters or numbers."); return; }
    if (!value || value <= 0) { toast.error("Enter a discount value above zero."); return; }
    setBusy(true);
    const { error } = await supabase.from("coupons").insert({
      code,
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: value,
      min_order: Number(form.min_order) || 0,
    });
    setBusy(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "This code already exists." : "Could not save the coupon."); return; }
    toast.success(`${code} is live`);
    setForm({ code: "", description: "", discount_type: "FLAT", discount_value: "", min_order: "0" });
    load();
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">Coupons &amp; offers</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          placeholder="CODE"
          className="rounded-xl border border-border px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
        />
        <select
          value={form.discount_type}
          onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
          className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="FLAT">Flat ₹ off</option>
          <option value="PERCENT">% off</option>
        </select>
        <input
          value={form.discount_value}
          onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
          placeholder="Discount value"
          inputMode="decimal"
          className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          value={form.min_order}
          onChange={(e) => setForm({ ...form, min_order: e.target.value })}
          placeholder="Minimum order"
          inputMode="decimal"
          className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </div>
      <input
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Short description shown to customers"
        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      <button
        disabled={busy}
        onClick={create}
        className="press w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Saving…" : "Create coupon"}
      </button>
      <div className="space-y-2 pt-1">
        {rows.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{c.code}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {c.discount_type === "PERCENT" ? `${c.discount_value}% off` : `${inr(Number(c.discount_value))} off`} · min {inr(Number(c.min_order))}
              </p>
            </div>
            <button
              onClick={async () => {
                await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
                load();
              }}
              className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-bold ${c.is_active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              {c.is_active ? "Active" : "Off"}
            </button>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No coupons yet.</p> : null}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-soft border border-border p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}


function CashfreeKeys() {
  const [appId, setAppId] = useState("");
  const [secret, setSecret] = useState("");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("payment_credentials")
      .select("cashfree_app_id,cashfree_secret,is_live")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        setAppId(data?.cashfree_app_id ?? "");
        setSecret(data?.cashfree_secret ?? "");
        setLive(Boolean(data?.is_live));
        setLoaded(true);
      });
  }, []);

  async function save() {
    if (!appId.trim() || !secret.trim()) {
      toast.error("Please fill both the App ID and the secret key.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payment_credentials").upsert({
      id: true,
      provider: "CASHFREE",
      cashfree_app_id: appId.trim(),
      cashfree_secret: secret.trim(),
      is_live: live,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      toast.error("Could not save the Cashfree keys. Please try again.");
      return;
    }
    toast.success(live ? "Cashfree is live now." : "Saved. Cashfree test mode is on.");
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">Cashfree gateway keys</p>
      <p className="text-[11px] text-muted-foreground">
        Only administrators can see or change this. Paste the App ID and secret key from your Cashfree dashboard, then
        choose Cashfree as the payment gateway above.
      </p>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">App ID (client id)</span>
        <input
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          placeholder="TEST1234567890abcdef"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Secret key</span>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Paste the secret key"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <button
        onClick={() => setLive(!live)}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold ${live ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
      >
        {live ? "Live mode (real money)" : "Test mode"}
        <span>{live ? "LIVE" : "TEST"}</span>
      </button>
      <button
        disabled={busy || !loaded}
        onClick={save}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save Cashfree keys"}
      </button>
    </section>
  );
}

function PayuKeys() {
  const [key, setKey] = useState("");
  const [salt, setSalt] = useState("");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("payment_credentials")
      .select("payu_key,payu_salt,is_live")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        setKey(data?.payu_key ?? "");
        setSalt(data?.payu_salt ?? "");
        setLive(Boolean(data?.is_live));
        setLoaded(true);
      });
  }, []);

  async function save() {
    if (!key.trim() || !salt.trim()) {
      toast.error("Please fill both the merchant key and the salt.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payment_credentials").upsert({
      id: true,
      provider: "PAYU",
      payu_key: key.trim(),
      payu_salt: salt.trim(),
      is_live: live,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      toast.error("Could not save the PayU keys. Please try again.");
      return;
    }
    toast.success(live ? "PayU is live now." : "Saved. PayU test mode is on.");
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">PayU gateway keys</p>
      <p className="text-[11px] text-muted-foreground">
        Paste the merchant key and salt from your PayU dashboard, then choose PayU as the payment gateway above.
      </p>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Merchant key</span>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g. gtKFFx"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Salt</span>
        <input
          type="password"
          value={salt}
          onChange={(e) => setSalt(e.target.value)}
          placeholder="Paste the salt"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <button
        onClick={() => setLive(!live)}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold ${live ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
      >
        {live ? "Live mode (real money)" : "Test mode"}
        <span>{live ? "LIVE" : "TEST"}</span>
      </button>
      <button
        disabled={busy || !loaded}
        onClick={save}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save PayU keys"}
      </button>
    </section>
  );
}
