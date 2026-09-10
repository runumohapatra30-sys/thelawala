import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SectionType = "FESTIVE_GRID_4" | "FESTIVE_PICKS_PRODUCTS";

export type GridCard = { title: string; image_url: string; filter: string; tag: string };

export type HomeSection = {
  id: string;
  section_type: SectionType;
  title: string;
  subtitle: string | null;
  bg_color: string | null;
  bg_image_url: string | null;
  cards: GridCard[];
  item_ids: string[];
  is_active: boolean;
  display_order: number;
};

const COLS =
  "id,section_type,title,subtitle,bg_color,bg_image_url,cards,item_ids,is_active,display_order";

export function toCards(value: unknown): GridCard[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      title: String(v["title"] ?? ""),
      image_url: String(v["image_url"] ?? ""),
      filter: String(v["filter"] ?? ""),
    }));
}

export async function listHomeSections(onlyActive: boolean): Promise<HomeSection[]> {
  let q = supabase
    .from("home_dynamic_sections")
    .select(COLS)
    .order("display_order")
    .order("created_at");
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    ...r,
    cards: toCards(r.cards),
    item_ids: (r.item_ids ?? []) as string[],
  })) as HomeSection[];
}

/** Live list of published festive sections; refreshes instantly when an admin publishes. */
export function useHomeSections() {
  const [rows, setRows] = useState<HomeSection[]>([]);

  useEffect(() => {
    let alive = true;
    const pull = () => {
      listHomeSections(true).then((r) => { if (alive) setRows(r); });
    };
    pull();
    const onVisible = () => { if (document.visibilityState === "visible") pull(); };
    document.addEventListener("visibilitychange", onVisible);
    const channel = supabase
      .channel("home-dynamic-sections")
      .on("postgres_changes", { event: "*", schema: "public", table: "home_dynamic_sections" }, pull)
      .subscribe();
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  return rows;
}

/** Uploads a festive picture and returns a long-lived signed link. */
export async function uploadSectionImage(file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `festive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from("banners").upload(path, file, { contentType: file.type });
  if (up.error) return { error: up.error.message };
  const signed = await supabase.storage.from("banners").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signed.error || !signed.data) return { error: signed.error?.message ?? "Could not read the picture." };
  return { path, url: signed.data.signedUrl };
}
