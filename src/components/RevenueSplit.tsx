import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { PRICE_MARKUP, platformRetainedProfit } from "@/lib/pricing";

type Row = {
  grand_total: number; food_total: number; base_food_total: number | null;
  delivery_fee: number; tip_amount: number; discount_amount: number;
  platform_fee: number; handling_fee: number; packing_fee: number; surge_fee: number;
  distance_km: number;
};

type Range = "today" | "week" | "month";

function since(range: Range) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "week") d.setDate(d.getDate() - 6);
  if (range === "month") d.setDate(d.getDate() - 29);
  return d.toISOString();
}

/** Itemised money split for delivered orders: stall, rider and what the platform keeps. */
export function RevenueSplit() {
  const [range, setRange] = useState<Range>("today");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [deductions, setDeductions] = useState({ commission: 10, gst: 0, tds: 0 });

  useEffect(() => {
    setBusy(true);
    Promise.all([
      supabase.from("orders").select("grand_total,food_total,base_food_total,delivery_fee,tip_amount,discount_amount,platform_fee,handling_fee,packing_fee,surge_fee,distance_km").eq("status", "DELIVERED").gte("delivered_at", since(range)),
      supabase.from("system_settings").select("vendor_commission_pct,gst_pct,tds_pct").maybeSingle(),
    ]).then(([orders, settings]) => {
      setRows((orders.data ?? []) as Row[]);
      if (settings.data) setDeductions({ commission: Number(settings.data.vendor_commission_pct ?? 10), gst: Number(settings.data.gst_pct ?? 0), tds: Number(settings.data.tds_pct ?? 0) });
      setBusy(false);
    });
  }, [range]);

  let gmv = 0, vendorPayout = 0, riderPayout = 0, charges = 0, discounts = 0;
  for (const o of rows) {
    const tip = Number(o.tip_amount ?? 0);
    const food = Number(o.food_total ?? 0);
    const base = Number(o.base_food_total ?? 0) > 0 ? Number(o.base_food_total) : food / PRICE_MARKUP;
    const total = Number(o.grand_total ?? 0);
    const vendor = Math.max(0, total - total * deductions.commission / 100 - total * deductions.gst / 100 - total * deductions.tds / 100 - Number(o.discount_amount ?? 0));
    const pool = food - vendor;
    const retained = platformRetainedProfit(Number(o.distance_km ?? 0));
    const gift = Math.max(0, pool - retained);
    gmv += Number(o.grand_total ?? 0) + tip;
    vendorPayout += vendor;
    riderPayout += Number(o.delivery_fee ?? 0) + tip + gift;
    charges += Number(o.platform_fee ?? 0) + Number(o.handling_fee ?? 0) + Number(o.packing_fee ?? 0) + Number(o.surge_fee ?? 0);
    discounts += Number(o.discount_amount ?? 0);
  }
  const net = gmv - vendorPayout - riderPayout - discounts;

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Revenue distribution</p>
        <div className="flex gap-1">
          {(["today", "week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                range === r ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {r === "today" ? "Today" : r === "week" ? "This week" : "This month"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {busy ? "Loading…" : `${rows.length} delivered order(s)`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Total order value" value={inr(Math.round(gmv))} />
        <Tile label="Stall payout" value={inr(Math.round(vendorPayout))} />
        <Tile label="Rider payout" value={inr(Math.round(riderPayout))} />
        <Tile label="Platform net earning" value={inr(Math.round(net))} good />
        <Tile label="Charges collected" value={inr(Math.round(charges))} />
        <Tile label="Discounts given" value={inr(Math.round(discounts))} />
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
