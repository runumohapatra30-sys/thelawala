import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, HardDrive, Store, Bike, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LIMIT_MB = 1024;
const WATCHED = ["banners", "dish-photos"];

type Usage = { bucket_id: string; bytes: number; files: number };

export function SystemHealthCard() {
  const [usage, setUsage] = useState<Usage[]>([]);
  const [stalls, setStalls] = useState(0);
  const [riders, setRiders] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: use, error }, { count: sc }, { count: rc }] = await Promise.all([
      supabase.rpc("admin_storage_usage"),
      supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
      supabase.from("delivery_partners").select("id", { count: "exact", head: true }).eq("is_online", true),
    ]);
    if (error) console.error("Storage usage error:", error);
    setUsage(((use ?? []) as Usage[]).map((u) => ({ ...u, bytes: Number(u.bytes), files: Number(u.files) })));
    setStalls(sc ?? 0);
    setRiders(rc ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const watched = usage.filter((u) => WATCHED.includes(u.bucket_id));
  const usedBytes = watched.reduce((a, u) => a + u.bytes, 0);
  const usedMb = usedBytes / (1024 * 1024);
  const pct = Math.min(100, (usedMb / LIMIT_MB) * 100);
  const critical = pct >= 85;

  async function cleanOldBanners() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_unused_banner_objects");
      if (error) throw error;
      const paths = ((data ?? []) as { path: string }[]).map((r) => r.path);
      if (!paths.length) { toast.info("No old banner files to clean."); return; }
      const { error: rmErr } = await supabase.storage.from("banners").remove(paths);
      if (rmErr) throw rmErr;
      toast.success(`Removed ${paths.length} unused banner file${paths.length > 1 ? "s" : ""}.`);
      await load();
    } catch (e) {
      console.error("Banner cleanup error:", e);
      toast.error(`Cleanup failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-soft space-y-3 border border-border p-3">
      <div className="flex items-center justify-between">
        <h3 className="section-title flex items-center gap-2">
          <HardDrive className="h-4 w-4" /> System health
        </h3>
        <button onClick={load} className="rounded-lg border border-border p-1.5 text-muted-foreground" aria-label="Refresh system health">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[12px] font-semibold">
          <span className={critical ? "flex items-center gap-1 text-destructive" : "text-muted-foreground"}>
            {critical ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
            Photo & banner storage
          </span>
          <span className={critical ? "text-destructive" : "text-foreground"}>
            {usedMb.toFixed(1)} MB / {LIMIT_MB} MB
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${critical ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {watched.map((u) => `${u.bucket_id}: ${(u.bytes / 1048576).toFixed(1)} MB (${u.files} files)`).join(" · ") || "No files stored yet"}
        </p>
      </div>

      {critical ? (
        <button
          onClick={cleanOldBanners}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-3 py-2.5 text-sm font-bold text-destructive-foreground disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" /> {busy ? "Cleaning…" : "Clean old banners"}
        </button>
      ) : (
        <button
          onClick={cleanOldBanners}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-muted-foreground disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" /> {busy ? "Cleaning…" : "Clean old banners"}
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="stat-tile">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Store className="h-3.5 w-3.5" /> Active stalls</span>
          <strong className="text-lg">{stalls}</strong>
        </div>
        <div className="stat-tile">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Bike className="h-3.5 w-3.5" /> Online riders</span>
          <strong className="text-lg">{riders}</strong>
        </div>
      </div>
    </section>
  );
}
