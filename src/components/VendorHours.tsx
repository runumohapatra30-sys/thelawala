import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Stall opening hours and default cooking time. */
export function VendorHours({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState("07:00");
  const [close, setClose] = useState("22:00");
  const [prep, setPrep] = useState(10);
  const [isOpen, setIsOpen] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("vendors")
      .select("open_time,close_time,default_prep_minutes,is_open")
      .eq("id", vendorId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setOpen(String(data.open_time).slice(0, 5));
        setClose(String(data.close_time).slice(0, 5));
        setPrep(Number(data.default_prep_minutes ?? 10));
        setIsOpen(Boolean(data.is_open));
      });
  }, [vendorId]);

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("vendors")
      .update({ open_time: open, close_time: close, default_prep_minutes: prep, is_open: isOpen })
      .eq("id", vendorId);
    setBusy(false);
    toast[error ? "error" : "success"](error ? error.message : "Timings saved");
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">Shop timing &amp; cooking time</p>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-black ${isOpen ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
      >
        Stall is {isOpen ? "OPEN" : "CLOSED"}
        <span>{isOpen ? "ON" : "OFF"}</span>
      </button>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Opens at</span>
          <input type="time" value={open} onChange={(e) => setOpen(e.target.value)} className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Closes at</span>
          <input type="time" value={close} onChange={(e) => setClose(e.target.value)} className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Usual cooking time (minutes)</span>
        <input type="number" min={1} max={120} value={prep} onChange={(e) => setPrep(Number(e.target.value))} className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
      </label>
      <button onClick={() => void save()} disabled={busy} className="press w-full rounded-xl bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50">
        {busy ? "Saving…" : "Save timings"}
      </button>
    </section>
  );
}

/** Countdown shown on an accepted order while the food is being cooked. */
export function PrepCountdown({ readyAt }: { readyAt: string | null | undefined }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!readyAt) return null;
  const left = Math.max(0, Math.round((new Date(readyAt).getTime() - now) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${left === 0 ? "bg-destructive text-white" : "bg-primary text-primary-foreground"}`}>
      {left === 0 ? "Time up · hand over" : `Ready in ${mm}:${ss}`}
    </span>
  );
}
