import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { toast } from "sonner";

type Req = {
  id: string;
  amount: number;
  method: string;
  status: string;
  admin_note: string | null;
  payment_reference: string | null;
  created_at: string;
};

const EMPTY = { amount: "", method: "UPI", upi_id: "", bank_holder: "", bank_account_no: "", bank_ifsc: "" };

export function PayoutPanel({ party, id }: { party: "VENDOR" | "PARTNER"; id: string }) {
  const [balance, setBalance] = useState(0);
  const [earned, setEarned] = useState(0);
  const [rows, setRows] = useState<Req[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nextDate, setNextDate] = useState<string | null>(null);

  const load = async () => {
    const fn = party === "VENDOR" ? "vendor_balance" : "partner_balance";
    const args = party === "VENDOR" ? { _vendor_id: id } : { _partner_id: id };
    const [{ data: bal }, { data: led }, { data: reqs }] = await Promise.all([
      supabase.rpc(fn, args as never),
      supabase.from("payout_ledgers").select("amount,eligible_at").eq("party_type", party).eq(party === "VENDOR" ? "vendor_id" : "partner_id", id),
      supabase
        .from("payout_requests")
        .select("id,amount,method,status,admin_note,payment_reference,created_at")
        .eq(party === "VENDOR" ? "vendor_id" : "partner_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setBalance(Number(bal ?? 0));
    setEarned((led ?? []).reduce((a, r) => a + Number(r.amount), 0));
    const upcoming = (led ?? []).map((r) => r.eligible_at).filter((d): d is string => !!d && new Date(d as string) > new Date()).sort()[0];
    setNextDate(upcoming ?? null);
    setRows((reqs ?? []) as Req[]);
  };

  useEffect(() => {
    if (id) void load();
  }, [id, party]);

  async function submit() {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { toast.error("Enter the amount you want to withdraw."); return; }
    if (amount > balance) { toast.error("That is more than your available balance."); return; }
    if (form.method === "UPI" && !form.upi_id.includes("@")) { toast.error("Enter a valid UPI ID, like name@bank."); return; }
    if (form.method === "BANK" && (form.bank_account_no.length < 8 || form.bank_ifsc.length < 8))
      { toast.error("Enter the account number and IFSC code."); return; }
    setBusy(true);
    const args: Record<string, unknown> = { _party_type: party, _amount: amount, _method: form.method };
    if (form.bank_holder) args["_bank_holder"] = form.bank_holder;
    if (form.bank_account_no) args["_bank_account_no"] = form.bank_account_no;
    if (form.bank_ifsc) args["_bank_ifsc"] = form.bank_ifsc.toUpperCase();
    if (form.upi_id) args["_upi_id"] = form.upi_id;
    const { error } = await supabase.rpc("request_payout", args as never);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawal requested. You will be paid after admin approval.");
    setForm({ ...EMPTY });
    setOpen(false);
    void load();
  }

  return (
    <section className="card-soft space-y-3 border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Available to withdraw</p>
          <p className="text-2xl font-black text-primary">{inr(Math.round(balance))}</p>
          <p className="text-[11px] text-muted-foreground">Total earned {inr(Math.round(earned))}</p>
          <p className="text-[11px] text-muted-foreground">Automated T+3 rolling cycle{nextDate ? ` · next ${new Date(nextDate).toLocaleDateString("en-IN")}` : ""}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="press rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50"
          disabled={balance <= 0}
        >
          {open ? "Close" : "Withdraw"}
        </button>
      </div>

      {open ? (
        <div className="space-y-2 rounded-2xl bg-muted/60 p-3">
          <input
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })}
            placeholder="Amount (₹)"
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-card p-1">
            {(["UPI", "BANK"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setForm({ ...form, method: m })}
                className={`rounded-lg py-2 text-xs font-black ${form.method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {m === "UPI" ? "UPI" : "Bank account"}
              </button>
            ))}
          </div>
          {form.method === "UPI" ? (
            <input
              value={form.upi_id}
              onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
              placeholder="UPI ID (name@bank)"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          ) : (
            <>
              <input
                value={form.bank_holder}
                onChange={(e) => setForm({ ...form, bank_holder: e.target.value })}
                placeholder="Account holder name"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.bank_account_no}
                onChange={(e) => setForm({ ...form, bank_account_no: e.target.value.replace(/\D/g, "") })}
                placeholder="Account number"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.bank_ifsc}
                onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })}
                placeholder="IFSC code"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </>
          )}
          <button
            onClick={submit}
            disabled={busy}
            className="press w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Sending…" : "Request withdrawal"}
          </button>
        </div>
      ) : null}

      {rows.length ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-muted-foreground">Recent withdrawals</p>
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <div>
                <p className="text-sm font-bold">{inr(Math.round(Number(r.amount)))}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("en-IN")} · {r.method}
                  {r.payment_reference ? ` · ${r.payment_reference}` : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  r.status === "APPROVED"
                    ? "bg-primary text-primary-foreground"
                    : r.status === "REJECTED"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {r.status === "APPROVED" ? "PAID" : r.status}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
