import { supabase } from "@/integrations/supabase/client";

export type Banner = {
  id: string;
  image_url: string;
  image_path: string | null;
  target_type: string;
  vendor_id: string | null;
  category_id: string | null;
  priority: number;
  is_active: boolean;
};

export type PromoCard = {
  title: string;
  subtitle: string;
  image_url: string;
  redirect_category_or_filter: string;
};

export type Campaign = {
  id: string;
  title: string;
  is_active: boolean;
  theme_bg_color: string | null;
  theme_bg_image_url: string | null;
  top_tab_icon_url: string | null;
  top_tab_label: string | null;
  promo_cards: PromoCard[];
  deals_section_active: boolean;
};

const BANNER_COLS = "id,image_url,image_path,target_type,vendor_id,category_id,priority,is_active";
const CAMPAIGN_COLS =
  "id,title,is_active,theme_bg_color,theme_bg_image_url,top_tab_icon_url,top_tab_label,promo_cards,deals_section_active";

export function toPromoCards(value: unknown): PromoCard[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      title: String(v["title"] ?? ""),
      subtitle: String(v["subtitle"] ?? ""),
      image_url: String(v["image_url"] ?? ""),
      redirect_category_or_filter: String(v["redirect_category_or_filter"] ?? ""),
    }));
}

export async function listBanners(onlyActive: boolean): Promise<Banner[]> {
  let q = supabase.from("banners").select(BANNER_COLS).order("priority").order("created_at");
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []) as Banner[];
}

export async function listCampaigns(onlyActive: boolean): Promise<Campaign[]> {
  let q = supabase.from("campaigns").select(CAMPAIGN_COLS).order("created_at", { ascending: false });
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []).map((c) => ({ ...c, promo_cards: toPromoCards(c.promo_cards) })) as Campaign[];
}

export async function activeCampaign(): Promise<Campaign | null> {
  const all = await listCampaigns(true);
  return all[0] ?? null;
}

/** Uploads a banner picture and returns its storage path plus a long-lived signed URL. */
export async function uploadBannerImage(file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from("banners").upload(path, file, { contentType: file.type });
  if (up.error) return { error: up.error.message };
  const signed = await supabase.storage.from("banners").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signed.error || !signed.data) return { error: signed.error?.message ?? "Could not read the uploaded picture." };
  return { path, url: signed.data.signedUrl };
}
