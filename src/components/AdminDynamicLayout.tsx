import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listHomeSections,
  uploadSectionImage,
  type GridCard,
  type HomeSection,
  type SectionType,
} from "@/lib/homeSections";
import { FestiveSections, type PickItem } from "@/components/FestiveSections";
import { AdminFestivePhotos } from "@/components/AdminFestivePhotos";
import {
  BRAND_YELLOW,
  THEME_PRESETS,
  THEME_TOKENS,
  activeThemeColor,
  loadThemeConfig,
  themeStyle,
  type ThemeConfig,
} from "@/lib/appTheme";

const inputCls =
  "w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary";

const blankCard = (): GridCard => ({ title: "", image_url: "", filter: "", tag: "" });

const blankSection = (type: SectionType): HomeSection => ({
  id: "",
  section_type: type,
  title: type === "FESTIVE_GRID_4" ? "Celebrate Ganesh Chaturthi" : "Festive Picks",
  subtitle: "",
  bg_color: type === "FESTIVE_GRID_4" ? "#FFE7A8" : "#FDECEF",
  bg_image_url: "",
  cards: [blankCard(), blankCard(), blankCard(), blankCard()],
  item_ids: [],
  is_active: false,
  display_order: 1,
});

export function AdminDynamicLayout() {
  return (
    <div className="space-y-3">
      <ThemeController />
      <AdminFestivePhotos />
      <SectionStudio />
    </div>
  );
}

/* ---------------- Festive section studio ---------------- */

