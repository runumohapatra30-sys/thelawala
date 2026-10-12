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

export async function readSoundboxProductSettings() {
  const { data, error } = await supabase
    .from("soundbox_product_settings")
    .select("front_image_url,back_image_url,packaging_image_url,is_in_stock")
    .eq("id", true)
    .maybeSingle();

  if (error) throw error;

  return data ?? EMPTY_SOUNDBOX_PRODUCT;
}

export async function updateSoundboxProductSettings(update: SoundboxProductSettingsUpdate) {
  const { error } = await supabase
    .from("soundbox_product_settings")
    .upsert({ id: true, ...update }, { onConflict: "id" });

  if (error) throw error;
}
