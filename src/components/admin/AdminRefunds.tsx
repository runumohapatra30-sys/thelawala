import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { REFUND_LABEL } from "@/lib/settlement";
import { toast } from "sonner";

type Req = {
  id: string; amount: number; reason: string | null; method: string; status: string;
  admin_response: string | null; created_at: string; order_id: string;
};

const NEXT: Record<string, string[]> = {
  PENDING: ["UNDER_REVIEW", "REJECTED"],
  REQUESTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED"],
};

export function AdminRefunds() {
  const [rows, setRows] = useState<Req[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [reply, setReply] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  async function load() {
    let q = supabase
      .from("refund_requests")
      .select("id,amount,reason,method,status,admin_response,created_at,order_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!showDone) q = q.not("status", "in", '("COMPLETED","REJECTED")');
    const { data } = await q;
    const list = (data ?? []) as Req[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.order_id))];
    if (ids.length) {
      const { data: os } = await supabase.from("orders").select("id,code").in("id", ids);
      const m: Record<string, string> = {};
      (os ?? []).forEach((o) => (m[o.id] = o.code));
      setCodes(m);
    }
  }

  useEffect(() => { void load(); }, [showDone]);

  async function advance(r: Req, status: string) {
    setBusy(r.id);
    const args: Record<string, unknown> = { _request_id: r.id, _status: status };
    if (reply[r.id]) args["_response"] = reply[r.id];
    const { error } = await supabase.rpc("advance_refund", args as never);

    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Refund marked as ${REFUND_LABEL[status] ?? status}.`);
    void load();
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowDone((v) => !v)}
        className="rounded-full border border-border px-3 py-1 text-[11px] font-bold text-muted-foreground"
      >
        {showDone ? "Show only open requests" : "Show finished requests too"}
      </button>

      {rows.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No refund requests.</p> : null}

      {rows.map((r) => (
        <div key={r.id} className="card-soft space-y-2 border border-border p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold">{inr(Math.round(Number(r.amount)))} · #{codes[r.order_id] ?? "—"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{r.reason ?? "No reason given"} · {r.method === "WALLET" ? "To wallet" : "To bank"}</p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
              {REFUND_LABEL[r.status] ?? r.status}
            </span>
          </div>

          {r.admin_response ? <p className="rounded-lg bg-muted px-2 py-1 text-[11px]">Your reply: {r.admin_response}</p> : null}

          {NEXT[r.status]?.length ? (
            <>
              <input
                value={reply[r.id] ?? ""}
                onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })}
                placeholder="Message for the customer (optional)"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="flex flex-wrap gap-2">
                {NEXT[r.status]!.map((s) => (
                  <button
                    key={s}
                    disabled={busy === r.id}
                    onClick={() => advance(r, s)}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold disabled:opacity-50 ${s === "REJECTED" ? "border-destructive text-destructive" : "border-primary text-primary"}`}
                  >
                    {REFUND_LABEL[s] ?? s}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
