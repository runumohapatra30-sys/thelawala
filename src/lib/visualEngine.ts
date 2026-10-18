import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VisualEngineSettings = {
  id: number;
  is_enabled: boolean;
  flash_deal_enabled: boolean;
  flash_menu_item_id: string | null;
  flash_price: number | null;
  flash_image_url: string | null;
  updated_at: string;
};

export const DEFAULT_VISUAL_ENGINE_SETTINGS: VisualEngineSettings = {
  id: 1,
  is_enabled: false,
  flash_deal_enabled: false,
  flash_menu_item_id: null,
  flash_price: null,
  flash_image_url: null,
  updated_at: "",
};

export async function loadVisualEngineSettings(): Promise<VisualEngineSettings> {
  const { data, error } = await supabase
    .from("app_visual_engine_settings")
    .select(
      "id,is_enabled,flash_deal_enabled,flash_menu_item_id,flash_price,flash_image_url,updated_at",
    )
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return (data as VisualEngineSettings | null) ?? DEFAULT_VISUAL_ENGINE_SETTINGS;
}

export function useVisualEngineSettings() {
  const [settings, setSettings] = useState(DEFAULT_VISUAL_ENGINE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = () => {
      void loadVisualEngineSettings()
        .then((next) => {
          if (!alive) return;
          setSettings(next);
          setError(null);
          setLoading(false);
        })
        .catch((loadError: unknown) => {
          console.error("Could not load visual engine settings:", loadError);
          if (!alive) return;
          setSettings(DEFAULT_VISUAL_ENGINE_SETTINGS);
          setError("Automated visual features could not be checked.");
          setLoading(false);
        });
    };
    pull();
    const channel = supabase
      .channel("visual-engine-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_visual_engine_settings" },
        pull,
      )
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading, error };
}
