import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { PERIOD_LABEL, periodStart, splitOrder, type Period } from "@/lib/settlement";

type Row = {
  id: string; code: string; delivered_at: string | null; delivery_fee: number; tip_amount: number;
  food_total: number; base_food_total: number | null; distance_km: number; grand_total: number;
  status: string; payment_mode: string;
};

/** Trip-by-trip money for a delivery partner: fee + tip + gift bonus. */
export function RiderEarningsBreakdown({ partnerId }: { partnerId: string }) {
  const [period, setPeriod] = useState<Period>("week");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!partnerId) return;
    let q = supabase
      .from("orders")
      .select("id,code,delivered_at,delivery_fee,tip_amount,food_total,base_food_total,distance_km,grand_total,status,payment_mode")
      .eq("partner_id", partnerId)
      .eq("status", "DELIVERED")
      .order("delivered_at", { ascending: false })
      .limit(200);
    const from = periodStart(period);
    if (from) q = q.gte("delivered_at", from);
    q.then(({ data }) => setRows((data ?? []) as Row[]));
  }, [partnerId, period]);

  let fee = 0, tip = 0, gift = 0;
  for (const o of rows) {
    const s = splitOrder(o);
    fee += s.riderFee;
    tip += s.riderTip;
    gift += s.riderGift;
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">Your earnings</p>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${period === p ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Tile label="Trips" value={String(rows.length)} />
        <Tile label="Fee" value={inr(Math.round(fee))} />
        <Tile label="Tips" value={inr(Math.round(tip))} />
        <Tile label="Gift" value={inr(Math.round(gift))} good />
      </div>
      <p className="text-[11px] font-bold">Total earned {inr(Math.round(fee + tip + gift))}</p>
      <div className="space-y-1">
        {rows.slice(0, 25).map((o) => {
          const s = splitOrder(o);
          return (
            <div key={o.id} className="flex items-center justify-between rounded-xl border border-border px-2.5 py-1.5 text-[11px]">
              <div className="min-w-0">
                <p className="font-bold">#{o.code}</p>
                <p className="truncate text-muted-foreground">
                  Fee {inr(Math.round(s.riderFee))} · Tip {inr(Math.round(s.riderTip))} · Gift {inr(Math.round(s.riderGift))}
                </p>
              </div>
              <span className="font-black text-primary">{inr(Math.round(s.riderTotal))}</span>
            </div>
          );
        })}
        {rows.length === 0 ? <p className="text-[11px] text-muted-foreground">No trips in this range.</p> : null}
      </div>
    </section>
  );
}

function Tile({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-2xl bg-muted p-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-black ${good ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
