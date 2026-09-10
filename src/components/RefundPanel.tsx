import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { REFUND_FLOW, REFUND_LABEL } from "@/lib/settlement";
import { toast } from "sonner";

type Req = { id: string; amount: number; status: string; admin_response: string | null; created_at: string; reason: string | null };

const REASONS = ["Order was cancelled", "Food not delivered", "Wrong or missing items", "Charged twice", "Other reason"];

/** Customer-facing refund request + progress tracker for a prepaid order. */
export function RefundPanel({ orderId, amount }: { orderId: string; amount: number }) {
  const [req, setReq] = useState<Req | null>(null);
  const [reason, setReason] = useState(REASONS[0]!);
  const [busy, setBusy] = useState(false);

  const load = () =>
    supabase
      .from("refund_requests")
      .select("id,amount,status,admin_response,created_at,reason")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setReq((data ?? null) as Req | null));

  useEffect(() => { void load(); }, [orderId]);

  async function raise() {
    setBusy(true);
    const { error } = await supabase.rpc("request_refund", {
      _order_id: orderId,
      _amount: amount,
      _reason: reason,
      _method: "WALLET",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Refund requested. You can track it here.");
    void load();
  }

  if (req) {
    const rejected = req.status === "REJECTED";
    const stepIndex = REFUND_FLOW.indexOf(req.status === "PENDING" ? "REQUESTED" : (req.status as (typeof REFUND_FLOW)[number]));
    return (
      <div className="card-soft space-y-2 border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Refund of {inr(Math.round(Number(req.amount)))}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${rejected ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            {REFUND_LABEL[req.status] ?? req.status}
          </span>
        </div>

        {rejected ? null : (
          <ol className="space-y-1.5">
            {REFUND_FLOW.map((s, i) => {
              const done = stepIndex >= i;
              return (
                <li key={s} className="flex items-center gap-2 text-[11px]">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${done ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <span className={done ? "font-bold" : "text-muted-foreground"}>{REFUND_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>
        )}

        {req.admin_response ? (
          <p className="rounded-lg bg-muted px-2 py-1.5 text-[11px]">ThelaWala Care: {req.admin_response}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">Raised on {new Date(req.created_at).toLocaleString("en-IN")}</p>
      </div>
    );
  }

  return (
    <div className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">Request a refund</p>
      <p className="text-[11px] text-muted-foreground">
        This order was paid online. Tell us what went wrong and we will return {inr(Math.round(amount))} to your ThelaWala wallet.
      </p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <button
        disabled={busy}
        onClick={raise}
        className="press w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Sending…" : "Request refund"}
      </button>
    </div>
  );
}
