import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr, STATUS_LABEL } from "@/lib/fees";
import { toast } from "sonner";

type Payout = {
  id: string; amount: number; method: string; status: string; party_type: string;
  vendor_id: string | null; partner_id: string | null; upi_id: string | null;
  bank_holder: string | null; bank_account_no: string | null; bank_ifsc: string | null; created_at: string;
};

export function PayoutQueue() {
  const [rows, setRows] = useState<Payout[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("payout_requests")
      .select("id,amount,method,status,party_type,vendor_id,partner_id,upi_id,bank_holder,bank_account_no,bank_ifsc,created_at")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Payout[];
    setRows(list);
    const [{ data: v }, { data: p }] = await Promise.all([
      supabase.from("vendors").select("id,stall_name"),
      supabase.from("delivery_partners").select("id,name"),
    ]);
    const map: Record<string, string> = {};
    (v ?? []).forEach((x) => (map[x.id] = x.stall_name));
    (p ?? []).forEach((x) => (map[x.id] = x.name));
    setNames(map);
  };
  useEffect(() => { void load(); }, []);

  async function decide(r: Payout, approve: boolean) {
    const ref = approve ? window.prompt("Payment reference (UTR / transaction id)") ?? "" : "";
    setBusy(r.id);
    const { error } = await supabase.rpc("decide_payout", {
      _request_id: r.id,
      _approve: approve,
      _payment_reference: ref || null,
      _admin_note: null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Marked as paid." : "Request rejected.");
    void load();
  }

  return (
    <section className="card-soft border border-border p-3">
      <p className="text-sm font-bold">Withdrawal requests</p>
      {rows.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">Nothing pending.</p> : null}
      {rows.map((r) => (
        <div key={r.id} className="mt-2 rounded-xl border border-border p-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold">
                {inr(Math.round(Number(r.amount)))} · {names[(r.vendor_id ?? r.partner_id) as string] ?? (r.party_type === "VENDOR" ? "Stall" : "Delivery partner")}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {r.method === "UPI" ? r.upi_id : `${r.bank_holder ?? ""} · ${r.bank_account_no ?? ""} · ${r.bank_ifsc ?? ""}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button disabled={busy === r.id} onClick={() => decide(r, true)} className="rounded-lg border border-primary px-3 py-1 text-xs font-bold text-primary disabled:opacity-50">Mark paid</button>
              <button disabled={busy === r.id} onClick={() => decide(r, false)} className="rounded-lg border border-border px-3 py-1 text-xs font-bold text-muted-foreground disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

type Live = { id: string; code: string; status: string; grand_total: number; partner_id: string | null; customer_name: string };

const LIVE = ["ORDER_PLACED", "PREPARING", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "OUT_FOR_DELIVERY"];

export function LiveOrders() {
  const [rows, setRows] = useState<Live[]>([]);
  const [riders, setRiders] = useState<{ id: string; name: string; is_online: boolean }[]>([]);

  const load = async () => {
    const [{ data }, { data: rs }] = await Promise.all([
      supabase.from("orders").select("id,code,status,grand_total,partner_id,customer_name").in("status", LIVE).order("created_at", { ascending: false }),
      supabase.from("delivery_partners").select("id,name,is_online").eq("status", "APPROVED"),
    ]);
    setRows((data ?? []) as Live[]);
    setRiders(rs ?? []);
  };
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, []);

  async function reassign(o: Live, partnerId: string) {
    if (!partnerId) return;
    const { error } = await supabase
      .from("orders")
      .update({ partner_id: partnerId, offered_to: null, offer_expires_at: null, status: "RIDER_ASSIGNED" })
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    if (o.partner_id) await supabase.from("delivery_partners").update({ is_busy: false }).eq("id", o.partner_id);
    await supabase.from("delivery_partners").update({ is_busy: true }).eq("id", partnerId);
    toast.success("Delivery partner changed.");
    void load();
  }

  async function cancel(o: Live) {
    if (!window.confirm(`Cancel order #${o.code}?`)) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: "CANCELLED", cancelled_by: "ADMIN", cancelled_at: new Date().toISOString(), cancel_reason: "Cancelled by support" })
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    if (o.partner_id) await supabase.from("delivery_partners").update({ is_busy: false }).eq("id", o.partner_id);
    toast.success("Order cancelled.");
    void load();
  }

  return (
    <section className="card-soft border border-border p-3">
      <p className="text-sm font-bold">Running orders</p>
      {rows.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No live orders right now.</p> : null}
      {rows.map((o) => (
        <div key={o.id} className="mt-2 rounded-xl border border-border p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">#{o.code} · {inr(Math.round(Number(o.grand_total)))}</p>
              <p className="text-[11px] text-muted-foreground">{o.customer_name} · {STATUS_LABEL[o.status] ?? o.status}</p>
            </div>
            <button onClick={() => cancel(o)} className="rounded-lg border border-destructive px-3 py-1 text-xs font-bold text-destructive">Cancel</button>
          </div>
          <select
            value=""
            onChange={(e) => reassign(o, e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold outline-none"
          >
            <option value="">Change delivery partner…</option>
            {riders.map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.is_online ? " · online" : ""}</option>
            ))}
          </select>
        </div>
      ))}
    </section>
  );
}

type Cust = { id: string; full_name: string | null; mobile: string | null; email: string | null; is_blocked: boolean };

export function CustomerManager() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Cust[]>([]);

  const load = async (term: string) => {
    let query = supabase.from("profiles").select("id,full_name,mobile,email,is_blocked").order("created_at", { ascending: false }).limit(25);
    if (term.trim()) query = query.or(`full_name.ilike.%${term}%,mobile.ilike.%${term}%,email.ilike.%${term}%`);
    const { data } = await query;
    setRows((data ?? []) as Cust[]);
  };
  useEffect(() => { void load(""); }, []);

  async function toggleBlock(c: Cust) {
    const { error } = await supabase.from("profiles").update({ is_blocked: !c.is_blocked }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_blocked: !c.is_blocked } : x)));
    toast.success(c.is_blocked ? "Account unblocked." : "Account blocked.");
  }

  return (
    <section className="card-soft border border-border p-3">
      <p className="text-sm font-bold">Customers</p>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); void load(e.target.value); }}
        placeholder="Search by name, mobile or email"
        className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {rows.map((c) => (
        <div key={c.id} className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{c.full_name ?? "Guest"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{c.mobile ?? c.email ?? "—"}</p>
          </div>
          <button
            onClick={() => toggleBlock(c)}
            className={`rounded-lg border px-3 py-1 text-xs font-bold ${c.is_blocked ? "border-primary text-primary" : "border-destructive text-destructive"}`}
          >
            {c.is_blocked ? "Unblock" : "Block"}
          </button>
        </div>
      ))}
      {rows.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No accounts found.</p> : null}
    </section>
  );
}
