import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadKycDoc } from "@/lib/kyc";
import { inr } from "@/lib/fees";
import { toast } from "sonner";

/** UPI id that collects cash-on-delivery money back from delivery partners. */
export const PLATFORM_UPI = "thelawala@ybl";
export const PLATFORM_UPI_NAME = "ThelaWala";

type Deposit = {
  id: string; amount: number; method: string; status: string;
  transaction_ref: string | null; verification_otp: string | null;
  admin_note: string | null; created_at: string;
};

function pin4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Rider screen: how much collected cash is still to be handed back, and how to hand it back. */
export function CashSettlement({ partnerId, userId }: { partnerId: string; userId: string }) {
  const [cash, setCash] = useState(0);
  const [rows, setRows] = useState<Deposit[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ONLINE_UPI" | "OFFLINE_HANDOVER">("ONLINE_UPI");
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: bal }, { data: list }] = await Promise.all([
      supabase.rpc("rider_cash_in_hand", { _partner_id: partnerId }),
      supabase
        .from("cash_deposits")
        .select("id,amount,method,status,transaction_ref,verification_otp,admin_note,created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setCash(Number(bal ?? 0));
    setRows((list ?? []) as Deposit[]);
  };

  useEffect(() => { void load(); }, [partnerId]);

  const pending = rows.find((r) => r.status === "PENDING" && r.method === "OFFLINE_HANDOVER");

  const upiLink = `upi://pay?pa=${PLATFORM_UPI}&pn=${encodeURIComponent(PLATFORM_UPI_NAME)}&am=${Number(amount || cash) || 0}&cu=INR&tn=${encodeURIComponent("COD cash deposit")}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

  async function submit() {
    const amt = Number(amount || cash);
    if (!amt || amt <= 0) { toast.error("Enter the amount you are depositing."); return; }
    if (amt > cash + 0.5) { toast.error(`You only have ${inr(Math.round(cash))} to deposit.`); return; }
    if (tab === "ONLINE_UPI" && !ref.trim()) { toast.error("Enter the UPI reference / UTR number."); return; }
    setBusy(true);
    try {
      let proof: string | null = null;
      if (file) proof = await uploadKycDoc(userId, file, "cash-proof");
      const otp = tab === "OFFLINE_HANDOVER" ? pin4() : null;
      const { error } = await supabase.from("cash_deposits").insert({
        partner_id: partnerId,
        amount: amt,
        method: tab,
        transaction_ref: tab === "ONLINE_UPI" ? ref.trim() : null,
        proof_image_url: proof,
        verification_otp: otp,
        status: "PENDING",
      });
      if (error) throw error;
      toast.success(otp ? `Show PIN ${otp} to the admin at handover.` : "Deposit sent for checking.");
      setOpen(false);
      setAmount(""); setRef(""); setFile(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the deposit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Cash in hand (to deposit)</p>
          <p className="text-xl font-black text-primary">{inr(Math.round(cash))}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={cash <= 0}
          className="press rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-40"
        >
          {open ? "Close" : "Deposit cash"}
        </button>
      </div>

      {pending ? (
        <div className="rounded-2xl bg-brand-soft px-3 py-2">
          <p className="text-[11px] font-bold">Handover PIN for {inr(Math.round(Number(pending.amount)))}</p>
          <p className="text-2xl font-black tracking-[0.3em]">{pending.verification_otp}</p>
          <p className="text-[11px] text-muted-foreground">Give the cash to the admin and tell them this PIN.</p>
        </div>
      ) : null}

      {open ? (
        <div className="space-y-2 rounded-2xl border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            {([["ONLINE_UPI", "Pay by UPI"], ["OFFLINE_HANDOVER", "Hand over cash"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-xl border px-2 py-2 text-xs font-black ${tab === k ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Amount</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(Math.round(cash))}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          {tab === "ONLINE_UPI" ? (
            <>
              <div className="grid place-items-center rounded-2xl bg-muted p-3">
                <img src={qr} alt="UPI QR code" width={220} height={220} loading="lazy" className="h-40 w-40 rounded-xl bg-white p-1" />
                <p className="mt-1 text-[11px] font-bold">{PLATFORM_UPI}</p>
                <a href={upiLink} className="press mt-2 rounded-xl border border-primary px-3 py-1.5 text-xs font-black text-primary">
                  Open UPI app
                </a>
              </div>
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                maxLength={40}
                placeholder="UPI reference / UTR number"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Payment screenshot (optional)</span>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-xs" />
              </label>
            </>
          ) : (
            <p className="rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">
              A 4-digit handover PIN will be made. Give the cash to the admin and tell them the PIN — your balance clears the moment they enter it.
            </p>
          )}

          <button onClick={submit} disabled={busy} className="press w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-50">
            {busy ? "Sending…" : tab === "ONLINE_UPI" ? "Submit deposit" : "Get handover PIN"}
          </button>
        </div>
      ) : null}

      {rows.length ? (
        <div className="pt-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Recent deposits</p>
          {rows.map((r) => (
            <div key={r.id} className="mt-1.5 flex items-center justify-between gap-2 border-t border-border pt-1.5">
              <div className="min-w-0">
                <p className="text-sm font-bold">{inr(Math.round(Number(r.amount)))} · {r.method === "ONLINE_UPI" ? "UPI" : "Handover"}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()} {r.admin_note ? `· ${r.admin_note}` : r.transaction_ref ? `· ${r.transaction_ref}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                r.status === "VERIFIED" ? "bg-primary/10 text-primary" : r.status === "REJECTED" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
              }`}>{r.status}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
