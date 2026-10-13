import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listDynamicBanners, uploadBannerMedia, type DynamicBanner } from "@/lib/dynamicBanners";

const MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_COLOR = "#FF6B00";
const inputCls =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

type TargetType = "stall" | "category" | "external";
type Option = { id: string; name: string };

function fileMediaType(file: File): "image" | "video" | null {
  if (file.type === "image/gif" && /\.gif$/i.test(file.name)) return "image";
  if (file.type === "video/mp4" && /\.mp4$/i.test(file.name)) return "video";
  if (file.type === "video/webm" && /\.webm$/i.test(file.name)) return "video";
  return null;
}

function mediaUrlType(value: string): "image" | "video" | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const path = url.pathname.toLowerCase();
    if (path.endsWith(".gif")) return "image";
    if (path.endsWith(".mp4") || path.endsWith(".webm")) return "video";
  } catch {
    return null;
  }
  return null;
}

function parseRoute(route: string | null): { type: TargetType; value: string } {
  if (route?.startsWith("/stall/"))
    return { type: "stall", value: decodeRoutePart(route.slice(7)) };
  if (route?.startsWith("/category/"))
    return { type: "category", value: decodeRoutePart(route.slice(10)) };
  if (route && /^https?:\/\//i.test(route)) return { type: "external", value: route };
  return { type: "stall", value: "" };
}

function decodeRoutePart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function discardUploadedMedia(path: string) {
  try {
    const { error } = await supabase.storage.from("banners").remove([path]);
    if (error) toast.error(`Uploaded media cleanup failed: ${error.message}`);
  } catch (error) {
    toast.error(
      error instanceof Error
        ? `Uploaded media cleanup failed: ${error.message}`
        : "Uploaded media cleanup failed.",
    );
  }
}

export function AdminBestValuePromo({
  stalls,
  categories,
}: {
  stalls: Option[];
  categories: Option[];
}) {
  const [rows, setRows] = useState<DynamicBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [targetType, setTargetType] = useState<TargetType>("stall");
  const [targetValue, setTargetValue] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);

  const promo =
    rows.find((row) => row.banner_format === "BEST_VALUE" && row.is_active) ??
    rows.find((row) => row.banner_format === "BEST_VALUE");
  const mediaType = file ? fileMediaType(file) : mediaUrlType(mediaUrl);
  const mediaSource = file ? previewUrl : mediaUrl;
  const durationTooLong =
    mediaType === "video" &&
    videoDuration !== null &&
    (!Number.isFinite(videoDuration) || videoDuration > 3);
  const previewPending = Boolean(mediaSource && mediaType === "video" && videoDuration === null);

  useEffect(() => {
    let alive = true;
    listDynamicBanners(false)
      .then((result) => {
        if (!alive) return;
        const value = result.filter((row) => row.banner_format === "BEST_VALUE");
        setRows(value);
        const current = value.find((row) => row.is_active) ?? value[0];
        if (!current) return;
        const target = parseRoute(current.target_route);
        setTitle(current.title);
        setSubtitle(current.subtitle);
        setMediaUrl(current.media_url);
        setTargetType(target.type);
        setTargetValue(target.value);
        setColor(current.theme_color ?? DEFAULT_COLOR);
      })
      .catch((error: unknown) => {
        if (alive)
          toast.error(
            error instanceof Error ? error.message : "Could not load the Best value promo.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    setVideoDuration(null);
    setPreviewError(false);
  }, [mediaSource, mediaType]);

  const targetRoute = useMemo(() => {
    if (targetType === "external") return targetValue.trim();
    if (!targetValue) return "";
    return `/${targetType}/${encodeURIComponent(targetValue)}`;
  }, [targetType, targetValue]);

  function chooseFile(next: File | null) {
    if (!next) return;
    if (!fileMediaType(next)) {
      toast.error("Choose an animated GIF, MP4 or WebM video.");
      return;
    }
    if (next.size > MAX_BYTES) {
      toast.error("Media files must be 5 MB or smaller.");
      return;
    }
    setFile(next);
    setMediaUrl("");
  }

  async function publish() {
    if (!title.trim()) {
      toast.error("Enter a promo title.");
      return;
    }
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      toast.error("Enter a valid 6-digit hex color.");
      return;
    }
    if (!mediaSource || !mediaType) {
      toast.error("Upload a GIF/video or enter a supported media URL.");
      return;
    }
    if (previewError) {
      toast.error("The media preview could not be loaded.");
      return;
    }
    if (durationTooLong) {
      toast.error("Promo videos must be 3 seconds or shorter.");
      return;
    }
    if (previewPending) {
      toast.error("Wait for the video preview to finish checking its duration.");
      return;
    }
    if (!targetRoute) {
      toast.error("Choose a stall, category, or external destination.");
      return;
    }
    if (targetType === "external") {
      try {
        const destination = new URL(targetRoute);
        if (destination.protocol !== "http:" && destination.protocol !== "https:")
          throw new Error("Unsupported protocol");
      } catch {
        toast.error("Enter a valid HTTP or HTTPS destination URL.");
        return;
      }
    }

    setBusy(true);
    let newMediaPath: string | null = null;
    let recordSaved = false;
    try {
      const uploaded = file ? await uploadBannerMedia(file) : null;
      if (uploaded && "error" in uploaded) {
        toast.error(uploaded.error);
        return;
      }
      if (uploaded && "path" in uploaded) newMediaPath = uploaded.path;
      const savedMediaUrl = uploaded && "url" in uploaded ? uploaded.url : mediaUrl.trim();
      const values = {
        media_type: mediaType,
        media_url: savedMediaUrl,
        media_path:
          uploaded && "path" in uploaded
            ? uploaded.path
            : mediaUrl.trim() === promo?.media_url
              ? promo.media_path
              : null,
        target_route: targetRoute,
        height_px: 252,
        aspect_ratio: "1/1",
        border_radius: 24,
        is_active: true,
        display_order: 0,
        banner_format: "BEST_VALUE",
        grid_image_urls: [],
        title: title.trim(),
        subtitle: subtitle.trim(),
        badge: "",
        theme_color: color.toUpperCase(),
        starts_at: null,
        ends_at: null,
      };
      const result = promo
        ? await supabase
            .from("app_dynamic_banners")
            .update(values)
            .eq("id", promo.id)
            .select("id")
            .maybeSingle()
        : await supabase.from("app_dynamic_banners").insert(values).select("id").single();
      if (result.error) {
        if (newMediaPath) await discardUploadedMedia(newMediaPath);
        toast.error(result.error.message);
        return;
      }
      if (!result.data) {
        if (newMediaPath) await discardUploadedMedia(newMediaPath);
        toast.error("The promo was not saved. Please try again.");
        return;
      }
      recordSaved = true;
      const { error: deactivateError } = await supabase
        .from("app_dynamic_banners")
        .update({ is_active: false })
        .eq("banner_format", "BEST_VALUE")
        .neq("id", result.data.id);
      if (deactivateError) {
        toast.error(
          `Promo saved, but other Best value promos could not be disabled: ${deactivateError.message}`,
        );
      } else {
        toast.success("Best value promo saved and set active.");
      }
      const updated = await listDynamicBanners(false);
      setRows(updated.filter((row) => row.banner_format === "BEST_VALUE"));
      setFile(null);
      if (newMediaPath) setMediaUrl(savedMediaUrl);
    } catch (error) {
      if (newMediaPath && !recordSaved) await discardUploadedMedia(newMediaPath);
      const detail = error instanceof Error ? error.message : "Please try again.";
      toast.error(
        recordSaved
          ? `Promo saved, but the editor could not refresh: ${detail}`
          : `Could not save the Best value promo: ${detail}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function setPromoEnabled(enabled: boolean) {
    if (!promo) {
      toast.error("Save a promo before enabling it.");
      return;
    }
    setBusy(true);
    try {
      const { error } = enabled
        ? await supabase.from("app_dynamic_banners").update({ is_active: true }).eq("id", promo.id)
        : await supabase
            .from("app_dynamic_banners")
            .update({ is_active: false })
            .eq("banner_format", "BEST_VALUE");
      if (error) {
        toast.error(error.message);
        return;
      }
      let deactivateError: string | null = null;
      if (enabled) {
        const { error: resultError } = await supabase
          .from("app_dynamic_banners")
          .update({ is_active: false })
          .eq("banner_format", "BEST_VALUE")
          .neq("id", promo.id);
        if (resultError) deactivateError = resultError.message;
      }
      setRows((current) =>
        current.map((row) => ({ ...row, is_active: enabled && row.id === promo.id })),
      );
      if (deactivateError) {
        toast.error(
          `Promo enabled, but another Best value promo could not be disabled: ${deactivateError}`,
        );
      } else {
        toast.success(enabled ? "Best value promo enabled." : "Best value promo disabled.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the promo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="portal-panel min-w-0 space-y-4">
      <div>
        <h3 className="section-title">Best value promo</h3>
        <p className="text-xs font-medium text-muted-foreground">
          Manage the optional media slide on the home Best value card.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground" role="status">
          Loading promo settings…
        </p>
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <div>
            <p className="mb-2 text-xs font-bold text-muted-foreground">Live preview</p>
            <div className="relative h-[252px] overflow-hidden rounded-3xl border border-border bg-muted shadow-sm">
              {mediaSource && mediaType === "video" ? (
                <video
                  key={mediaSource}
                  src={mediaSource}
                  muted
                  autoPlay
                  loop
                  playsInline
                  onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
                  onError={() => setPreviewError(true)}
                  className="h-full w-full object-cover"
                />
              ) : mediaSource && mediaType === "image" ? (
                <img
                  key={mediaSource}
                  src={mediaSource}
                  alt="Promo preview"
                  onError={() => setPreviewError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <p className="grid h-full place-items-center px-5 text-center text-xs text-muted-foreground">
                  Choose a GIF, video, or media URL to preview.
                </p>
              )}
              {mediaSource ? (
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <p className="line-clamp-2 text-sm font-black">{title || "Your promo title"}</p>
                {subtitle ? (
                  <p className="mt-1 line-clamp-2 text-[10px] font-semibold">{subtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
              <span
                className="h-6 w-6 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
              Header accent preview <span className="font-mono text-muted-foreground">{color}</span>
            </div>
            {previewPending ? (
              <p className="mt-2 text-[11px] text-muted-foreground">Checking video duration…</p>
            ) : null}
            {durationTooLong ? (
              <p className="mt-2 text-[11px] font-semibold text-destructive">
                Video is longer than 3 seconds.
              </p>
            ) : null}
            {previewError ? (
              <p className="mt-2 text-[11px] font-semibold text-destructive">
                Media preview could not be loaded.
              </p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-3">
            <label className="block text-xs font-bold text-muted-foreground">
              Media file (GIF, MP4 or WebM · max 5 MB)
              <input
                type="file"
                accept="image/gif,video/mp4,video/webm"
                disabled={busy}
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-bold text-muted-foreground">
              Or external media URL
              <input
                type="url"
                value={file ? "" : mediaUrl}
                disabled={busy}
                onChange={(event) => {
                  setFile(null);
                  setMediaUrl(event.target.value);
                }}
                placeholder="https://example.com/promo.gif"
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-bold text-muted-foreground">
              Title / label
              <input
                value={title}
                maxLength={100}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Dahi Bara Special Offer"
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-bold text-muted-foreground">
              Supporting text <span className="font-medium">(optional)</span>
              <input
                value={subtitle}
                maxLength={180}
                disabled={busy}
                onChange={(event) => setSubtitle(event.target.value)}
                placeholder="Freshly made near you"
                className={inputCls}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-muted-foreground">
                Target type
                <select
                  value={targetType}
                  disabled={busy}
                  onChange={(event) => {
                    setTargetType(event.target.value as TargetType);
                    setTargetValue("");
                  }}
                  className={inputCls}
                >
                  <option value="stall">Stall</option>
                  <option value="category">Category</option>
                  <option value="external">External URL</option>
                </select>
              </label>
              {targetType === "stall" ? (
                <label className="block text-xs font-bold text-muted-foreground">
                  Target stall
                  <select
                    value={targetValue}
                    disabled={busy}
                    onChange={(event) => setTargetValue(event.target.value)}
                    className={inputCls}
                  >
                    <option value="">Choose a stall…</option>
                    {stalls.map((stall) => (
                      <option key={stall.id} value={stall.id}>
                        {stall.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : targetType === "category" ? (
                <label className="block text-xs font-bold text-muted-foreground">
                  Target category
                  <select
                    value={targetValue}
                    disabled={busy}
                    onChange={(event) => setTargetValue(event.target.value)}
                    className={inputCls}
                  >
                    <option value="">Choose a category…</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block text-xs font-bold text-muted-foreground">
                  Destination URL
                  <input
                    type="url"
                    value={targetValue}
                    disabled={busy}
                    onChange={(event) => setTargetValue(event.target.value)}
                    placeholder="https://example.com/offer"
                    className={inputCls}
                  />
                </label>
              )}
            </div>

            <label className="block text-xs font-bold text-muted-foreground">
              Header accent color
              <span className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_COLOR}
                  disabled={busy}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
                />
                <input
                  value={color}
                  maxLength={7}
                  disabled={busy}
                  onChange={(event) => setColor(event.target.value)}
                  placeholder="#FF6B00"
                  className="w-32 rounded-xl border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary"
                />
                <span
                  className="flex-1 rounded-xl border border-border"
                  style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(color) ? color : "transparent" }}
                  aria-label="Header color preview"
                />
              </span>
            </label>

            <Button
              type="button"
              onClick={publish}
              disabled={busy || previewPending || durationTooLong || previewError}
              className="w-full"
            >
              {busy ? "Uploading and saving…" : "Save & Set Active"}
            </Button>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-xs font-bold">
              <span>Disable Promo</span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Disable Promo"
                checked={Boolean(promo && !promo.is_active)}
                disabled={busy || !promo}
                onChange={(event) => void setPromoEnabled(!event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
