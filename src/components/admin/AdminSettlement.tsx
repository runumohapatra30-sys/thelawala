import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { PAYOUT_CYCLE } from "@/lib/settlement";
import { toast } from "sonner";

type Party = "VENDOR" | "PARTNER";

type Line = {
  id: string;
  name: string;
  earned: number;
  settled: number;
  cashInHand: number;
  pending: number;
};

export function AdminSettlement() {
  const [party, setParty] = useState<Party>("VENDOR");
  const [rows, setRows] = useState<Line[]>([]);
  const [busy, setBusy] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [history, setHistory] = useState<{ id: string; amount: number; reference: string | null; paid_at: string; name: string }[]>([]);

  async function load() {
    setBusy(true);
    const isVendor = party === "VENDOR";
    const key = isVendor ? "vendor_id" : "partner_id";

    const [people, ledgers, settled, codOrders, deposits, hist] = await Promise.all([
      isVendor
        ? supabase.from("vendors").select("id,stall_name").eq("status", "APPROVED")
        : supabase.from("delivery_partners").select("id,name").eq("status", "APPROVED"),
      supabase.from("payout_ledgers").select("vendor_id,partner_id,amount").eq("party_type", party),
      supabase.from("settlements").select("vendor_id,partner_id,amount").eq("party_type", party),
      isVendor
        ? Promise.resolve({ data: [] as { partner_id: string | null; grand_total: number }[] })
        : supabase.from("orders").select("partner_id,grand_total").eq("status", "DELIVERED").eq("payment_mode", "COD"),
      isVendor
        ? Promise.resolve({ data: [] as { partner_id: string; amount: number }[] })
        : supabase.from("cash_deposits").select("partner_id,amount").in("status", ["PENDING", "VERIFIED"]),
      supabase.from("settlements").select("id,amount,reference,paid_at,vendor_id,partner_id").eq("party_type", party).order("paid_at", { ascending: false }).limit(20),
    ]);

    const names: Record<string, string> = {};
    for (const p of (people.data ?? []) as { id: string; stall_name?: string; name?: string }[]) {
      names[p.id] = p.stall_name ?? p.name ?? "—";
    }

    const sum = (list: { vendor_id?: string | null; partner_id?: string | null; amount: number }[] | null) => {
      const m: Record<string, number> = {};
      for (const r of list ?? []) {
        const k = (isVendor ? r.vendor_id : r.partner_id) ?? "";
        if (!k) continue;
        m[k] = (m[k] ?? 0) + Number(r.amount);
      }
      return m;
    };

    const earnedMap = sum(ledgers.data as never);
    const settledMap = sum(settled.data as never);
    const cashMap: Record<string, number> = {};
    for (const o of (codOrders.data ?? []) as { partner_id: string | null; grand_total: number }[]) {
      if (!o.partner_id) continue;
      cashMap[o.partner_id] = (cashMap[o.partner_id] ?? 0) + Number(o.grand_total);
    }
    for (const d of (deposits.data ?? []) as { partner_id: string; amount: number }[]) {
      cashMap[d.partner_id] = (cashMap[d.partner_id] ?? 0) - Number(d.amount);
    }

    const list: Line[] = Object.keys(names).map((id) => {
      const earned = earnedMap[id] ?? 0;
      const s = settledMap[id] ?? 0;
      const cash = Math.max(0, cashMap[id] ?? 0);
      return { id, name: names[id]!, earned, settled: s, cashInHand: cash, pending: Math.max(0, earned - s - cash) };
    });
    list.sort((a, b) => b.pending - a.pending);
    setRows(list);
    setHistory(
      ((hist.data ?? []) as { id: string; amount: number; reference: string | null; paid_at: string; vendor_id: string | null; partner_id: string | null }[]).map((h) => ({
        id: h.id,
        amount: Number(h.amount),
        reference: h.reference,
        paid_at: h.paid_at,
        name: names[(isVendor ? h.vendor_id : h.partner_id) ?? ""] ?? "—",
      })),
    );
    setBusy(false);
  }

  useEffect(() => {
    void load();
  }, [party]);

  async function settle(line: Line) {
    const amt = Number(amount || line.pending);
    if (!amt || amt <= 0) { toast.error("Enter the amount to pay."); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("settlements").insert({
      party_type: party,
      vendor_id: party === "VENDOR" ? line.id : null,
      partner_id: party === "PARTNER" ? line.id : null,
      amount: amt,
      reference: ref || null,
      created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`${inr(Math.round(amt))} recorded as paid to ${line.name}.`);
    setOpenId(null);
    setAmount("");
    setRef("");
    void load();
  }

  async function instantSettle(line: Line) {
    if (line.pending <= 0) return;
    setAmount(String(Math.round(line.pending)));
    setRef("Instant admin settlement");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("settlements").insert({
      party_type: party,
      vendor_id: party === "VENDOR" ? line.id : null,
      partner_id: party === "PARTNER" ? line.id : null,
      amount: line.pending,
      reference: "Instant admin settlement",
      note: "Released before the T+3 cycle by admin override",
      created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`${inr(Math.round(line.pending))} released to ${line.name}.`);
    void load();
  }

  const totalPending = rows.reduce((a, r) => a + r.pending, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["VENDOR", "PARTNER"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setParty(p)}
            className={`rounded-lg py-2 text-xs font-black ${party === p ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            {p === "VENDOR" ? "Stalls" : "Delivery partners"}
          </button>
        ))}
      </div>

      <div className="card-soft border border-border p-3">
        <p className="text-[11px] font-semibold text-muted-foreground">Total still to pay</p>
        <p className="text-xl font-black text-primary">{inr(Math.round(totalPending))}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{PAYOUT_CYCLE[party]}. Admin can release any pending amount immediately.</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {party === "VENDOR"
            ? "Vendor payout = order total − commission − GST − TDS − discounts."
            : "Earned = delivery fee + tip + bonus. Cash held is the COD money the partner still has, so it is taken off. To pay = earned − already paid − cash held."}
        </p>
      </div>

      {busy ? <p className="text-xs text-muted-foreground">Loading…</p> : null}

      {rows.map((r) => (
        <div key={r.id} className="card-soft border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{r.name}</p>
              <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                <p>Earned so far · <span className="font-bold text-foreground">{inr(Math.round(r.earned))}</span></p>
                <p>Already paid · <span className="font-bold text-foreground">{inr(Math.round(r.settled))}</span></p>
                {party === "PARTNER" ? (
                  <p>Cash still with them · <span className="font-bold text-foreground">{inr(Math.round(r.cashInHand))}</span></p>
                ) : null}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-muted-foreground">Pay now</p>
              <p className="text-sm font-black text-primary">{inr(Math.round(r.pending))}</p>
              <button
                onClick={() => void instantSettle(r)}
                className="mt-1 rounded-lg border border-primary px-3 py-1 text-[11px] font-bold text-primary"
              >
                Instant 1-click Settlement
              </button>
            </div>
          </div>

          {openId === r.id ? (
            <div className="mt-2 space-y-2 rounded-xl bg-muted/60 p-2">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="Amount (₹)"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Payment reference (UTR / UPI id)"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button onClick={() => settle(r)} className="press w-full rounded-xl bg-primary py-2.5 text-xs font-black text-primary-foreground">
                Record payment
              </button>
            </div>
          ) : null}
        </div>
      ))}

      {history.length ? (
        <section className="card-soft border border-border p-3">
          <p className="text-sm font-bold">Recent settlements</p>
          {history.map((h) => (
            <div key={h.id} className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="truncate text-muted-foreground">{h.name} · {new Date(h.paid_at).toLocaleDateString("en-IN")}{h.reference ? ` · ${h.reference}` : ""}</span>
              <span className="font-bold">{inr(Math.round(h.amount))}</span>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
