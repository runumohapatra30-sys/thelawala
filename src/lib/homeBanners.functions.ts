import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { DynamicBanner } from "@/lib/dynamicBanners";

export const fetchHomeBanners = createServerFn({ method: "GET" }).handler(async (): Promise<DynamicBanner[]> => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return [];
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from("app_dynamic_banners")
    .select("id,media_type,media_url,media_path,target_route,height_px,aspect_ratio,border_radius,is_active,display_order,banner_format,grid_image_urls,title,subtitle,badge,theme_color,starts_at,ends_at")
    .eq("is_active", true).order("display_order").order("created_at");
  if (error) throw new Error("Promotions could not load. Please try again.");
  return (data ?? []).map((row) => ({ ...row,
    media_type: row.media_type === "video" ? "video" : "image",
    banner_format: row.banner_format === "SLIM" || row.banner_format === "4_GRID" ? row.banner_format : "HERO",
    grid_image_urls: row.grid_image_urls ?? [],
  }));
});