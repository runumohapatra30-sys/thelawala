import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { toast } from "sonner";

type Row = {
  id: string; partner_id: string; amount: number; method: string; status: string;
  transaction_ref: string | null; proof_image_url: string | null; created_at: string;
};

async function signed(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from("kyc-docs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Admin finance screen: check cash that delivery partners have sent back. */
export function CashRemittances() {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [otp, setOtp] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    let q = supabase
      .from("cash_deposits")
      .select("id,partner_id,amount,method,status,transaction_ref,proof_image_url,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!showAll) q = q.eq("status", "PENDING");
    const [{ data }, { data: partners }] = await Promise.all([
      q,
      supabase.from("delivery_partners").select("id,name,mobile"),
    ]);
    const list = (data ?? []) as Row[];
    setRows(list);
    const map: Record<string, string> = {};
    (partners ?? []).forEach((p) => (map[p.id] = `${p.name}${p.mobile ? ` · ${p.mobile}` : ""}`));
    setNames(map);
    const urls: Record<string, string> = {};
    await Promise.all(list.map(async (r) => {
      const u = await signed(r.proof_image_url);
      if (u) urls[r.id] = u;
    }));
    setProofs(urls);
  };

  useEffect(() => { void load(); }, [showAll]);

  async function decide(r: Row, approve: boolean) {
    const note = approve ? null : window.prompt("Why are you rejecting this deposit?") ?? "";
    setBusy(r.id);
    const { error } = await supabase.rpc("decide_cash_deposit", {
      _deposit_id: r.id,
      _approve: approve,
      ...(otp[r.id] ? { _otp: otp[r.id]! } : {}),
      ...(note ? { _note: note } : {}),
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Cash cleared from the partner's balance." : "Deposit rejected.");
    void load();
  }

  return (
    <section className="card-soft border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Cash remittances</p>
        <button onClick={() => setShowAll((v) => !v)} className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          {showAll ? "Pending only" : "Show all"}
        </button>
      </div>
      {rows.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">Nothing pending.</p> : null}

      {rows.map((r) => (
        <div key={r.id} className="mt-2 rounded-xl border border-border p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black">{inr(Math.round(Number(r.amount)))} · {r.method === "ONLINE_UPI" ? "UPI" : "Handover"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{names[r.partner_id] ?? "Delivery partner"}</p>
              {r.transaction_ref ? <p className="truncate text-[11px] font-semibold">UTR {r.transaction_ref}</p> : null}
              <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            {proofs[r.id] ? (
              <button onClick={() => setZoom(proofs[r.id]!)} className="press shrink-0">
                <img src={proofs[r.id]} alt="Payment proof" loading="lazy" className="h-16 w-16 rounded-lg border border-border object-cover" />
              </button>
            ) : null}
          </div>

          {r.status === "PENDING" ? (
            <>
              {r.method === "OFFLINE_HANDOVER" ? (
                <input
                  value={otp[r.id] ?? ""}
                  onChange={(e) => setOtp({ ...otp, [r.id]: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  inputMode="numeric"
                  placeholder="Enter rider's 4-digit handover PIN"
                  className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm tracking-[0.3em] outline-none focus:border-primary"
                />
              ) : null}
              <div className="mt-2 flex gap-2">
                <button
                  disabled={busy === r.id}
                  onClick={() => decide(r, true)}
                  className="press flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white disabled:opacity-50"
                >
                  Verify &amp; clear balance
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => decide(r, false)}
                  className="press flex-1 rounded-xl border border-destructive py-2.5 text-xs font-black text-destructive disabled:opacity-50"
                >
                  Reject with note
                </button>
              </div>
            </>
          ) : (
            <p className={`mt-2 text-[11px] font-black ${r.status === "VERIFIED" ? "text-primary" : "text-destructive"}`}>{r.status}</p>
          )}
        </div>
      ))}

      {zoom ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-3" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Payment proof" className="max-h-full max-w-full object-contain" />
        </div>
      ) : null}
    </section>
  );
}
