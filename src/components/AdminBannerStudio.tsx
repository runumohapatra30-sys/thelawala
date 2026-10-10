import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  listDynamicBanners,
  uploadBannerMedia,
  type BannerFormat,
  type DynamicBanner,
} from "@/lib/dynamicBanners";

const MAX_MB = 5;
const ROUTE_PRESETS = [
  { label: "No link", value: "" },
  { label: "Become a delivery partner", value: "/rider" },
  { label: "Partner with us", value: "/vendor" },
  { label: "All categories", value: "/categories" },
  { label: "My orders", value: "/orders" },
  { label: "Wallet", value: "/wallet" },
  { label: "Custom link…", value: "__custom" },
] as const;
const FORMATS: { value: BannerFormat; title: string; note: string }[] = [
  { value: "HERO", title: "Full Hero", note: "Large 16:9 banner" },
  { value: "SLIM", title: "Slim Ribbon", note: "Compact 4:1 strip" },
  { value: "4_GRID", title: "4-Grid", note: "Four square category tiles" },
];
const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

function validFile(file: File) {
  return /^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= MAX_MB * 1024 * 1024;
}

export function AdminBannerStudio() {
  const [rows, setRows] = useState<DynamicBanner[]>([]);
  const [format, setFormat] = useState<BannerFormat>("HERO");
  const [file, setFile] = useState<File | null>(null);
  const [gridFiles, setGridFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [preview, setPreview] = useState<string | null>(null);
  const [gridPreviews, setGridPreviews] = useState<string[]>([]);
  const [route, setRoute] = useState("");
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<DynamicBanner | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [badge, setBadge] = useState("");
  const [color, setColor] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [order, setOrder] = useState(1);
  const [enabled, setEnabled] = useState(true);
  const localDate = (date: string | null) => date ? new Date(Date.parse(date) - new Date(date).getTimezoneOffset() * 60000).toISOString().slice(0,16) : "";
  function edit(banner: DynamicBanner) {
    setEditing(banner); setFormat(banner.banner_format); setTitle(banner.title); setSubtitle(banner.subtitle);
    setBadge(banner.badge); setColor(banner.theme_color ?? ""); setStarts(localDate(banner.starts_at)); setEnds(localDate(banner.ends_at));
    setOrder(banner.display_order); setEnabled(banner.is_active); setRoute(banner.target_route ?? "");
    setCustom(Boolean(banner.target_route && !ROUTE_PRESETS.some((preset) => preset.value === banner.target_route)));
    setFile(null); setGridFiles([null,null,null,null]);
    document.getElementById("banner-editor")?.scrollIntoView({ behavior: "smooth" });
  }
  function reset() {
    setEditing(null); setTitle(""); setSubtitle(""); setBadge(""); setColor(""); setStarts(""); setEnds(""); setOrder(rows.length + 1); setEnabled(true);
    setFile(null); setGridFiles([null,null,null,null]); setRoute(""); setCustom(false);
  }
  const load = () => listDynamicBanners(false).then(setRows).catch(() => toast.error("Could not load banners."));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    const urls = gridFiles.map((item) => item ? URL.createObjectURL(item) : "");
    setGridPreviews(urls);
    return () => urls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
  }, [gridFiles]);

  function chooseMain(next: File | null) {
    if (!next) return;
    if (!validFile(next)) { toast.error("Use a JPG, PNG or WebP picture under 5 MB."); return; }
    setFile(next);
  }

  function chooseGrid(index: number, next: File | null) {
    if (!next) return;
    if (!validFile(next)) { toast.error("Use JPG, PNG or WebP pictures under 5 MB."); return; }
    setGridFiles((current) => current.map((item, i) => i === index ? next : item));
  }

  async function publish() {
    const chosen = format === "4_GRID" ? gridFiles.filter((item): item is File => Boolean(item)) : file ? [file] : [];
    if (!editing && format === "4_GRID" && chosen.length !== 4) { toast.error("Choose all four grid pictures."); return; }
    if (format === "4_GRID" && chosen.length > 0 && chosen.length !== 4) { toast.error("Choose all four replacement pictures."); return; }
    if (!editing && format !== "4_GRID" && chosen.length !== 1) { toast.error("Choose a banner picture first."); return; }
    if (editing && format !== editing.banner_format && chosen.length === 0) { toast.error("Choose pictures for the new format."); return; }
    if (ends && starts && new Date(ends) <= new Date(starts)) { toast.error("End time must be after start time."); return; }
    if (color && !/^#[0-9a-f]{6}$/i.test(color)) { toast.error("Choose a valid theme color."); return; }
    setBusy(true);
    try {
    const uploaded = await Promise.all(chosen.map(uploadBannerMedia));
    const failed = uploaded.find((item) => "error" in item);
    if (failed && "error" in failed) { toast.error(failed.error); return; }
    const files = uploaded.filter((item): item is { path: string; url: string } => "url" in item);
    const first = files[0];
    const values = {
      media_type: first ? "image" : editing?.media_type ?? "image",
      media_url: first?.url ?? editing?.media_url ?? "",
      media_path: first?.path ?? editing?.media_path ?? null,
      target_route: route.trim() || null,
      height_px: format === "SLIM" ? 80 : 180,
      aspect_ratio: format === "SLIM" ? "4/1" : format === "4_GRID" ? "1/1" : "16/9",
      border_radius: 8, display_order: order, is_active: enabled, banner_format: format,
      grid_image_urls: format === "4_GRID" ? files.length ? files.map((item) => item.url) : editing?.grid_image_urls ?? [] : [],
      title: title.trim(), subtitle: subtitle.trim(), badge: badge.trim(), theme_color: color || null,
      starts_at: starts ? new Date(starts).toISOString() : null, ends_at: ends ? new Date(ends).toISOString() : null,
    };
    const { error } = editing
      ? await supabase.from("app_dynamic_banners").update(values).eq("id", editing.id)
      : await supabase.from("app_dynamic_banners").insert(values);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Banner updated." : "Banner added to rotation.");
    reset(); load();
    } catch { toast.error("Could not save banner. Please try again."); }
    finally { setBusy(false); }
  }

  async function activate(banner: DynamicBanner) {
    const { error } = await supabase.from("app_dynamic_banners").update({ is_active: !banner.is_active }).eq("id", banner.id);
    if (error) toast.error(error.message); else { toast.success("Active banner changed."); load(); }
  }

  async function remove(banner: DynamicBanner) {
    const { error } = await supabase.from("app_dynamic_banners").delete().eq("id", banner.id);
    if (error) { toast.error(error.message); return; }
    if (banner.media_path) await supabase.storage.from("banners").remove([banner.media_path]);
    load();
  }

  const previewImages = format === "4_GRID" ? gridPreviews.some(Boolean) ? gridPreviews : editing?.grid_image_urls ?? [] : [preview ?? editing?.media_url ?? ""];

  return (
    <section id="banner-editor" className="portal-panel min-w-0 space-y-4">
      <div>
        <h3 className="section-title">Home Banner Studio</h3>
        <p className="text-xs font-medium text-muted-foreground">Live home carousel</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {FORMATS.map((item) => (
          <Button key={item.value} type="button" variant={format === item.value ? "default" : "outline"} className="h-auto min-w-0 flex-col items-start py-3 text-left" onClick={() => setFormat(item.value)}>
            <span className="w-full truncate text-xs font-extrabold">{item.title}</span>
            <span className="w-full truncate text-[10px] font-medium opacity-70">{item.note}</span>
          </Button>
        ))}
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[375px] overflow-hidden rounded-3xl border-4 border-foreground/80 bg-background p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between text-[10px] font-bold text-muted-foreground"><span>9:41</span><span>Thaleewala</span></div>
          {format === "4_GRID" ? (
            <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-2 overflow-hidden rounded-2xl bg-muted p-2">
              {[0, 1, 2, 3].map((index) => previewImages[index] ? <img key={index} src={previewImages[index]} alt={`Grid preview ${index + 1}`} className="h-full min-h-0 w-full object-cover" /> : <div key={index} className="grid min-h-0 place-items-center bg-card text-[10px] text-muted-foreground">Tile {index + 1}</div>)}
            </div>
          ) : (
            <div className={`grid w-full place-items-center overflow-hidden bg-muted ${format === "SLIM" ? "aspect-[4/1] max-h-20 rounded-xl" : "aspect-video max-h-[180px] rounded-2xl"}`}>
              {previewImages[0] ? <img src={previewImages[0]} alt="Banner preview" className="h-full w-full object-cover" /> : <span className="text-xs font-semibold text-muted-foreground">Choose a picture</span>}
            </div>
          )}
          <p className="mt-3 text-center text-[11px] font-bold text-muted-foreground">{FORMATS.find((item) => item.value === format)?.note}</p>
        </div>

        <div className="min-w-0 space-y-3">
          {format === "4_GRID" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <label key={index} className="min-w-0 text-xs font-bold text-muted-foreground">Tile {index + 1}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseGrid(index, event.target.files?.[0] ?? null)} className={`${inputCls} mt-1 min-w-0 text-xs`} />
                </label>
              ))}
            </div>
          ) : (
            <label className="block text-xs font-bold text-muted-foreground">Banner picture
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseMain(event.target.files?.[0] ?? null)} className={`${inputCls} mt-1 text-xs`} />
            </label>
          )}

          {editing && <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">Editing banner</span><Button variant="ghost" onClick={reset}>Cancel</Button></div>}
          <label className="block text-xs font-bold text-muted-foreground">Title<input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} mt-1`} /></label>
          <label className="block text-xs font-bold text-muted-foreground">Subtitle<input value={subtitle} maxLength={180} onChange={(e) => setSubtitle(e.target.value)} className={`${inputCls} mt-1`} /></label>
          <label className="block text-xs font-bold text-muted-foreground">Badge<input value={badge} maxLength={40} onChange={(e) => setBadge(e.target.value)} className={`${inputCls} mt-1`} /></label>
          <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs font-bold">Theme color<input type="color" value={color || "#e6f0ea"} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border" /></label><Button variant="ghost" onClick={() => setColor("")}>Default</Button></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Start (local time)<input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} className={`${inputCls} mt-1 min-w-0`} /></label><label className="text-xs font-bold">End (local time)<input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className={`${inputCls} mt-1 min-w-0`} /></label></div>
          <div className="flex items-center gap-4"><label className="text-xs font-bold">Display order<input type="number" min={0} value={order} onChange={(e) => setOrder(Math.max(0, Number(e.target.value)))} className={`${inputCls} mt-1 max-w-24`} /></label><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Enabled</label></div>
          <label className="block text-xs font-bold text-muted-foreground">Tap destination
            <select value={custom ? "__custom" : route} onChange={(event) => { const value = event.target.value; setCustom(value === "__custom"); setRoute(value === "__custom" ? "" : value); }} className={`${inputCls} mt-1`}>
              {ROUTE_PRESETS.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}
            </select>
            {custom ? <input value={route} onChange={(event) => setRoute(event.target.value)} placeholder="/categories or https://…" className={`${inputCls} mt-2`} /> : null}
          </label>
          <Button type="button" onClick={publish} disabled={busy} className="w-full">{busy ? "Publishing…" : editing ? "Save changes" : "Add to carousel"}</Button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No banners yet.</p> : null}
        {rows.map((banner) => (
          <div key={banner.id} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border p-2 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
            <img src={banner.grid_image_urls[0] || banner.media_url} alt="Banner" className="aspect-video w-full rounded-lg object-cover" />
            <div className="min-w-0"><p className="truncate text-xs font-extrabold">{banner.title || banner.banner_format.replace("_", "-")}</p><p className="truncate text-[11px] text-muted-foreground">{banner.target_route || "No link"} · {banner.is_active ? "Live" : "Off"}</p></div>
            <div className="col-span-2 flex gap-2 sm:col-span-1">
              <Button type="button" size="sm" variant="outline" onClick={() => edit(banner)}>Edit</Button><Button type="button" size="sm" variant="outline" onClick={() => activate(banner)}>{banner.is_active ? "Disable" : "Enable"}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(banner)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}