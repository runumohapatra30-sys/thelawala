import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadSectionImage } from "@/lib/homeSections";
import {
  DEFAULT_VISUAL_ENGINE_SETTINGS,
  loadVisualEngineSettings,
  type VisualEngineSettings,
} from "@/lib/visualEngine";

type MenuItem = {
  id: string;
  vendor_id: string;
  name: string;
  price: number;
  photo_url: string | null;
  in_stock: boolean;
};
type Vendor = { id: string; stall_name: string };

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";

export function AdminVisualEngineSettings() {
  const [settings, setSettings] = useState<VisualEngineSettings>(DEFAULT_VISUAL_ENGINE_SETTINGS);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const vendorMap = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);
  const chosenItem = items.find((item) => item.id === settings.flash_menu_item_id);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadVisualEngineSettings(),
      supabase.from("vendors").select("id,stall_name").eq("status", "APPROVED").order("stall_name"),
      supabase
        .from("menu_items")
        .select("id,vendor_id,name,price,photo_url,in_stock")
        .eq("in_stock", true)
        .order("name"),
    ])
      .then(([engineSettings, vendorResult, itemResult]) => {
        if (!alive) return;
        const error = vendorResult.error ?? itemResult.error;
        if (error) {
          console.error("Could not load visual engine catalog:", error);
          toast.error(`Could not load the flash-deal catalog: ${error.message}`);
        } else {
          const approvedVendors = (vendorResult.data ?? []) as Vendor[];
          const approvedIds = new Set(approvedVendors.map((vendor) => vendor.id));
          setVendors(approvedVendors);
          setItems(
            ((itemResult.data ?? []) as MenuItem[]).filter((item) =>
              approvedIds.has(item.vendor_id),
            ),
          );
        }
        setSettings(engineSettings);
        setLoading(false);
      })
      .catch((error: unknown) => {
        console.error("Could not load visual engine settings:", error);
        if (alive) {
          setLoading(false);
          toast.error("Could not load visual engine settings.");
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  async function uploadHero(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error("Use a JPG, PNG or WebP flash-deal picture.");
      return;
    }
    setUploading(true);
    const upload = await uploadSectionImage(file);
    setUploading(false);
    if ("error" in upload) {
      toast.error(upload.error);
      return;
    }
    setSettings((current) => ({ ...current, flash_image_url: upload.url }));
    toast.success("Flash-deal image uploaded. Save the settings to publish it.");
  }

  async function save() {
    if (
      settings.flash_deal_enabled &&
      (!settings.flash_menu_item_id || !settings.flash_price || settings.flash_price <= 0)
    ) {
      toast.error("Choose an in-stock menu item and enter a flash price above ₹0.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("app_visual_engine_settings").upsert(
      {
        ...settings,
        flash_price: settings.flash_deal_enabled
          ? Number(settings.flash_price)
          : settings.flash_price,
      },
      { onConflict: "id" },
    );
    setSaving(false);
    if (error) {
      console.error("Could not save visual engine settings:", error);
      toast.error(`Could not save visual engine settings: ${error.message}`);
      return;
    }
    const next = await loadVisualEngineSettings();
    setSettings(next);
    toast.success("Visual engine settings saved.");
  }

  if (loading) {
    return (
      <section
        aria-live="polite"
        className="card-soft animate-pulse p-4 text-sm text-muted-foreground"
      >
        Loading visual engine settings…
      </section>
    );
  }

  return (
    <section className="card-soft space-y-4 border border-border p-4">
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#6741a5,#4f8ecf,#dfac52)] text-xl text-white shadow-lg">
          ✦
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black">
            Automated AI Styling &amp; Midnight Health Engine
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Local image palette analysis, time-based campaign cards and a daily admin health
            refresh.
          </span>
        </span>
      </header>

      <label
        className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${settings.is_enabled ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}
      >
        <span>
          <span className="block text-sm font-black">Master control</span>
          <span className="text-[10px] text-muted-foreground">
            When off, the app keeps its static default brand styling.
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs font-black">
          <input
            type="checkbox"
            checked={settings.is_enabled}
            onChange={(event) => setSettings({ ...settings, is_enabled: event.target.checked })}
          />
          {settings.is_enabled ? "ON" : "OFF"}
        </span>
      </label>

      <div
        className={`space-y-3 rounded-2xl border border-border p-3 ${settings.is_enabled ? "" : "opacity-55"}`}
      >
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-black">Daily app-open flash deal</span>
            <span className="text-[10px] text-muted-foreground">
              Shows once per visitor each India calendar day.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.flash_deal_enabled}
            disabled={!settings.is_enabled}
            onChange={(event) =>
              setSettings({ ...settings, flash_deal_enabled: event.target.checked })
            }
          />
        </label>
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Featured in-stock menu item
          <select
            value={settings.flash_menu_item_id ?? ""}
            disabled={!settings.is_enabled}
            onChange={(event) =>
              setSettings({
                ...settings,
                flash_menu_item_id: event.target.value || null,
                flash_image_url: "",
              })
            }
            className={`mt-1 ${inputClass}`}
          >
            <option value="">Choose a product…</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {vendorMap.get(item.vendor_id)?.stall_name} · {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Flash price (₹)
          <input
            type="number"
            min="1"
            step="1"
            value={settings.flash_price ?? ""}
            disabled={!settings.is_enabled}
            onChange={(event) =>
              setSettings({
                ...settings,
                flash_price: event.target.value ? Number(event.target.value) : null,
              })
            }
            placeholder="9"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Optional hero art
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!settings.is_enabled || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadHero(file);
            }}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-xs"
          />
          <span className="mt-1 block font-normal">
            If omitted, the selected food photo is used and styled automatically.
          </span>
        </label>
        {settings.flash_image_url || chosenItem?.photo_url ? (
          <img
            src={settings.flash_image_url || chosenItem?.photo_url || ""}
            alt="Flash-deal preview"
            className="aspect-[2/1] w-full rounded-xl object-cover"
          />
        ) : null}
        <p className="rounded-xl bg-muted/50 p-2.5 text-[10px] font-medium text-muted-foreground">
          The CTA opens the 99 Store collection. Add this product to the active 99 Store catalog to
          keep the collection and deal in sync.
        </p>
      </div>

      <button
        type="button"
        disabled={saving || uploading}
        onClick={() => void save()}
        className="w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Saving…" : uploading ? "Uploading…" : "Save visual engine settings"}
      </button>
    </section>
  );
}
