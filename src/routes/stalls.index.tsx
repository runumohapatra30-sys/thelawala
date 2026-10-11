import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Beef, Leaf, MapPin, Star, Tag, Timer } from "lucide-react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { haversineKm } from "@/lib/geo";
import { foodImage } from "@/lib/foodImage";
import { useAuthBranding } from "@/lib/authBranding";

export const Route = createFileRoute("/stalls/")({
  head: () => ({
    meta: [
      { title: "Local stalls — ThelaWala" },
      { name: "description", content: "Discover verified local food stalls near you." },
    ],
  }),
  component: StallsDirectory,
});

type Stall = {
  id: string;
  stall_name: string;
  is_open: boolean;
  photo_url: string | null;
  stall_photos: string[];
  address: string | null;
  lat: number;
  lng: number;
  zone: string | null;
  default_prep_minutes: number;
  offer_percent: number;
};

type StallFilter = "ALL" | "NEAREST" | "VEG" | "NONVEG" | "OFFERS" | "RATING";

function StallsDirectory() {
  const { user } = useSession();
  const userId = user?.id;
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StallFilter>("ALL");
  const [vegStallIds, setVegStallIds] = useState<Set<string>>(new Set());
  const [nonVegStallIds, setNonVegStallIds] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const branding = useAuthBranding();

  useEffect(() => {
    let alive = true;
    void Promise.all([
      supabase
        .from("vendors")
        .select("id,stall_name,is_open,photo_url,stall_photos,address,lat,lng,zone,default_prep_minutes,offer_percent")
        .eq("status", "APPROVED")
        .order("stall_name"),
      userId
        ? supabase.from("addresses").select("lat,lng").eq("user_id", userId).order("is_default", { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]).then(async ([stallsResult, addressResult]) => {
      if (!alive) return;
      if (stallsResult.error) {
        console.error("Could not load verified stalls:", stallsResult.error);
        setLoading(false);
        return;
      } else {
        setStalls((stallsResult.data ?? []) as Stall[]);
      }
      const stallIds = (stallsResult.data ?? []).map((stall) => stall.id);
      if (stallIds.length) {
        const [menuResult, ratingsResult] = await Promise.all([
          supabase.from("menu_items").select("vendor_id,food_type").in("vendor_id", stallIds),
          supabase.from("order_ratings").select("vendor_id,food_stars").in("vendor_id", stallIds),
        ]);
        if (!alive) return;
        if (menuResult.error) console.error("Could not load stall food filters:", menuResult.error);
        else {
          const veg = new Set<string>();
          const nonVeg = new Set<string>();
          for (const item of menuResult.data ?? []) {
            if (item.food_type === "VEG") veg.add(item.vendor_id);
            if (item.food_type === "NONVEG") nonVeg.add(item.vendor_id);
          }
          setVegStallIds(veg);
          setNonVegStallIds(nonVeg);
        }
        if (ratingsResult.error) console.error("Could not load stall ratings:", ratingsResult.error);
        else {
          const totals = new Map<string, { total: number; count: number }>();
          for (const rating of ratingsResult.data ?? []) {
            if (!rating.vendor_id) continue;
            const aggregate = totals.get(rating.vendor_id) ?? { total: 0, count: 0 };
            aggregate.total += Number(rating.food_stars);
            aggregate.count += 1;
            totals.set(rating.vendor_id, aggregate);
          }
          setRatings(Object.fromEntries([...totals].map(([id, aggregate]) => [id, aggregate.total / aggregate.count])));
        }
      }
      const address = addressResult.data;
      if (address?.lat != null && address.lng != null) setOrigin({ lat: Number(address.lat), lng: Number(address.lng) });
      if (!address) {
        try {
          const saved = localStorage.getItem("tw_last_location");
          if (saved) {
            const point = JSON.parse(saved) as { lat?: number; lng?: number };
            if (Number(point.lat) && Number(point.lng)) setOrigin({ lat: Number(point.lat), lng: Number(point.lng) });
          }
        } catch {
          // Location is optional for the directory.
        }
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const orderedStalls = stalls
    .filter((stall) => {
      if (filter === "VEG") return vegStallIds.has(stall.id) && !nonVegStallIds.has(stall.id);
      if (filter === "NONVEG") return nonVegStallIds.has(stall.id);
      if (filter === "OFFERS") return Number(stall.offer_percent) > 0;
      if (filter === "RATING") return (ratings[stall.id] ?? 0) >= 4;
      return true;
    })
    .sort((a, b) => {
      if (filter === "NEAREST" && origin) return haversineKm(origin, a) - haversineKm(origin, b);
      return Number(b.is_open) - Number(a.is_open) || a.stall_name.localeCompare(b.stall_name);
    });
  const filters: { key: StallFilter; label: string; Icon?: typeof MapPin }[] = [
    { key: "NEAREST", label: "Nearest", Icon: MapPin },
    { key: "VEG", label: "Pure Veg", Icon: Leaf },
    { key: "NONVEG", label: "Non-Veg", Icon: Beef },
    { key: "OFFERS", label: "Discounts & Offers", Icon: Tag },
    { key: "RATING", label: "Rating 4.0+", Icon: Star },
  ];

  return (
    <Shell>
      <PortalHeader title="Local stalls" subtitle="Meet the makers behind your favourites" />
      <main className="space-y-4 px-4 pb-8 pt-4">
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2" aria-label="Filter stalls">
            {filters.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter((current) => current === key ? "ALL" : key)}
                aria-pressed={filter === key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold ${
                  filter === key ? "border-primary bg-primary text-white" : "border-border bg-white text-foreground"
                }`}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="grid gap-4" aria-live="polite">
            {[0, 1, 2].map((id) => <div key={id} className="h-56 animate-pulse rounded-3xl bg-muted" />)}
          </div>
        ) : orderedStalls.length ? (
          orderedStalls.map((stall) => {
            const cover = stall.stall_photos?.[0] || stall.photo_url || foodImage(stall.stall_name);
            const distance = origin ? haversineKm(origin, stall) : null;
            const logo = branding.stallLogos[stall.id] || stall.photo_url || foodImage(stall.stall_name);
            return (
              <Link
                key={stall.id}
                to="/stalls/$id"
                params={{ id: stall.id }}
                className="group block overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition-transform active:scale-[0.99]"
              >
                <div className="relative h-36 bg-muted">
                  <img src={cover} alt={`${stall.stall_name} cover`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = foodImage(stall.stall_name); }} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className={`absolute right-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${stall.is_open ? "bg-[#E8F5EC] text-[#16803C]" : "bg-white/90 text-muted-foreground"}`}>
                    {stall.is_open ? "Open Now" : "Closed"}
                  </span>
                </div>
                <div className="relative px-4 pb-4 pt-10">
                  <span className="absolute -top-8 left-4 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-sm">
                    <img src={logo} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = foodImage(stall.stall_name); }} className="h-full w-full object-cover" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-extrabold text-foreground">{stall.stall_name}</h2>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{stall.address || stall.zone || "Local favourite"}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E8F5EC] px-2.5 py-1 text-[10px] font-extrabold text-[#16803C]">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  </div>
                  {ratings[stall.id] != null ? <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600"><Star className="h-3 w-3 fill-current" />{ratings[stall.id]!.toFixed(1)}</span> : null}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" />{distance == null ? "Set address for distance" : `${distance.toFixed(1)} km away`}</span>
                    <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5 text-primary" />{stall.default_prep_minutes || 20} min prep</span>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-border px-5 py-12 text-center">
            <p className="text-base font-extrabold">No stalls nearby yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Check back soon for more local favourites.</p>
          </div>
        )}
      </main>
    </Shell>
  );
}
