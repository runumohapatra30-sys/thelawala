import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TargetApp = "customer" | "vendor" | "rider";

export type SectionConfig = {
  title?: string;
  height?: number;
  rounded?: number;
  autoplay?: boolean;
  limit?: number;
  layout?: string;
  content?: "image" | "video" | "lottie" | "grid";
  gap?: number;
  padding?: number;
  fontScale?: number;
  fullWidth?: boolean;
  buttonSize?: "sm" | "md" | "lg";
  buttonColor?: string;
};


export type PageSection = {
  id: string;
  type: string;
  is_visible: boolean;
  order: number;
  config: SectionConfig;
};

export const PAGES: Record<TargetApp, { key: string; label: string }[]> = {
  customer: [
    { key: "home", label: "Home page" },
    { key: "profile", label: "Profile" },
    { key: "order_details", label: "Order details" },
  ],
  vendor: [
    { key: "dashboard", label: "Home page" },
    { key: "profile", label: "Profile" },
  ],
  rider: [
    { key: "dashboard", label: "Home page" },
    { key: "earnings", label: "Earnings" },
  ],
};

/** Friendly names shown in the studio for every section that apps can render. */
export const SECTION_LABELS: Record<string, string> = {
  smart_asset: "AI smart banner",
  dynamic_banner: "Studio banner (photo / video)",
  banner_carousel: "Offer banner slider",
  festive: "Festive campaign",
  festive_sections: "Festive grid & product picks",
  quick_bites: "Quick bites",
  trending_stalls: "Trending stalls",
  rider_earnings_card: "Rider earnings card",
  rider_active_trip: "Active trip",
  rider_shifts: "Shifts",
  vendor_stats: "Stall statistics",
  vendor_active_orders: "Live order queue",
  vendor_settings: "Stall settings",
  profile_header: "Profile header",
  profile_actions: "Profile actions",
  order_summary: "Order summary",
  order_tracking: "Live tracking",
};

const mk = (type: string, order: number, config: SectionConfig = {}): PageSection => ({
  id: `sec_${order}_${type}`,
  type,
  is_visible: true,
  order,
  config,
});

export function defaultSections(app: TargetApp, page: string): PageSection[] {
  if (app === "customer" && page === "home") {
    return [
      mk("smart_asset", 1, { content: "image" }),
      mk("dynamic_banner", 2, { height: 140, rounded: 16, content: "video" }),
      mk("banner_carousel", 3, { height: 140, rounded: 16, autoplay: true, content: "image" }),
      mk("festive", 4),
      mk("quick_bites", 5, { title: "Quick bites", layout: "circle_rail" }),
      mk("festive_sections", 6),
      mk("trending_stalls", 7, { title: "Trending stalls", limit: 6, content: "grid" }),
    ];
  }
  if (app === "customer" && page === "profile") {
    return [mk("profile_header", 1), mk("profile_actions", 2)];
  }
  if (app === "customer" && page === "order_details") {
    return [mk("order_tracking", 1), mk("order_summary", 2)];
  }
  if (app === "vendor") {
    return page === "profile"
      ? [mk("vendor_settings", 1)]
      : [mk("vendor_stats", 1), mk("vendor_settings", 2), mk("vendor_active_orders", 3)];
  }
  return page === "earnings"
    ? [mk("rider_earnings_card", 1)]
    : [mk("rider_earnings_card", 1), mk("rider_active_trip", 2), mk("rider_shifts", 3)];
}

function normalise(raw: unknown, app: TargetApp, page: string): PageSection[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultSections(app, page);
  const out: PageSection[] = [];
  raw.forEach((r, i) => {
    const s = r as Partial<PageSection>;
    if (!s || typeof s.type !== "string") return;
    out.push({
      id: typeof s.id === "string" ? s.id : `sec_${i}`,
      type: s.type,
      is_visible: s.is_visible !== false,
      order: typeof s.order === "number" ? s.order : i + 1,
      config: (s.config ?? {}) as SectionConfig,
    });
  });
  return out.length ? out.sort((a, b) => a.order - b.order) : defaultSections(app, page);
}

export async function loadLayout(app: TargetApp, page: string): Promise<PageSection[]> {
  const { data } = await supabase
    .from("app_page_layouts")
    .select("sections")
    .eq("target_app", app)
    .eq("page_name", page)
    .maybeSingle();
  return normalise(data?.sections, app, page);
}

export async function saveLayout(app: TargetApp, page: string, sections: PageSection[]) {
  const payload = sections.map((s, i) => ({ ...s, order: i + 1 }));
  const { error } = await supabase
    .from("app_page_layouts")
    .upsert(
      { target_app: app, page_name: page, sections: payload, updated_at: new Date().toISOString() },
      { onConflict: "target_app,page_name" },
    );
  return error?.message ?? null;
}

/**
 * Live layout for a screen. Refreshes on admin publish (realtime) and whenever an
 * installed app comes back to the foreground, so reopening the PWA shows new banners.
 */
export function usePageLayout(app: TargetApp, page: string) {
  const [sections, setSections] = useState<PageSection[] | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = () => {
      loadLayout(app, page).then((s) => { if (alive) setSections(s); });
    };
    pull();

    const onVisible = () => { if (document.visibilityState === "visible") pull(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", pull);

    const channel = supabase
      .channel(`layout-${app}-${page}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_page_layouts" }, pull)
      .subscribe();

    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", pull);
      supabase.removeChannel(channel);
    };
  }, [app, page]);

  return sections ?? defaultSections(app, page);
}
