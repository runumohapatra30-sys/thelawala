import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadSectionImage } from "@/lib/homeSections";
import { listFestivePhotos, MAX_FESTIVE_PHOTOS, type FestivePhoto } from "@/lib/festivePhotos";
import { FestivePhotoStrip } from "@/components/FestivePhotoStrip";

const HEIGHT_PRESETS = [
  { label: "Auto", value: null },
  { label: "Slim 120", value: 120 },
  { label: "Medium 180", value: 180 },
  { label: "Big 240", value: 240 },
  { label: "Hero 320", value: 320 },
];

/** Up to five home-screen festive photos: upload, drag to reorder, size, link and live switch. */
export function AdminFestivePhotos() {
  const [rows, setRows] = useState<FestivePhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);

  const load = () => listFestivePhotos(false).then(setRows);
  useEffect(() => { load(); }, []);

  async function upload(file: File) {
    if (rows.length >= MAX_FESTIVE_PHOTOS) { toast.error(`You can keep only ${MAX_FESTIVE_PHOTOS} photos.`); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Use a JPG, PNG or WebP picture."); return; }
    setBusy(true);
    const up = await uploadSectionImage(file);
    if ("error" in up) { setBusy(false); toast.error(up.error); return; }
    const { error } = await supabase.from("home_festive_photos").insert({
      image_url: up.url,
      display_order: rows.length + 1,
      is_active: true,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Photo added to the home screen strip.");
    load();
  }

  async function patch(id: string, values: Partial<FestivePhoto>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error } = await supabase.from("home_festive_photos").update(values).eq("id", id);
    if (error) { toast.error(error.message); load(); }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this photo?")) return;
    const { error } = await supabase.from("home_festive_photos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setRows(next);
    await Promise.all(
      next.map((r, i) => supabase.from("home_festive_photos").update({ display_order: i + 1 }).eq("id", r.id)),
    );
    toast.success("New photo order is live.");
  }

  const livePhotos = rows.filter((r) => r.is_active);

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">Festive photo strip (max {MAX_FESTIVE_PHOTOS})</p>
        <label className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground">
          {busy ? "Uploading…" : "+ Add photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }}
          />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Photos run one after another on the home screen. Drag a row to change the order. Set a fixed height or leave Auto to use the aspect ratio.
      </p>

      {rows.map((r, i) => (
        <div
          key={r.id}
          draggable
          onDragStart={() => setDrag(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (drag !== null) void reorder(drag, i); setDrag(null); }}
          className={`space-y-2 rounded-xl border p-2 ${drag === i ? "border-primary" : "border-border"}`}
        >
          <div className="flex items-center gap-2">
            <span className="cursor-grab text-muted-foreground">⋮⋮</span>
            <img src={r.image_url} alt="" className="h-12 w-20 rounded-lg object-cover" />
            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <button
                onClick={() => void patch(r.id, { size_mode: r.size_mode === "FULL" ? "COMPACT" : "FULL" })}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold"
              >
                {r.size_mode === "FULL" ? "Full ratio" : "Slim ratio"}
              </button>
              <button
                onClick={() => void patch(r.id, { is_active: !r.is_active })}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${r.is_active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {r.is_active ? "Live" : "Off"}
              </button>
              <button onClick={() => void remove(r.id)} className="rounded-full border border-destructive px-2.5 py-1 text-[11px] font-bold text-destructive">✕</button>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl bg-muted/50 p-2">
            <p className="text-[11px] font-bold text-muted-foreground">Height on home screen</p>
            <div className="flex flex-wrap gap-1.5">
              {HEIGHT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => void patch(r.id, { height_px: p.value })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    r.height_px === p.value
                      ? "border-primary bg-primary/10 text-primary"
                      : p.value === null && !r.height_px
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={80}
                max={400}
                step={10}
                value={r.height_px ?? 180}
                onChange={(e) => void patch(r.id, { height_px: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
              />
              <span className="w-16 shrink-0 text-right text-[11px] font-black tabular-nums">
                {r.height_px ? `${r.height_px}px` : "Auto"}
              </span>
            </div>
          </div>

          <input
            value={r.link_url ?? ""}
            onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, link_url: e.target.value } : x)))}
            onBlur={(e) => void patch(r.id, { link_url: e.target.value.trim() || null })}
            placeholder="Opens on tap (e.g. /categories or https://…)"
            className="w-full rounded-xl border border-border px-3 py-2 text-[12px] outline-none focus:border-primary"
          />
        </div>
      ))}

      {rows.length === 0 ? <p className="text-xs text-muted-foreground">No festive photos yet.</p> : null}

      {livePhotos.length > 0 ? (
        <div className="rounded-2xl border border-border bg-background py-3">
          <p className="px-5 pb-2 text-[11px] font-bold text-muted-foreground">Live preview</p>
          <FestivePhotoStrip photos={livePhotos} />
        </div>
      ) : null}
    </section>
  );
}
