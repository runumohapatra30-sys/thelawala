import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { PAYOUT_CYCLE } from "@/lib/settlement";

type Row = { id: string; amount: number; reference: string | null; note: string | null; paid_at: string };
type Order = { grand_total: number; discount_amount: number | null };
type Proof = { amount: number; payment_reference: string | null; method: string; upi_id: string | null; bank_account_no: string | null };
type Receipt = Row & { utr: string; destination: string };

export function SettlementHistory({ party, id, shopName = "ThelaWala vendor" }: { party: "VENDOR" | "PARTNER"; id: string; shopName?: string }) {
  const [earned, setEarned] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [nextDate, setNextDate] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState({ commission: 10, gst: 0, tds: 0 });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    if (!id) return;
    const col = party === "VENDOR" ? "vendor_id" : "partner_id";
    void Promise.all([
      supabase.from("payout_ledgers").select("amount,eligible_at").eq("party_type", party).eq(col, id),
      supabase.from("settlements").select("id,amount,reference,note,paid_at").eq("party_type", party).eq(col, id).order("paid_at", { ascending: false }).limit(20),
      party === "VENDOR"
        ? supabase.from("orders").select("grand_total,discount_amount").eq("vendor_id", id).eq("status", "DELIVERED")
        : Promise.resolve({ data: [] as Order[] }),
      supabase.from("system_settings").select("vendor_commission_pct,gst_pct,tds_pct").maybeSingle(),
      supabase.from("payout_requests").select("amount,payment_reference,method,upi_id,bank_account_no").eq(col, id).eq("status", "APPROVED").order("created_at", { ascending: false }).limit(20),
    ]).then(([led, set, done, global, payout]) => {
      setEarned((led.data ?? []).reduce((a, r) => a + Number(r.amount), 0));
      const upcoming = (led.data ?? []).map((r) => r.eligible_at).filter((d): d is string => !!d && new Date(d as string) > new Date()).sort()[0];
      setNextDate(upcoming ?? null);
      setRows((set.data ?? []) as Row[]);
      setOrders((done.data ?? []) as Order[]);
      setProofs((payout.data ?? []) as Proof[]);
      if (global.data) setSettings({ commission: Number(global.data.vendor_commission_pct ?? 10), gst: Number(global.data.gst_pct ?? 0), tds: Number(global.data.tds_pct ?? 0) });
    });
  }, [party, id]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const paid = rows.reduce((a, r) => a + Number(r.amount), 0);
  const pending = Math.max(0, earned - paid);
  const gross = orders.reduce((a, o) => a + Number(o.grand_total ?? 0), 0);
  const discounts = orders.reduce((a, o) => a + Number(o.discount_amount ?? 0), 0);
  const commission = gross * settings.commission / 100;
  const gst = gross * settings.gst / 100;
  const tds = gross * settings.tds / 100;
  const net = Math.max(0, gross - commission - gst - tds - discounts);
  const scheduledDate = nextDate ?? new Date(Date.now() + 3 * 86400000).toISOString();
  const remaining = Math.max(0, new Date(scheduledDate).getTime() - clock);
  const countdown = `${Math.floor(remaining / 86400000)}d ${Math.floor((remaining % 86400000) / 3600000)}h remaining`;
  const steps = [
    { title: "Order Delivered", detail: "Order is complete", done: orders.length > 0 },
    { title: "Verified", detail: "ThelaWala checks the payout", done: orders.length > 0 && pending > 0 },
    { title: "Bank Transfer", detail: "Funds move on T+3", done: paid > 0 },
  ];

  const receiptRows = useMemo(() => rows.map((row) => {
    const match = proofs.find((p) => Math.abs(Number(p.amount) - Number(row.amount)) < 0.01);
    return {
      ...row,
      utr: row.reference ?? match?.payment_reference ?? "UTR pending",
      destination: maskDestination(match),
    };
  }), [rows, proofs]);

  function downloadSlip(item: Receipt) {
    const html = `<html><body style="font-family:Arial,sans-serif;padding:32px;color:#17231d"><h1>${shopName}</h1><h2>Settlement receipt</h2><p>Paid on ${formatDate(item.paid_at)}</p><hr/><p>Gross sales: ${inr(gross)}</p><p>Platform commission: -${inr(commission)}</p><p>GST & TDS: -${inr(gst + tds)}</p><p>Discounts: -${inr(discounts)}</p><p>Net payout: <b>${inr(Number(item.amount))}</b></p><p>UTR: ${item.utr}</p><p>Destination: ${item.destination}</p><p>Status: PAID TO BANK</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `settlement-slip-${item.id}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Automated T+3 settlement</p>
            <p className="mt-1 text-xl font-black text-emerald-950">Next Payout Scheduled On: {formatDate(scheduledDate)}</p>
            <p className="mt-1 text-xs font-bold text-emerald-700">{countdown}</p>
          </div>
          <span className="mt-1 h-3 w-3 shrink-0 animate-pulse rounded-full bg-emerald-500 ring-4 ring-emerald-200" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {index < steps.length - 1 ? <span className={`absolute left-[58%] top-4 h-0.5 w-[84%] ${step.done ? "bg-emerald-400" : "bg-emerald-200"}`} /> : null}
              <div className="relative z-10 flex flex-col items-center text-center">
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${step.done ? "bg-emerald-600 text-white" : "border-2 border-emerald-300 bg-white text-emerald-700"}`}>{step.done ? "✓" : index + 1}</span>
                <p className="mt-1 text-[10px] font-black text-emerald-950">{step.title}</p>
                <p className="mt-0.5 text-[9px] text-emerald-700">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-black">Payout breakdown</p>
            <p className="text-[11px] text-muted-foreground">Based on delivered orders and current admin settings</p>
          </div>
          <p className="text-xs font-bold text-muted-foreground">{PAYOUT_CYCLE[party]}</p>
        </div>
        <div className="mt-3 space-y-2 rounded-xl bg-muted/60 p-3 text-xs">
          <Breakdown label="Gross Sales" value={inr(Math.round(gross))} />
          <Breakdown label={`Platform Commission (-${settings.commission}%)`} value={`-${inr(Math.round(commission))}`} negative />
          <Breakdown label={`GST (${settings.gst}%) & TDS (${settings.tds}%)`} value={gst + tds ? `-${inr(Math.round(gst + tds))}` : inr(0)} negative />
          <Breakdown label="Discounts" value={`-${inr(Math.round(discounts))}`} negative />
          <div className="my-1 border-t border-border" />
          <Breakdown label="Net Payout" value={inr(Math.round(net))} strong />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Tile label="Earned" value={inr(Math.round(earned))} />
          <Tile label="Paid" value={inr(Math.round(paid))} />
          <Tile label="Pending" value={inr(Math.round(pending))} good />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-black">Completed Settlements / Recent Payouts</p>
        {receiptRows.length ? receiptRows.map((item) => (
          <div key={item.id} className="mt-3 rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-black">{inr(Math.round(Number(item.amount)))}</p>
                <p className="text-[11px] text-muted-foreground">{formatDate(item.paid_at)} · {item.destination}</p>
                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">UTR: {item.utr}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700"><CheckCircle2 className="h-3 w-3" /> PAID TO BANK</span>
            </div>
            <button onClick={() => setReceipt(item)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary py-2 text-xs font-black text-primary">
              <Download className="h-3.5 w-3.5" /> View / Download Slip
            </button>
          </div>
        )) : <p className="mt-2 text-xs text-muted-foreground">No completed payout yet.</p>}
      </section>

      {receipt ? <ReceiptModal shopName={shopName} item={receipt} gross={gross} commission={commission} gst={gst} tds={tds} discounts={discounts} onClose={() => setReceipt(null)} onDownload={() => downloadSlip(receipt)} /> : null}
    </section>
  );
}

function ReceiptModal({ shopName, item, gross, commission, gst, tds, discounts, onClose, onDownload }: { shopName: string; item: Receipt; gross: number; commission: number; gst: number; tds: number; discounts: number; onClose: () => void; onDownload: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Settlement receipt">
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between"><div><p className="text-lg font-black">{shopName}</p><p className="text-xs text-muted-foreground">Official settlement receipt</p></div><button onClick={onClose} aria-label="Close receipt"><X className="h-5 w-5" /></button></div>
        <div className="my-4 border-t border-dashed border-border" />
        <div className="space-y-2 text-sm"><Breakdown label="Paid on" value={formatDate(item.paid_at)} /><Breakdown label="Gross sales" value={inr(gross)} /><Breakdown label="Platform commission" value={`-${inr(commission)}`} negative /><Breakdown label="GST & TDS" value={`-${inr(gst + tds)}`} negative /><Breakdown label="Discounts" value={`-${inr(discounts)}`} negative /><Breakdown label="Net payout" value={inr(Number(item.amount))} strong /><Breakdown label="UTR reference" value={item.utr} /><Breakdown label="Destination" value={item.destination} /><Breakdown label="Status" value="PAID TO BANK" strong /></div>
        <button onClick={onDownload} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground"><Download className="h-4 w-4" /> Download Slip</button>
      </div>
    </div>
  );
}

function maskDestination(proof?: Proof) {
  if (!proof) return "Bank / UPI destination";
  if (proof.upi_id) {
    const [name, bank] = proof.upi_id.split("@");
    return `${name?.slice(0, 2) ?? "UP"}•••@${bank ?? "bank"}`;
  }
  return `${proof.method === "BANK" ? "Bank account" : "Bank"} •••• ${(proof.bank_account_no ?? "").slice(-4) || "—"}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Breakdown({ label, value, negative, strong }: { label: string; value: string; negative?: boolean; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? "text-base font-black text-emerald-700" : ""}`}><span>{label}</span><span className={negative ? "text-destructive" : ""}>{value}</span></div>;
}

function Tile({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return <div className="rounded-xl bg-muted p-2.5 text-center"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className={`text-sm font-black ${good ? "text-primary" : ""}`}>{value}</p></div>;
}
