import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { PAYOUT_CYCLE } from "@/lib/settlement";

type Row = { id: string; amount: number; reference: string | null; note: string | null; paid_at: string };

/** Money summary + settlement history for one stall or one delivery partner. */
export function SettlementHistory({ party, id }: { party: "VENDOR" | "PARTNER"; id: string }) {
  const [earned, setEarned] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!id) return;
    const col = party === "VENDOR" ? "vendor_id" : "partner_id";
    void Promise.all([
      supabase.from("payout_ledgers").select("amount").eq("party_type", party).eq(col, id),
      supabase.from("settlements").select("id,amount,reference,note,paid_at").eq("party_type", party).eq(col, id).order("paid_at", { ascending: false }).limit(20),
    ]).then(([led, set]) => {
      setEarned((led.data ?? []).reduce((a, r) => a + Number(r.amount), 0));
      setRows((set.data ?? []) as Row[]);
    });
  }, [party, id]);

  const paid = rows.reduce((a, r) => a + Number(r.amount), 0);
  const pending = Math.max(0, earned - paid);

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">Settlement</p>
      <p className="text-[11px] text-muted-foreground">{PAYOUT_CYCLE[party]}. Commission is already deducted.</p>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Earned" value={inr(Math.round(earned))} />
        <Tile label="Paid to you" value={inr(Math.round(paid))} />
        <Tile label="Pending" value={inr(Math.round(pending))} good />
      </div>
      {rows.length ? (
        <div className="space-y-1 pt-1">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-[11px]">
              <span className="truncate text-muted-foreground">
                {new Date(r.paid_at).toLocaleDateString("en-IN")}{r.reference ? ` · ${r.reference}` : ""}
              </span>
              <span className="font-bold">{inr(Math.round(Number(r.amount)))}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">No payment made yet.</p>
      )}
    </section>
  );
}

function Tile({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-2xl bg-muted p-2.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-black ${good ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
