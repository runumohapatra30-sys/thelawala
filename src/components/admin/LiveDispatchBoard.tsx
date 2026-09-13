import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr, STATUS_LABEL } from "@/lib/fees";
import { toast } from "sonner";

type LiveOrder = {
  id: string;
  code: string;
  status: string;
  grand_total: number;
  partner_id: string | null;
  offered_to: string | null;
  customer_name: string;
  created_at: string;
};

type Rider = { id: string; name: string; is_online: boolean; is_busy: boolean };

const LIVE = ["ORDER_PLACED", "PREPARING", "READY_FOR_PICKUP", "SEARCHING_RIDER", "RIDER_ASSIGNED", "OUT_FOR_DELIVERY"];

const AUTO_CANCEL_MIN = 30;

const minutesSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

/** Admin control room: how long each running order is taking and who is carrying it. */
export function LiveDispatchBoard() {
  const [rows, setRows] = useState<LiveOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [, setTick] = useState(0);

  async function load() {
    // Keeps offers moving to the next partner and closes orders nobody picked up.
    await supabase.rpc("sweep_dispatch");
    const [{ data }, { data: rs }] = await Promise.all([
      supabase
        .from("orders")
        .select("id,code,status,grand_total,partner_id,offered_to,customer_name,created_at")
        .in("status", LIVE)
        .order("created_at", { ascending: true }),
      supabase.from("delivery_partners").select("id,name,is_online,is_busy").eq("status", "APPROVED"),
    ]);
    setRows((data ?? []) as LiveOrder[]);
    setRiders((rs ?? []) as Rider[]);
  }

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 10000);
    const clock = setInterval(() => setTick((t) => t + 1), 15000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  async function assign(orderId: string, partnerId: string) {
    if (!partnerId) return;
    setBusy(orderId);
    const { error } = await supabase.rpc("admin_assign_partner", { _order_id: orderId, _partner_id: partnerId });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Delivery partner assigned.");
    void load();
  }

  const waiting = rows.filter((o) => !o.partner_id);
  const late = waiting.filter((o) => minutesSince(o.created_at) >= 10);
  const onlineRiders = riders.filter((r) => r.is_online && !r.is_busy);

  return (
    <section className="card-soft space-y-3 border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Live dashboard</p>
        <button onClick={() => void load()} className="rounded-lg border border-border px-2.5 py-1 text-[10px] font-black text-muted-foreground">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Running" value={String(rows.length)} />
        <Tile label="Waiting for a partner" value={String(waiting.length)} tone={waiting.length ? "warn" : undefined} />
        <Tile label="Free partners" value={String(onlineRiders.length)} tone={onlineRiders.length ? undefined : "warn"} />
      </div>

      {late.length ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[11px] font-bold text-destructive">
          {late.length} order{late.length > 1 ? "s are" : " is"} taking too long. Pick a delivery partner by hand below.
          Anything still unassigned after {AUTO_CANCEL_MIN} minutes is cancelled automatically.
        </p>
      ) : null}

      {rows.length === 0 ? <p className="text-xs text-muted-foreground">No running orders right now.</p> : null}

      {rows.map((o) => {
        const mins = minutesSince(o.created_at);
        const searching = !o.partner_id;
        const leftToCancel = Math.max(0, AUTO_CANCEL_MIN - mins);
        return (
          <div key={o.id} className={`rounded-xl border p-2.5 ${searching && mins >= 10 ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">
                  #{o.code} · {inr(Math.round(Number(o.grand_total)))}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {o.customer_name} · {STATUS_LABEL[o.status] ?? o.status}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-black ${mins >= 20 ? "text-destructive" : mins >= 10 ? "text-primary" : ""}`}>{mins} min</p>
                <p className="text-[10px] font-semibold text-muted-foreground">since order</p>
              </div>
            </div>

            <p className="mt-1 text-[11px] font-bold">
              {o.partner_id ? (
                <span className="text-primary">Partner: {riders.find((r) => r.id === o.partner_id)?.name ?? "Assigned"}</span>
              ) : o.offered_to ? (
                <span className="text-muted-foreground">
                  Ringing {riders.find((r) => r.id === o.offered_to)?.name ?? "a partner"}… auto-cancel in {leftToCancel} min
                </span>
              ) : (
                <span className="text-destructive">Searching for a delivery partner… auto-cancel in {leftToCancel} min</span>
              )}
            </p>

            {searching ? (
              <select
                disabled={busy === o.id}
                value=""
                onChange={(e) => void assign(o.id, e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold outline-none disabled:opacity-50"
              >
                <option value="">Give this order to…</option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.is_online ? " · online" : " · offline"}
                    {r.is_busy ? " · busy" : ""}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className={`rounded-xl border p-2 text-center ${tone === "warn" ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
      <p className="text-base font-black">{value}</p>
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
