import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const BRAND_YELLOW = "#FACC15";

export type ThemeConfig = {
  id: string;
  current_bg_color: string;
  temporary_bg_color: string | null;
  is_temporary_active: boolean;
  temporary_expires_at: string | null;
  header_height_px: number;
  header_bg_image_url: string | null;
  festive_style_active: boolean;
};

const COLS = "id,current_bg_color,temporary_bg_color,is_temporary_active,temporary_expires_at,header_height_px,header_bg_image_url,festive_style_active";

export const THEME_PRESETS: { label: string; color: string }[] = [
  { label: "Brand Yellow", color: BRAND_YELLOW },
  { label: "Festive Orange", color: "#FB923C" },
  { label: "Crimson Red", color: "#DC2626" },
  { label: "Royal Blue", color: "#2563EB" },
];

export async function loadThemeConfig(): Promise<ThemeConfig | null> {
  const { data } = await supabase
    .from("app_theme_config")
    .select(COLS)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ThemeConfig) ?? null;
}

/** Colour that should be showing right now, honouring a temporary override window. */
export function activeThemeColor(cfg: ThemeConfig | null): string {
  if (!cfg) return BRAND_YELLOW;
  const notExpired =
    !cfg.temporary_expires_at || new Date(cfg.temporary_expires_at).getTime() > Date.now();
  if (cfg.is_temporary_active && cfg.temporary_bg_color && notExpired) return cfg.temporary_bg_color;
  return cfg.current_bg_color || BRAND_YELLOW;
}

/** Live top-bar colour: realtime on admin changes and auto-reverts when the override expires. */
export function useTopBarColor(): string {
  return activeThemeColor(useTopBarTheme());
}

/** Live top-bar appearance, including the admin-controlled size and picture. */
export function useTopBarTheme(): ThemeConfig | null {
  const [cfg, setCfg] = useState<ThemeConfig | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    let alive = true;
    const pull = () => { loadThemeConfig().then((c) => { if (alive) setCfg(c); }); };
    pull();
    const onVisible = () => { if (document.visibilityState === "visible") pull(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => tick((n) => n + 1), 30000);
    const channel = supabase
      .channel("app-theme-config")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_theme_config" }, pull)
      .subscribe();
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  return cfg;
}
