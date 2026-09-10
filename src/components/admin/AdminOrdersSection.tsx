import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr, STATUS_LABEL } from "@/lib/fees";
import { PERIOD_LABEL, needsRefund, periodStart, splitOrder, type Period } from "@/lib/settlement";
import { ThaliwalaLoader } from "@/components/ThaliwalaLoader";

type Row = {
  id: string; code: string; status: string; created_at: string;
  customer_name: string; customer_mobile: string;
  payment_mode: string; payment_status: string;
  grand_total: number; food_total: number; base_food_total: number | null;
  delivery_fee: number; tip_amount: number; discount_amount: number;
  platform_fee: number; handling_fee: number; packing_fee: number; surge_fee: number;
  distance_km: number;
};

const COLS =
  "id,code,status,created_at,customer_name,customer_mobile,payment_mode,payment_status,grand_total,food_total,base_food_total,delivery_fee,tip_amount,discount_amount,platform_fee,handling_fee,packing_fee,surge_fee,distance_km";

const STATUS_FILTERS = ["ALL", "DELIVERED", "CANCELLED", "LIVE"] as const;

export function AdminOrdersSection() {
  const [period, setPeriod] = useState<Period>("day");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setBusy(true);
    let query = supabase.from("orders").select(COLS).order("created_at", { ascending: false }).limit(1000);
    const from = periodStart(period);
    if (from) query = query.gte("created_at", from);
    query.then(({ data }) => {
      setRows((data ?? []) as Row[]);
      setBusy(false);
    });
  }, [period]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((o) => {
      if (statusFilter === "DELIVERED" && o.status !== "DELIVERED") return false;
      if (statusFilter === "CANCELLED" && o.status !== "CANCELLED") return false;
      if (statusFilter === "LIVE" && (o.status === "DELIVERED" || o.status === "CANCELLED")) return false;
      if (!term) return true;
      return (
        o.code.toLowerCase().includes(term) ||
        (o.customer_name ?? "").toLowerCase().includes(term) ||
        (o.customer_mobile ?? "").includes(term)
      );
    });
  }, [rows, statusFilter, q]);

  const totals = useMemo(() => {
    let sale = 0, profit = 0, vendor = 0, rider = 0, cancelled = 0, refundDue = 0, delivered = 0;
    for (const o of rows) {
      const s = splitOrder(o);
      if (o.status === "DELIVERED") {
        delivered += 1;
        sale += s.sale;
        profit += s.platformProfit;
        vendor += s.vendorEarning;
        rider += s.riderTotal;
      }
      if (o.status === "CANCELLED") {
        cancelled += 1;
        if (needsRefund(o)) refundDue += Number(o.grand_total);
      }
    }
    return { sale, profit, vendor, rider, cancelled, refundDue, delivered };
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold ${period === p ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile label={`Sale (${totals.delivered} delivered)`} value={inr(Math.round(totals.sale))} />
        <Tile label="Platform earning" value={inr(Math.round(totals.profit))} good />
        <Tile label="Stalls get" value={inr(Math.round(totals.vendor))} />
        <Tile label="Riders get" value={inr(Math.round(totals.rider))} />
        <Tile label={`Cancelled (${totals.cancelled})`} value="Not counted in sale" />
        <Tile label="Refund to give back" value={inr(Math.round(totals.refundDue))} />
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search order code, name or mobile"
        className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <div className="grid grid-cols-4 gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-xl border px-2 py-2 text-[11px] font-bold ${statusFilter === s ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            {s === "ALL" ? "All" : s === "LIVE" ? "Running" : s === "DELIVERED" ? "Delivered" : "Cancelled"}
          </button>
        ))}
      </div>

      {busy ? <ThaliwalaLoader /> : null}
      {!busy && list.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No orders in this range.</p> : null}

      <div className="space-y-2">
        {list.map((o) => {
          const s = splitOrder(o);
          const refund = needsRefund(o);
          return (
            <div key={o.id} className="card-soft border border-border p-3">
              <button onClick={() => setOpen(open === o.id ? null : o.id)} className="flex w-full items-center justify-between text-left">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">#{o.code} · {inr(Math.round(Number(o.grand_total)))}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {o.customer_name} · {STATUS_LABEL[o.status] ?? o.status} · {new Date(o.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${o.payment_mode === "COD" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                  {o.payment_mode === "COD" ? "Cash" : "Prepaid"}
                </span>
              </button>

              {refund ? (
                <p className="mt-1.5 rounded-lg bg-destructive/10 px-2 py-1 text-[11px] font-bold text-destructive">
                  Cancelled prepaid order — refund {inr(Math.round(Number(o.grand_total)))} to the customer.
                </p>
              ) : null}

              {open === o.id ? (
                <div className="mt-2 space-y-1 rounded-xl bg-muted/60 p-2 text-[11px]">
                  <Line k="Order value" v={inr(Math.round(s.sale))} />
                  <Line k="Stall earning" v={inr(Math.round(s.vendorEarning))} />
                  <Line k="Rider delivery fee" v={inr(Math.round(s.riderFee))} />
                  <Line k="Rider tip" v={inr(Math.round(s.riderTip))} />
                  <Line k="Rider gift bonus" v={inr(Math.round(s.riderGift))} />
                  <Line k="Charges collected" v={inr(Math.round(s.charges))} />
                  <Line k="Discount given" v={`− ${inr(Math.round(s.discount))}`} />
                  <Line k="Platform earning" v={inr(Math.round(s.platformProfit))} strong />
                  <p className="pt-1 text-muted-foreground">{o.customer_mobile} · {Number(o.distance_km).toFixed(1)} km</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={strong ? "font-black text-primary" : "font-semibold"}>{v}</span>
    </div>
  );
}

function Tile({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-2xl bg-muted p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-black ${good ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
