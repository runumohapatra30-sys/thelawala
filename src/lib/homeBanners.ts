import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchHomeBanners } from "@/lib/homeBanners.functions";

export const homeBannersQuery = queryOptions({
  queryKey: ["home-live-banners"], queryFn: () => fetchHomeBanners(), staleTime: 30_000,
});

export function useHomeBanners() {
  const { data } = useSuspenseQuery(homeBannersQuery);
  const queryClient = useQueryClient();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: homeBannersQuery.queryKey }); };
    const channel = supabase.channel("home-live-banner-schedule")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_dynamic_banners" }, refresh).subscribe();
    window.addEventListener("focus", refresh);
    // Also reconcile missed realtime messages after a sleeping/background tab.
    const timer = window.setInterval(refresh, 30_000);
    return () => { void supabase.removeChannel(channel); window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [queryClient]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const boundaries = data.flatMap((row) => [row.starts_at, row.ends_at]).filter((date): date is string => Boolean(date))
      .map((date) => Date.parse(date)).filter((time) => time > Date.now());
    const delay = boundaries.length ? Math.min(...boundaries) - Date.now() + 25 : 60_000;
    const timer = window.setTimeout(update, Math.min(Math.max(delay, 25), 60_000));
    return () => window.clearTimeout(timer);
  }, [data, now]);
  return data.filter((row) => {
    if (now === null) return !row.starts_at && !row.ends_at;
    return (!row.starts_at || Date.parse(row.starts_at) <= now) && (!row.ends_at || Date.parse(row.ends_at) > now);
  });
}