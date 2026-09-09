import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Shift = { id: string; shift_date: string; start_time: string; end_time: string; zone: string | null; status: string };

/** Duty roster: the rider plans which hours and zone they will work. */
export function RiderShifts({ partnerId }: { partnerId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<Shift[]>([]);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [zone, setZone] = useState("");

  async function load() {
    const { data } = await supabase
      .from("rider_shifts")
      .select("id,shift_date,start_time,end_time,zone,status")
      .eq("partner_id", partnerId)
      .gte("shift_date", today)
      .order("shift_date")
      .order("start_time");
    setRows((data ?? []) as Shift[]);
  }

  useEffect(() => {
    void load();
  }, [partnerId]);

  async function add() {
    const { error } = await supabase.from("rider_shifts").insert({
      partner_id: partnerId,
      shift_date: date,
      start_time: start,
      end_time: end,
      zone: zone || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setZone("");
    toast.success("Shift added");
    await load();
  }

  async function setStatus(id: string, status: string) {
    await supabase.from("rider_shifts").update({ status }).eq("id", id);
    await load();
  }

  async function remove(id: string) {
    await supabase.from("rider_shifts").delete().eq("id", id);
    await load();
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">My duty shifts</p>
      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-border px-2 py-2 text-xs outline-none focus:border-primary" />
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-xl border border-border px-2 py-2 text-xs outline-none focus:border-primary" />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-xl border border-border px-2 py-2 text-xs outline-none focus:border-primary" />
      </div>
      <input
        value={zone}
        onChange={(e) => setZone(e.target.value)}
        placeholder="Zone (e.g. Khandagiri)"
        className="w-full rounded-xl border border-border px-3 py-2 text-xs outline-none focus:border-primary"
      />
      <button onClick={() => void add()} className="press w-full rounded-xl bg-primary py-2.5 text-sm font-black text-primary-foreground">
        Add shift
      </button>

      <div className="space-y-2 pt-1">
        {rows.length === 0 ? <p className="text-[11px] text-muted-foreground">No shifts planned yet.</p> : null}
        {rows.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-2xl border border-border p-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black">
                {s.shift_date} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {s.zone ?? "Any zone"} · {s.status}
              </p>
            </div>
            {s.status === "PLANNED" ? (
              <button onClick={() => void setStatus(s.id, "ACTIVE")} className="press rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-primary-foreground">
                Start
              </button>
            ) : null}
            {s.status === "ACTIVE" ? (
              <button onClick={() => void setStatus(s.id, "DONE")} className="press rounded-full border border-primary px-2.5 py-1 text-[10px] font-black text-primary">
                End
              </button>
            ) : null}
            <button onClick={() => void remove(s.id)} aria-label="Delete shift" className="press rounded-full border border-destructive px-2.5 py-1 text-[10px] font-black text-destructive">
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
