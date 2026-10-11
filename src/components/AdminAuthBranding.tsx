import { useEffect, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_AUTH_BRANDING,
  loadAuthBranding,
  saveAuthBranding,
  uploadAuthBrandingImage,
  type AuthBranding,
} from "@/lib/authBranding";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

export function AdminAuthBranding() {
  const [branding, setBranding] = useState<AuthBranding>(DEFAULT_AUTH_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"hero" | "logo" | "app-logo" | "stall-logo" | null>(null);
  const [stalls, setStalls] = useState<{ id: string; stall_name: string }[]>([]);
  const [selectedStallId, setSelectedStallId] = useState("");

  useEffect(() => {
    void supabase.from("vendors").select("id,stall_name").order("stall_name").then(({ data, error }) => {
      if (error) {
        toast.error("Could not load stalls for logo settings.");
        console.error("Could not load stalls for branding settings:", error);
        return;
      }
      const rows = data ?? [];
      setStalls(rows);
      setSelectedStallId(rows[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    let alive = true;
    void loadAuthBranding()
      .then((config) => {
        if (alive) setBranding(config);
      })
      .catch((error: unknown) => {
        if (alive)
          toast.error(error instanceof Error ? error.message : "Could not load auth branding.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function upload(file: File | undefined, kind: "hero" | "logo" | "app-logo" | "stall-logo") {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadAuthBrandingImage(file, kind);
      setBranding((current) => {
        if (kind === "hero") return { ...current, loginHeroImage: url };
        if (kind === "logo") return { ...current, logoUrl: url };
        if (kind === "app-logo") return { ...current, appLogoUrl: url };
        return selectedStallId
          ? { ...current, stallLogos: { ...current.stallLogos, [selectedStallId]: url } }
          : current;
      });
      toast.success("Image uploaded. Save branding to publish it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (!branding.brandTitle.trim()) {
      toast.error("Enter a brand title.");
      return;
    }
    setSaving(true);
    try {
      await saveAuthBranding({ ...branding, brandTitle: branding.brandTitle.trim() });
      toast.success("Auth branding saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save auth branding.");
    } finally {
      setSaving(false);
    }
  }

  function setStallLogo(url: string) {
    if (!selectedStallId) return;
    setBranding((current) => {
      const stallLogos = { ...current.stallLogos };
      if (url.trim()) stallLogos[selectedStallId] = url;
      else delete stallLogos[selectedStallId];
      return { ...current, stallLogos };
    });
  }

  return (
    <section className="card-soft space-y-3 border border-border p-4">
      <div>
        <h2 className="text-sm font-extrabold">Sign-in branding</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Configure the welcome image and brand mark used on customer sign-in.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
          Login Hero Image URL
        </span>
        <input
          value={branding.loginHeroImage}
          onChange={(event) =>
            setBranding((current) => ({ ...current, loginHeroImage: event.target.value }))
          }
          placeholder="/food/food-biryani.jpg"
          className={inputClass}
        />
      </label>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 px-3 py-2.5 text-xs font-bold text-primary">
        <ImagePlus className="h-4 w-4" />
        {uploading === "hero" ? "Uploading hero…" : "Upload hero image"}
        <input
          type="file"
          accept="image/*"
          disabled={uploading !== null}
          onChange={(event) => {
            void upload(event.currentTarget.files?.[0], "hero");
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />
      </label>

      <div className="space-y-2 rounded-xl border border-border p-3">
        <p className="text-xs font-extrabold">App header logo</p>
        <input
          value={branding.appLogoUrl}
          onChange={(event) => setBranding((current) => ({ ...current, appLogoUrl: event.target.value }))}
          placeholder="https://… or leave blank for the default mark"
          className={inputClass}
        />
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 px-3 py-2.5 text-xs font-bold text-primary">
          <Upload className="h-4 w-4" />
          {uploading === "app-logo" ? "Uploading app logo…" : "Upload app header logo"}
          <input
            type="file"
            accept="image/*,.svg"
            disabled={uploading !== null}
            onChange={(event) => {
              void upload(event.currentTarget.files?.[0], "app-logo");
              event.currentTarget.value = "";
            }}
            className="sr-only"
          />
        </label>
      </div>

      <div className="space-y-2 rounded-xl border border-border p-3">
        <p className="text-xs font-extrabold">Stall custom logos</p>
        <select
          value={selectedStallId}
          onChange={(event) => setSelectedStallId(event.target.value)}
          className={inputClass}
          disabled={!stalls.length}
        >
          {stalls.length
            ? stalls.map((stall) => <option key={stall.id} value={stall.id}>{stall.stall_name}</option>)
            : <option value="">No stalls available</option>}
        </select>
        <input
          value={branding.stallLogos[selectedStallId] ?? ""}
          onChange={(event) => setStallLogo(event.target.value)}
          placeholder="Stall logo URL"
          className={inputClass}
          disabled={!selectedStallId}
        />
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 px-3 py-2.5 text-xs font-bold text-primary">
          <Upload className="h-4 w-4" />
          {uploading === "stall-logo" ? "Uploading stall logo…" : "Upload selected stall logo"}
          <input
            type="file"
            accept="image/*,.svg"
            disabled={uploading !== null || !selectedStallId}
            onChange={(event) => {
              void upload(event.currentTarget.files?.[0], "stall-logo");
              event.currentTarget.value = "";
            }}
            className="sr-only"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
          App Logo / Branding URL
        </span>
        <input
          value={branding.logoUrl}
          onChange={(event) =>
            setBranding((current) => ({ ...current, logoUrl: event.target.value }))
          }
          placeholder="https://… or leave blank for the ThelaWala mark"
          className={inputClass}
        />
      </label>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 px-3 py-2.5 text-xs font-bold text-primary">
        <Upload className="h-4 w-4" />
        {uploading === "logo" ? "Uploading logo…" : "Upload logo or SVG"}
        <input
          type="file"
          accept="image/*,.svg"
          disabled={uploading !== null}
          onChange={(event) => {
            void upload(event.currentTarget.files?.[0], "logo");
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
          Brand title
        </span>
        <input
          value={branding.brandTitle}
          onChange={(event) =>
            setBranding((current) => ({ ...current, brandTitle: event.target.value }))
          }
          maxLength={48}
          className={inputClass}
        />
      </label>

      {branding.loginHeroImage ? (
        <img
          src={branding.loginHeroImage}
          alt="Login hero preview"
          className="h-32 w-full rounded-2xl object-cover"
        />
      ) : null}
      <button
        type="button"
        disabled={loading || saving || uploading !== null}
        onClick={() => void save()}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Loading branding…" : saving ? "Saving…" : "Save branding"}
      </button>
    </section>
  );
}
