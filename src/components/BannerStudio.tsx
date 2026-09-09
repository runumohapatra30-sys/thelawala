import { useEffect, useState } from "react";
import { Resizable } from "re-resizable";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listDynamicBanners,
  ratioLabel,
  uploadBannerMedia,
  type DynamicBanner,
} from "@/lib/dynamicBanners";

const FRAME_W = 375;
const PAD = 20;
const MEDIA_W = Math.round((FRAME_W - PAD * 2) * 0.88);
const MAX_MB = 5;
const MIN_H = 100;
const MAX_H = 220;

const ROUTE_PRESETS = [
  { label: "No link", value: "" },
  { label: "Become a delivery partner", value: "/rider" },
  { label: "Partner with us (stall owner)", value: "/vendor" },
  { label: "All categories", value: "/categories" },
  { label: "My orders", value: "/orders" },
  { label: "Wallet", value: "/wallet" },
  { label: "Custom link…", value: "__custom" },
];

const inputCls =
  "w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary";

export function BannerStudio() {
  const [rows, setRows] = useState<DynamicBanner[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [kind, setKind] = useState<"image" | "video">("image");
  const [height, setHeight] = useState(140);
  const [radius, setRadius] = useState(16);
  const [route, setRoute] = useState("");
  const [order, setOrder] = useState("1");
  const [busy, setBusy] = useState(false);

  const load = () => listDynamicBanners(false).then(setRows);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | null) {
    if (!f) return;
    const isImg = /^image\/(jpeg|png|webp)$/.test(f.type);
    const isVid = /^video\/(mp4|webm)$/.test(f.type);
    if (!isImg && !isVid) {
      toast.error("Use a JPG, PNG, WebP picture or an MP4/WebM video.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Keep the file under ${MAX_MB} MB.`);
      return;
    }
    setKind(isVid ? "video" : "image");
    setFile(f);
  }

  async function publish() {
    if (!file) { toast.error("Choose a picture or video first."); return; }
    setBusy(true);
    const up = await uploadBannerMedia(file);
    if ("error" in up) { setBusy(false); toast.error(up.error); return; }
    const { error } = await supabase.from("app_dynamic_banners").insert({
      media_type: kind,
      media_url: up.url,
      media_path: up.path,
      target_route: route.trim() || null,
      height_px: Math.round(height),
      aspect_ratio: `${MEDIA_W}/${Math.round(height)}`,
      border_radius: Math.round(radius),
      display_order: Math.max(1, Number(order) || 1),
      is_active: true,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Banner published to the app.");
    setFile(null);
    setPreview(null);
    setRoute("");
    load();
  }

  async function toggle(b: DynamicBanner) {
    await supabase.from("app_dynamic_banners").update({ is_active: !b.is_active }).eq("id", b.id);
    load();
  }

  async function remove(b: DynamicBanner) {
    await supabase.from("app_dynamic_banners").delete().eq("id", b.id);
    if (b.media_path) await supabase.storage.from("banners").remove([b.media_path]);
    load();
  }

  return (
    <div className="portal-panel space-y-4">
      <div>
        <h3 className="section-title">Banner Studio</h3>
        <p className="text-xs font-medium text-muted-foreground">
          Drag the bottom edge of the banner to set its exact height, then publish.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
        {/* Live mobile mockup */}
        <div className="mx-auto w-fit rounded-[2rem] border-4 border-foreground/80 bg-background p-2 shadow-xl">
          <div style={{ width: FRAME_W }} className="overflow-hidden rounded-[1.6rem] bg-muted/40">
            <div className="flex items-center justify-between px-4 py-2 text-[10px] font-bold text-muted-foreground">
              <span>9:41</span>
              <span>Thaleewala</span>
            </div>
            <div style={{ padding: PAD }}>
              <Resizable
                size={{ width: MEDIA_W, height }}
                minHeight={80}
                maxHeight={420}
                enable={{ bottom: true }}
                onResize={(_e, _d, ref) => setHeight(ref.offsetHeight)}
                handleComponent={{
                  bottom: (
                    <div className="flex h-4 items-center justify-center">
                      <span className="h-1.5 w-14 rounded-full bg-primary shadow" />
                    </div>
                  ),
                }}
                className="relative overflow-hidden bg-muted"
                style={{ borderRadius: radius }}
              >
                {preview ? (
                  kind === "video" ? (
                    <video
                      src={preview}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      controls={false}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img src={preview} alt="Banner preview" className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-muted-foreground">
                    Upload a picture or video
                  </div>
                )}
              </Resizable>
              <p className="mt-4 text-center text-[11px] font-bold text-muted-foreground">
                Height: {Math.round(height)}px · Ratio: {ratioLabel(MEDIA_W, height)} · Corners: {radius}px
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-muted-foreground">
            Picture or video (max {MAX_MB} MB)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
              className={`${inputCls} mt-1 font-medium`}
            />
          </label>

          <label className="block text-xs font-bold text-muted-foreground">
            Height ({Math.round(height)}px)
            <input
              type="range"
              min={80}
              max={420}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
          </label>

          <label className="block text-xs font-bold text-muted-foreground">
            Rounded corners ({radius}px)
            <input
              type="range"
              min={0}
              max={40}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
          </label>

          <label className="block text-xs font-bold text-muted-foreground">
            Tap destination (e.g. /categories or /orders)
            <input
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="/categories"
              className={`${inputCls} mt-1`}
            />
          </label>

          <label className="block text-xs font-bold text-muted-foreground">
            Show order
            <input
              type="number"
              min={1}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className={`${inputCls} mt-1`}
            />
          </label>

          <button
            onClick={publish}
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Publishing…" : "Publish to app"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs font-medium text-muted-foreground">No studio banners yet.</p>
        ) : null}
        {rows.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
            <div
              className="h-12 w-24 shrink-0 overflow-hidden bg-muted"
              style={{ borderRadius: Math.min(b.border_radius, 14) }}
            >
              {b.media_type === "video" ? (
                <video src={b.media_url} muted loop autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <img src={b.media_url} alt="Banner" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-xs font-semibold">
              <p className="truncate">{b.target_route || "No link"}</p>
              <p className="text-muted-foreground">
                {b.media_type} · {b.height_px}px · #{b.display_order} · {b.is_active ? "Live" : "Off"}
              </p>
            </div>
            <button onClick={() => toggle(b)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold">
              {b.is_active ? "Turn off" : "Turn on"}
            </button>
            <button onClick={() => remove(b)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-destructive">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
