import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useVisualEngineSettings } from "@/lib/visualEngine";
import { useState } from "react";

export function AdminHomePresentation() {
  const { settings, loading } = useVisualEngineSettings();
  const [busy, setBusy] = useState(false);
  const controls = [{ key: "spotlight_enabled", label: "Local Spotlight" }, { key: "best_value_enabled", label: "Best value" }, { key: "rain_animation_enabled", label: "Live rain animation" }] as const;
  async function change(key: typeof controls[number]["key"], value: boolean) {
    setBusy(true);
    const patch: Partial<Pick<typeof settings, typeof controls[number]["key"]>> = {};
    patch[key] = value;
    const { error } = await supabase.from("app_visual_engine_settings").update(patch).eq("id", 1).select("id").single();
    setBusy(false);
    if (error) toast.error("Could not save the home display setting.");
    else toast.success("Home display updated.");
  }
  return <section className="space-y-3 border-b border-border pb-4"><h3 className="text-sm font-bold">Home promotion panels</h3>{controls.map(({ key, label }) => <label key={key} className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><Switch aria-label={label} checked={settings[key]} disabled={loading || busy} onCheckedChange={(value) => void change(key, value)} /></label>)}</section>;
}