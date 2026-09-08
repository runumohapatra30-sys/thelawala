import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { inr, STATUS_LABEL, type Settings } from "@/lib/fees";
import { useIsAdmin, useSession } from "@/lib/session";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Thaleewala" },
      { name: "description", content: "Thaleewala control room: delivery fee rules, extra charges, payment settings, stall and rider approvals, orders and earnings." },
      { property: "og:title", content: "Administration — Thaleewala" },
      { property: "og:description", content: "Fee rules, approvals, orders and platform earnings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type OrderRow = { id: string; code: string; status: string; grand_total: number; delivery_fee: number; platform_fee: number; food_total: number; created_at: string };

function Admin() {
  const { user, loading } = useSession();
  const isAdmin = useIsAdmin(user?.id);
  const [s, setS] = useState<Settings | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [vendors, setVendors] = useState<{ id: string; stall_name: string; status: string }[]>([]);
  const [riders, setRiders] = useState<{ id: string; name: string; status: string }[]>([]);
  const [refunds, setRefunds] = useState<{ id: string; amount: number; reason: string | null; method: string; status: string }[]>([]);
  const [closures, setClosures] = useState<{ id: string; amount: number; status: string }[]>([]);
  const [saved, setSaved] = useState(false);

  const loadMoney = () => {
    supabase.from("refund_requests").select("id,amount,reason,method,status").eq("status", "PENDING").then(({ data }) => setRefunds(data ?? []));
    supabase.from("wallet_closure_requests").select("id,amount,status").eq("status", "PENDING").then(({ data }) => setClosures(data ?? []));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadMoney();
    supabase.from("system_settings").select("*").maybeSingle().then(({ data }) => setS(data as Settings));
    supabase.from("orders").select("id,code,status,grand_total,delivery_fee,platform_fee,food_total,created_at").order("created_at", { ascending: false }).limit(50).then(({ data }) => setOrders((data ?? []) as OrderRow[]));
    supabase.from("vendors").select("id,stall_name,status").then(({ data }) => setVendors(data ?? []));
    supabase.from("delivery_partners").select("id,name,status").then(({ data }) => setRiders(data ?? []));
  }, [isAdmin]);

  if (loading) return <Shell><PortalHeader title="Administration" /></Shell>;

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

  const gmv = orders.reduce((a, o) => a + Number(o.grand_total), 0);
  const commission = s ? orders.reduce((a, o) => a + (Number(o.food_total) * Number(s.vendor_commission_pct)) / 100, 0) : 0;
  const feeIncome = orders.reduce((a, o) => a + Number(o.platform_fee), 0);

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
      <PortalHeader title="Administration" subtitle="Fees, approvals and earnings" />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Orders" value={String(orders.length)} />
          <Stat label="Sales" value={inr(Math.round(gmv))} />
          <Stat label="Platform earning" value={inr(Math.round(commission + feeIncome))} />
        </div>

        {s ? (
          <>
            <section className="card-soft space-y-2 border border-border p-3">
              <p className="text-sm font-bold">Delivery fee rule</p>
              <p className="text-[11px] text-muted-foreground">
                Customer pays the fixed fee up to the base distance, then the per-kilometre rate for every extra
                kilometre. Only one delivery fee line is shown on the bill.
              </p>
              {num("base_delivery_fee", "Fixed delivery fee (₹)")}
              {num("base_delivery_distance_km", "Covered by the fixed fee (km)")}
              {num("extra_fee_per_km", "Extra fee per km beyond that (₹)")}
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
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Payment gateway</span>
                <select
                  value={s.payment_gateway}
                  onChange={(e) => setS({ ...s, payment_gateway: e.target.value })}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <option value="PAYU">PayU</option>
                  <option value="CASHFREE">Cashfree</option>
                </select>
              </label>
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
              <p className="text-[11px] text-muted-foreground">
                Gateway secret keys are stored securely on the server, never in this screen.
              </p>
            </section>

            <button
              onClick={async () => {
                const { error } = await supabase.from("system_settings").update(s).eq("id", true);
                setSaved(!error);
              }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              {saved ? "Settings saved" : "Save settings"}
            </button>
          </>
        ) : null}

        <section className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Stall approvals</p>
          {vendors.map((v) => (
            <ApprovalRow
              key={v.id}
              name={v.stall_name}
              status={v.status}
              onSet={async (status) => {
                await supabase.from("vendors").update({ status }).eq("id", v.id);
                setVendors(vendors.map((x) => (x.id === v.id ? { ...x, status } : x)));
              }}
            />
          ))}
        </section>

        <section className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Delivery partner approvals</p>
          {riders.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No applications yet.</p> : null}
          {riders.map((r) => (
            <ApprovalRow
              key={r.id}
              name={r.name}
              status={r.status}
              onSet={async (status) => {
                await supabase.from("delivery_partners").update({ status }).eq("id", r.id);
                setRiders(riders.map((x) => (x.id === r.id ? { ...x, status } : x)));
              }}
            />
          ))}
        </section>

        <section className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Recent orders</p>
          <div className="mt-2 space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold">#{o.code}</p>
                  <p className="text-[11px] text-muted-foreground">{STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
                <p className="font-bold">{inr(Number(o.grand_total))}</p>
              </div>
            ))}
            {orders.length === 0 ? <p className="text-xs text-muted-foreground">No orders yet.</p> : null}
          </div>
        </section>
      </div>
    </Shell>
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

function ApprovalRow({ name, status, onSet }: { name: string; status: string; onSet: (s: string) => void }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="text-[11px] text-muted-foreground">{status}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSet("APPROVED")} className="rounded-lg border border-primary px-3 py-1 text-xs font-bold text-primary">Approve</button>
        <button onClick={() => onSet("REJECTED")} className="rounded-lg border border-border px-3 py-1 text-xs font-bold text-muted-foreground">Reject</button>
      </div>
    </div>
  );
}
