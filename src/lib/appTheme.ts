import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const BRAND_FOREST = "#0A4D3C";

export type ThemeToken = "SKY_BLUE" | "WARM_OCHRE" | "DEFAULT_YELLOW";

export type ThemeConfig = {
  id: string;
  theme_token: ThemeToken;
  current_bg_color: string;
  temporary_bg_color: string | null;
  is_temporary_active: boolean;
  temporary_expires_at: string | null;
  header_height_px: number;
  header_bg_image_url: string | null;
  festive_style_active: boolean;
};

const COLS = "id,theme_token,current_bg_color,temporary_bg_color,is_temporary_active,temporary_expires_at,header_height_px,header_bg_image_url,festive_style_active";

/** Server-driven header/grid looks. Admin picks one; every app updates instantly. */
export const THEME_TOKENS: {
  token: ThemeToken;
  label: string;
  wrapper: string;
  card: string;
  swatch: string;
}[] = [
  {
    token: "SKY_BLUE",
    label: "Sky Blue",
    wrapper: "bg-gradient-to-b from-[#5B9BD5] via-[#D5E8F6] to-[#F8F9FA] text-[#1E232A]",
    card: "bg-[#D5E8F6] text-[#1E232A] border border-[#5B9BD5]",
    swatch: "linear-gradient(180deg,#5B9BD5,#D5E8F6)",
  },
  {
    token: "WARM_OCHRE",
    label: "Leaf Green",
    wrapper: "bg-gradient-to-b from-[#0F4C3A] via-[#558B2F] to-[#689F38] text-white",
    card: "bg-white/90 text-[#1E232A] border border-[#E2E8F0]",
    swatch: "linear-gradient(180deg,#0F4C3A,#689F38)",
  },
  {
    token: "DEFAULT_YELLOW",
    label: "Forest Green",
    wrapper: "text-brand-foreground",
    card: "bg-card/85 text-foreground border border-card/60",
    swatch: BRAND_FOREST,
  },
];

export function themeStyle(token: ThemeToken | null | undefined) {
  return THEME_TOKENS.find((t) => t.token === token) ?? THEME_TOKENS[2]!;
}

export const THEME_PRESETS: { label: string; color: string }[] = [
  { label: "Forest Green", color: BRAND_FOREST },
  { label: "Sky Blue", color: "#5B9BD5" },
  { label: "Leaf Green", color: "#689F38" },
  { label: "Dark Emerald", color: "#0F4C3A" },
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
  if (!cfg) return BRAND_FOREST;
  const notExpired =
    !cfg.temporary_expires_at || new Date(cfg.temporary_expires_at).getTime() > Date.now();
  if (cfg.is_temporary_active && cfg.temporary_bg_color && notExpired) return cfg.temporary_bg_color;
  return cfg.current_bg_color || BRAND_FOREST;
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