function SectionStudio() {
  const [rows, setRows] = useState<HomeSection[]>([]);
  const [items, setItems] = useState<PickItem[]>([]);
  const [editing, setEditing] = useState<HomeSection | null>(null);
  const [preview, setPreview] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => listHomeSections(false).then(setRows);

  useEffect(() => {
    load();
    supabase
      .from("menu_items")
      .select("id,name,photo_url,price,mrp,in_stock")
      .order("name")
      .then(({ data }) => setItems((data ?? []) as PickItem[]));
  }, []);

  async function pickImage(file: File, apply: (url: string) => void) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Use a JPG, PNG or WebP picture."); return; }
    const up = await uploadSectionImage(file);
    if ("error" in up) { toast.error(up.error); return; }
    apply(up.url);
  }

  async function save(publish: boolean) {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Give the section a title."); return; }
    setBusy(true);
    const payload = {
      section_type: editing.section_type,
      title: editing.title.trim(),
      subtitle: editing.subtitle || null,
      bg_color: editing.bg_color || null,
      bg_image_url: editing.bg_image_url || null,
      cards: editing.cards.filter((c) => c.title || c.image_url),
      item_ids: editing.item_ids,
      is_active: publish,
      display_order: Number(editing.display_order) || 1,
    };
    const { error } = editing.id
      ? await supabase.from("home_dynamic_sections").update(payload).eq("id", editing.id)
      : await supabase.from("home_dynamic_sections").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(publish ? "Section is live on the home screen." : "Section saved as draft.");
    setEditing(null);
    load();
  }

  async function setLive(s: HomeSection, live: boolean) {
    const { error } = await supabase.from("home_dynamic_sections").update({ is_active: live }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: live } : x)));
  }

  async function remove(s: HomeSection) {
    if (!window.confirm("Delete this section?")) return;
    const { error } = await supabase.from("home_dynamic_sections").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev.filter((x) => x.id !== s.id));
  }

  const upCard = (n: number, patch: Partial<GridCard>) =>
    setEditing((e) => (e ? { ...e, cards: e.cards.map((c, i) => (i === n ? { ...c, ...patch } : c)) } : e));

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">Festive section studio</p>
        <div className="flex gap-1.5">
          <button
            onClick={() => setEditing(blankSection("FESTIVE_GRID_4"))}
            className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground"
          >
            + 4-Grid
          </button>
          <button
            onClick={() => setEditing(blankSection("FESTIVE_PICKS_PRODUCTS"))}
            className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground"
          >
            + Product picks
          </button>
        </div>
      </div>

      {rows.length === 0 && !editing ? (
        <p className="text-xs text-muted-foreground">No festive sections yet. The home screen hides this space.</p>
      ) : null}

      {rows.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{s.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {s.section_type === "FESTIVE_GRID_4" ? "4-grid category card" : "Horizontal product picks"} · #{s.display_order} ·{" "}
              {s.is_active ? "Live" : "Draft"}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={() => setEditing(s)} className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold">Edit</button>
            <button
              onClick={() => setLive(s, !s.is_active)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${s.is_active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              {s.is_active ? "Take down" : "Publish live"}
            </button>
            <button onClick={() => remove(s)} className="rounded-full border border-destructive px-2.5 py-1 text-[11px] font-bold text-destructive">✕</button>
          </div>
        </div>
      ))}

      {editing ? (
        <div className="space-y-2 rounded-xl border border-primary/40 p-2">
          <div className="grid grid-cols-2 gap-2">
            {(["FESTIVE_GRID_4", "FESTIVE_PICKS_PRODUCTS"] as SectionType[]).map((t) => (
              <button
                key={t}
                onClick={() => setEditing({ ...editing, section_type: t })}
                className={`rounded-xl border px-2 py-2 text-[12px] font-bold ${editing.section_type === t ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {t === "FESTIVE_GRID_4" ? "4-Grid category card" : "Horizontal product picks"}
              </button>
            ))}
          </div>

          <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Section title" className={inputCls} />
          <input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} placeholder="Subtitle" className={inputCls} />
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Festive morning", value: "linear-gradient(180deg,#BFE6FF,#E8F7FF)" },
              { label: "Ganesh brown", value: "linear-gradient(180deg,#8A3312,#C4551F)" },
              { label: "Warm cream", value: "linear-gradient(180deg,#FFE7A8,#FFF6DD)" },
              { label: "Saffron", value: "linear-gradient(180deg,#FB923C,#FFD9A0)" },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setEditing({ ...editing, bg_color: p.value })}
                style={{ background: p.value }}
                className="rounded-xl border border-border px-3 py-2 text-[11px] font-black text-foreground shadow-sm"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Background colour</span>
              <input type="color" value={editing.bg_color || "#FFE7A8"} onChange={(e) => setEditing({ ...editing, bg_color: e.target.value })} className="h-10 w-full rounded-xl border border-border" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Background photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f, (url) => setEditing((x) => (x ? { ...x, bg_image_url: url } : x))); }}
                className="w-full rounded-xl border border-border px-2 py-2 text-[11px]"
              />
            </label>
          </div>
          {editing.bg_image_url ? (
            <button onClick={() => setEditing({ ...editing, bg_image_url: "" })} className="rounded-full border border-border px-3 py-1 text-[11px] font-bold text-muted-foreground">
              Remove background photo
            </button>
          ) : null}

          {editing.section_type === "FESTIVE_GRID_4" ? (
            <div className="space-y-2">
              <p className="pt-1 text-[11px] font-bold text-muted-foreground">Four square cards</p>
              {editing.cards.slice(0, 4).map((c, n) => (
                <div key={n} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-2">
                  <input value={c.title} onChange={(e) => upCard(n, { title: e.target.value })} placeholder={`Card ${n + 1} title`} className={inputCls} />
                  <input value={c.filter} onChange={(e) => upCard(n, { filter: e.target.value })} placeholder="Filter word (e.g. modak)" className={inputCls} />
                  <input value={c.tag ?? ""} onChange={(e) => upCard(n, { tag: e.target.value })} placeholder="Tag (e.g. From ₹109)" className={`${inputCls} col-span-2`} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f, (url) => upCard(n, { image_url: url })); }}
                    className="col-span-2 w-full rounded-xl border border-border px-2 py-2 text-[11px]"
                  />
                  {c.image_url ? <img src={c.image_url} alt="" className="col-span-2 aspect-[4/1] w-full rounded-lg object-cover" /> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="pt-1 text-[11px] font-bold text-muted-foreground">Choose dishes for this row</p>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {items.map((i) => {
                  const on = editing.item_ids.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      onClick={() =>
                        setEditing({
                          ...editing,
                          item_ids: on ? editing.item_ids.filter((x) => x !== i.id) : [...editing.item_ids, i.id],
                        })
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-[12px] font-semibold ${on ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                    >
                      <span className="truncate">{i.name}</span>
                      <span>{on ? "✓" : "+"}</span>
                    </button>
                  );
                })}
                {items.length === 0 ? <p className="text-[11px] text-muted-foreground">No dishes available yet.</p> : null}
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Display order</span>
            <input type="number" min={1} value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) || 1 })} className={inputCls} />
          </label>

          <button
            onClick={() => setPreview((p) => !p)}
            className={`w-full rounded-xl border px-3 py-2 text-[12px] font-bold ${preview ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            Live preview {preview ? "ON" : "OFF"}
          </button>

          {preview ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-background pb-3">
              <FestiveSections
                sections={[{ ...editing, id: editing.id || "preview" }]}
                items={items}
                onFilter={() => {}}
                onAdd={() => {}}
              />
            </div>
          ) : null}

          <div className="flex gap-2">
            <button onClick={() => save(true)} disabled={busy} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {busy ? "Saving…" : "Publish to Live App"}
            </button>
            <button onClick={() => save(false)} disabled={busy} className="rounded-xl border border-border px-3 py-2.5 text-sm font-bold text-muted-foreground">Save draft</button>
            <button onClick={() => setEditing(null)} className="rounded-xl border border-border px-3 py-2.5 text-sm font-bold text-muted-foreground">Cancel</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------------- Top bar theme controller ---------------- */

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ThemeController() {
  const [cfg, setCfg] = useState<ThemeConfig | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadThemeConfig().then(setCfg); }, []);

  async function apply() {
    if (!cfg) return;
    setBusy(true);
    const payload = {
      theme_token: cfg.theme_token ?? "DEFAULT_YELLOW",
      current_bg_color: cfg.current_bg_color || BRAND_YELLOW,
      temporary_bg_color: cfg.temporary_bg_color || null,
      is_temporary_active: cfg.is_temporary_active,
      temporary_expires_at: cfg.temporary_expires_at || null,
      header_height_px: cfg.header_height_px || 220,
      header_bg_image_url: cfg.header_bg_image_url || null,
      festive_style_active: cfg.festive_style_active,
    };
    const { error } = cfg.id
      ? await supabase.from("app_theme_config").update(payload).eq("id", cfg.id)
      : await supabase.from("app_theme_config").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Home colour and festive banner applied to the live app.");
    loadThemeConfig().then(setCfg);
  }

  if (!cfg) return null;
  const showing = activeThemeColor(cfg);
  const look = themeStyle(cfg.theme_token);
  const isDefaultLook = look.token === "DEFAULT_YELLOW";

  async function pickTheme(token: (typeof THEME_TOKENS)[number]["token"]) {
    if (!cfg) return;
    setCfg({ ...cfg, theme_token: token });
    setBusy(true);
    const { error } = cfg.id
      ? await supabase.from("app_theme_config").update({ theme_token: token }).eq("id", cfg.id)
      : await supabase.from("app_theme_config").insert({ theme_token: token });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Home theme applied to every app.");
    loadThemeConfig().then(setCfg);
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">Home colour &amp; festive banner</p>
        <button
          onClick={() => setCfg({ ...cfg, current_bg_color: BRAND_YELLOW, temporary_bg_color: null, is_temporary_active: false, temporary_expires_at: null, header_height_px: 220, header_bg_image_url: null, festive_style_active: false })}
          className="rounded-full border border-border px-3 py-1 text-[11px] font-bold text-muted-foreground"
        >
          Reset default
        </button>
      </div>
      <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background p-3">
        <div style={{ backgroundColor: showing }} className="brand-header rounded-xl p-3 text-brand-foreground">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-80">Thaleewala · Delivering in</p>
          <p className="text-xl font-extrabold">15–20 minutes</p>
          <p className="truncate text-[10px] font-semibold opacity-80">HOME · Bhubaneswar</p>
          <div className="mt-3 rounded-xl bg-card px-3 py-2 text-[11px] font-semibold text-card-foreground shadow-lg">⌕ Search “dahi bara”</div>
        </div>
        {cfg.header_bg_image_url ? (
          <img
            src={cfg.header_bg_image_url}
            alt="Festive banner preview"
            style={{ maxHeight: `${cfg.header_height_px || 220}px` }}
            className="block h-auto w-full rounded-2xl object-contain"
          />
        ) : (
          <div
            style={{ height: `${cfg.header_height_px || 220}px` }}
            className="grid place-items-center rounded-2xl bg-muted text-xs font-semibold text-muted-foreground"
          >
            Festive banner preview
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
          Festive banner size · {cfg.header_height_px || 220}px
        </span>
        <input
          type="range"
          min={100}
          max={420}
          step={10}
          value={cfg.header_height_px || 220}
          onChange={(e) => setCfg({ ...cfg, header_height_px: Number(e.target.value) })}
          className="w-full"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Festive banner photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Use a JPG, PNG or WebP picture."); return; }
              void uploadSectionImage(file).then((up) => {
                if ("error" in up) toast.error(up.error);
                else setCfg((current) => current ? { ...current, header_bg_image_url: up.url, festive_style_active: true } : current);
              });
            }}
            className="w-full rounded-xl border border-border px-2 py-2 text-[11px]"
          />
        </label>
        <button
          onClick={() => setCfg({ ...cfg, header_bg_image_url: null, festive_style_active: false })}
          disabled={!cfg.header_bg_image_url}
          className="mt-5 rounded-xl border border-border px-3 py-2 text-[11px] font-bold text-muted-foreground disabled:opacity-40"
        >
          Remove photo
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {THEME_PRESETS.map((p) => (
          <button
            key={p.color}
            onClick={() => setCfg({ ...cfg, current_bg_color: p.color })}
            className={`flex items-center gap-2 rounded-xl border px-2 py-2 text-[12px] font-bold ${cfg.current_bg_color === p.color ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            <span className="h-4 w-4 rounded-full" style={{ background: p.color }} />
            {p.label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Custom colour</span>
        <input type="color" value={cfg.current_bg_color || BRAND_YELLOW} onChange={(e) => setCfg({ ...cfg, current_bg_color: e.target.value })} className="h-10 w-full rounded-xl border border-border" />
      </label>

      <button
        onClick={() => setCfg({ ...cfg, is_temporary_active: !cfg.is_temporary_active })}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${cfg.is_temporary_active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
      >
        Temporary festival colour {cfg.is_temporary_active ? "ON" : "OFF"}
      </button>

      {cfg.is_temporary_active ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Festival colour</span>
            <input type="color" value={cfg.temporary_bg_color || "#FB923C"} onChange={(e) => setCfg({ ...cfg, temporary_bg_color: e.target.value })} className="h-10 w-full rounded-xl border border-border" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Ends on</span>
            <input
              type="datetime-local"
              value={toLocalInput(cfg.temporary_expires_at)}
              onChange={(e) => setCfg({ ...cfg, temporary_expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className={inputCls}
            />
          </label>
        </div>
      ) : null}

      <button onClick={apply} disabled={busy} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {busy ? "Applying…" : "Apply to Live App"}
      </button>
    </section>
  );
}
