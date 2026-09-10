import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadBannerImage } from "@/lib/marketing";
import { refreshDynamicAsset } from "@/lib/ai.functions";

const inputCls = "w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary";

type Asset = {
  id: string;
  title: string;
  subtitle: string | null;
  banner_image_url: string;
  lottie_url: string | null;
  time_slots: string[];
  weather_tags: string[];
  is_enabled: boolean;
  is_active: boolean;
  ai_reason: string | null;
};

const SLOTS = ["MORNING", "AFTERNOON", "EVENING", "LATE_NIGHT"];
const WEATHER = ["CLEAR", "CLOUDY", "RAIN", "HOT", "COLD", "FOG"];
const COLS = "id,title,subtitle,banner_image_url,lottie_url,time_slots,weather_tags,is_enabled,is_active,ai_reason";

/** Admin panel for the AI-chosen time & weather banners. */
export function SmartAssetManager() {
  const [rows, setRows] = useState<Asset[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [lottie, setLottie] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("app_dynamic_assets").select(COLS).order("created_at");
    setRows((data ?? []) as Asset[]);
  }
  useEffect(() => {
    void load();
  }, []);

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function save() {
    if (!title.trim() || !file) {
      toast.error("Add a title and a banner picture.");
      return;
    }
    setBusy(true);
    const up = await uploadBannerImage(file);
    if ("error" in up) {
      setBusy(false);
      toast.error(up.error);
      return;
    }
    const { error } = await supabase.from("app_dynamic_assets").insert({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      banner_image_url: up.url,
      lottie_url: lottie.trim() || null,
      time_slots: slots,
      weather_tags: tags,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    setSubtitle("");
    setLottie("");
    setSlots([]);
    setTags([]);
    setFile(null);
    toast.success("Smart banner added.");
    void load();
  }

  async function runAi() {
    setBusy(true);
    try {
      await refreshDynamicAsset();
      toast.success("AI picked the best banner for right now.");
    } catch {
      toast.error("Could not run the AI pick.");
    }
    setBusy(false);
    void load();
  }

  return (
    <div className="portal-panel space-y-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="section-title">AI smart banners (time &amp; weather)</p>
        <button onClick={runAi} disabled={busy} className="press rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground disabled:opacity-60">
          Run AI now
        </button>
      </div>

      <input className={inputCls} placeholder="Title (e.g. Rainy evening pakoda)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className={inputCls} placeholder="Subtitle (optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      <input className={inputCls} placeholder="Animation image / Lottie preview URL (optional)" value={lottie} onChange={(e) => setLottie(e.target.value)} />
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls} />

      <div className="flex flex-wrap gap-1.5">
        {SLOTS.map((s) => (
          <button key={s} onClick={() => toggle(slots, setSlots, s)} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${slots.includes(s) ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            {s.replace("_", " ").toLowerCase()}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {WEATHER.map((w) => (
          <button key={w} onClick={() => toggle(tags, setTags, w)} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${tags.includes(w) ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            {w.toLowerCase()}
          </button>
        ))}
      </div>

      <button onClick={save} disabled={busy} className="press w-full rounded-xl bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60">
        {busy ? "Saving…" : "Add smart banner"}
      </button>

      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
            <img src={a.banner_image_url} alt="" className="h-10 w-16 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">
                {a.title} {a.is_active ? <span className="text-primary">· live now</span> : null}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {(a.time_slots ?? []).join("/") || "any time"} · {(a.weather_tags ?? []).join("/") || "any weather"}
                {a.ai_reason ? ` · ${a.ai_reason}` : ""}
              </p>
            </div>
            <button
              onClick={async () => {
                await supabase.from("app_dynamic_assets").update({ is_active: false }).neq("id", a.id);
                await supabase
                  .from("app_dynamic_assets")
                  .update({ is_active: true, is_enabled: true, activated_at: new Date().toISOString(), ai_reason: "Chosen by admin" })
                  .eq("id", a.id);
                toast.success("This banner is live now.");
                void load();
              }}
              className="rounded-full border border-primary px-2 py-1 text-[10px] font-black text-primary"
            >
              Show now
            </button>
            <button
              onClick={async () => {
                await supabase.from("app_dynamic_assets").update({ is_enabled: !a.is_enabled }).eq("id", a.id);
                void load();
              }}
              className="rounded-full border border-border px-2 py-1 text-[10px] font-black"
            >
              {a.is_enabled ? "ON" : "OFF"}
            </button>
            <button
              onClick={async () => {
                await supabase.from("app_dynamic_assets").delete().eq("id", a.id);
                void load();
              }}
              className="rounded-full border border-destructive px-2 py-1 text-[10px] font-black text-destructive"
            >
              Delete
            </button>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-[11px] text-muted-foreground">No smart banners yet.</p> : null}
      </div>
    </div>
  );
}
