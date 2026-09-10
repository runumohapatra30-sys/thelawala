import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FestivePhoto = {
  id: string;
  image_url: string;
  link_url: string | null;
  size_mode: "FULL" | "COMPACT";
  display_order: number;
  is_active: boolean;
};

export const MAX_FESTIVE_PHOTOS = 5;

const COLS = "id,image_url,link_url,size_mode,display_order,is_active";

export async function listFestivePhotos(onlyActive: boolean): Promise<FestivePhoto[]> {
  let q = supabase.from("home_festive_photos").select(COLS).order("display_order").order("created_at");
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    ...r,
    size_mode: r.size_mode === "COMPACT" ? "COMPACT" : "FULL",
  })) as FestivePhoto[];
}

/** Live festive photos, refreshed instantly whenever an admin publishes a change. */
export function useFestivePhotos() {
  const [rows, setRows] = useState<FestivePhoto[]>([]);

  useEffect(() => {
    let alive = true;
    const pull = () => { listFestivePhotos(true).then((r) => { if (alive) setRows(r); }); };
    pull();
    const onVisible = () => { if (document.visibilityState === "visible") pull(); };
    document.addEventListener("visibilitychange", onVisible);
    const channel = supabase
      .channel("home-festive-photos")
      .on("postgres_changes", { event: "*", schema: "public", table: "home_festive_photos" }, pull)
      .subscribe();
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  return rows;
}
