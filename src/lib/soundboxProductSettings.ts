import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type SoundboxProductSettings = {
  front_image_url: string | null;
  back_image_url: string | null;
  packaging_image_url: string | null;
  is_in_stock: boolean;
};

export type SoundboxProductSettingsUpdate = Partial<SoundboxProductSettings>;

export const EMPTY_SOUNDBOX_PRODUCT: SoundboxProductSettings = {
  front_image_url: null,
  back_image_url: null,
  packaging_image_url: null,
  is_in_stock: false,
};

function isMissingProductSettingsTable(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.includes("soundbox_product_settings")
  );
}

function parseProductSettings(value: Json | null): SoundboxProductSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_SOUNDBOX_PRODUCT;
  }
  const settings = value["soundbox_product"];
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return EMPTY_SOUNDBOX_PRODUCT;
  }
  return {
    front_image_url:
      typeof settings["front_image_url"] === "string" ? settings["front_image_url"] : null,
    back_image_url:
      typeof settings["back_image_url"] === "string" ? settings["back_image_url"] : null,
    packaging_image_url:
      typeof settings["packaging_image_url"] === "string" ? settings["packaging_image_url"] : null,
    is_in_stock: settings["is_in_stock"] === true,
  };
}

async function readMetadataFallback() {
  const { data, error } = await supabase
    .from("system_settings")
    .select("soundbox_product")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return parseProductSettings(data?.soundbox_product ?? null);
}

export async function readSoundboxProductSettings() {
  const { data, error } = await supabase
    .from("soundbox_product_settings")
    .select("front_image_url,back_image_url,packaging_image_url,is_in_stock")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    if (!isMissingProductSettingsTable(error)) throw error;
    return readMetadataFallback();
  }

  return data ?? EMPTY_SOUNDBOX_PRODUCT;
}

export async function updateSoundboxProductSettings(update: SoundboxProductSettingsUpdate) {
  const { error } = await supabase
    .from("soundbox_product_settings")
    .upsert({ id: true, ...update }, { onConflict: "id" });

  if (!error) return;
  if (!isMissingProductSettingsTable(error)) throw error;

  const current = await readMetadataFallback();
  const next = { ...current, ...update };
  const soundboxProduct: Json = {
    front_image_url: next.front_image_url,
    back_image_url: next.back_image_url,
    packaging_image_url: next.packaging_image_url,
    is_in_stock: next.is_in_stock,
  };
  const { error: fallbackError } = await supabase
    .from("system_settings")
    .update({ soundbox_product: soundboxProduct })
    .eq("id", true);
  if (fallbackError) throw fallbackError;
}
