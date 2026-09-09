import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";

type Row = {
  day: string;
  orders_count: number;
  collected: number;
  food_total: number;
  vendor_payout: number;
  rider_payout: number;
  charges: number;
  discounts: number;
  profit: number;
};

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Day-by-day money report: who collected how much and what the platform kept. */
export function AdminReports() {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 29 * 86400000);
  const [from, setFrom] = useState(iso(monthAgo));
  const [to, setTo] = useState(iso(today));
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    const { data } = await supabase.rpc("admin_daily_report", { _from: from, _to: to });
    setRows(((data ?? []) as Row[]).map((r) => ({ ...r })));
    setBusy(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const sum = (k: keyof Row) => rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);

  function download() {
    const header = "Date,Orders,Collected,Food total,Vendor payout,Rider payout,Charges,Discounts,Profit";
    const body = rows
      .map((r) => [r.day, r.orders_count, r.collected, r.food_total, r.vendor_payout, r.rider_payout, r.charges, r.discounts, r.profit].join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `thelawala-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">Daily money report</p>
      <p className="text-[11px] text-muted-foreground">Delivered orders only — stall payout, rider payout, charges collected and your profit.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={() => void load()} className="press flex-1 rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground">
          {busy ? "Loading…" : "Show report"}
        </button>
        <button onClick={download} disabled={rows.length === 0} className="press flex-1 rounded-xl border border-primary py-2 text-xs font-black text-primary disabled:opacity-40">
          Download
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Tile label="Collected" value={inr(Math.round(sum("collected")))} />
        <Tile label="Your profit" value={inr(Math.round(sum("profit")))} good />
        <Tile label="Stalls get" value={inr(Math.round(sum("vendor_payout")))} />
        <Tile label="Riders get" value={inr(Math.round(sum("rider_payout")))} />
        <Tile label="Charges collected" value={inr(Math.round(sum("charges")))} />
        <Tile label="Discounts given" value={inr(Math.round(sum("discounts")))} />
      </div>

      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-left text-[11px]">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-2">Date</th>
              <th className="py-1 pr-2">Ord</th>
              <th className="py-1 pr-2">Collected</th>
              <th className="py-1 pr-2">Stall</th>
              <th className="py-1 pr-2">Rider</th>
              <th className="py-1 pr-2">Charges</th>
              <th className="py-1">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day} className="border-t border-border">
                <td className="py-1.5 pr-2 font-semibold">{r.day}</td>
                <td className="py-1.5 pr-2">{r.orders_count}</td>
                <td className="py-1.5 pr-2">{inr(Number(r.collected))}</td>
                <td className="py-1.5 pr-2">{inr(Number(r.vendor_payout))}</td>
                <td className="py-1.5 pr-2">{inr(Number(r.rider_payout))}</td>
                <td className="py-1.5 pr-2">{inr(Number(r.charges))}</td>
                <td className="py-1.5 font-black text-primary">{inr(Number(r.profit))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !busy ? <p className="py-3 text-center text-[11px] text-muted-foreground">No delivered orders in this range.</p> : null}
      </div>
    </section>
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
