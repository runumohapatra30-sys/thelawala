import { supabase } from "@/integrations/supabase/client";

export type DynamicBanner = {
  id: string;
  media_type: "image" | "video";
  media_url: string;
  media_path: string | null;
  target_route: string | null;
  height_px: number;
  aspect_ratio: string;
  border_radius: number;
  is_active: boolean;
  display_order: number;
};

const COLS =
  "id,media_type,media_url,media_path,target_route,height_px,aspect_ratio,border_radius,is_active,display_order";

export async function listDynamicBanners(onlyActive: boolean): Promise<DynamicBanner[]> {
  let q = supabase
    .from("app_dynamic_banners")
    .select(COLS)
    .order("display_order")
    .order("created_at");
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []) as DynamicBanner[];
}

/** Uploads a banner picture or short video and returns its path plus a long-lived signed URL. */
export async function uploadBannerMedia(file: File) {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const path = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from("banners").upload(path, file, { contentType: file.type });
  if (up.error) return { error: up.error.message };
  const signed = await supabase.storage
    .from("banners")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signed.error || !signed.data) {
    return { error: signed.error?.message ?? "Could not read the uploaded file." };
  }
  return { path, url: signed.data.signedUrl };
}

export const ratioLabel = (w: number, h: number) =>
  h > 0 ? `${(w / h).toFixed(1)}:1` : "—";
