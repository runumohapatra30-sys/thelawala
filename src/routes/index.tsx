import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActiveOrderTracker } from "@/components/ActiveOrderTracker";
import { HomeChat } from "@/components/HomeChat";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { cart, cartTotals, useCart } from "@/lib/cart";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import { foodImage } from "@/lib/foodImage";
import { useSession } from "@/lib/session";
import { BannerCarousel } from "@/components/BannerCarousel";
import { FestiveWidget } from "@/components/FestiveWidget";
import { activeCampaign, type Campaign } from "@/lib/marketing";
import { VoiceSearch } from "@/components/VoiceSearch";
import { DynamicAssetBanner } from "@/components/DynamicAssetBanner";
import { DynamicBanners } from "@/components/DynamicBanners";
import { DynamicPageRenderer, type SectionRegistry } from "@/components/DynamicPageRenderer";
import { FestiveAmbience, FestiveHero, FestiveSections } from "@/components/FestiveSections";
import { useHomeSections } from "@/lib/homeSections";
import { FestivePhotoStrip } from "@/components/FestivePhotoStrip";
import { themeStyle, useTopBarTheme } from "@/lib/appTheme";
import { ArrowRight, Bike, Gift, Heart, MapPin, Plus, Search, ShoppingBag, Utensils, Wallet, X, Zap } from "lucide-react";
import { StreetFoodExperience, type CuratedFoodDeal, type StreetFoodCategory, type StreetFoodItem, type StreetFoodVendor } from "@/components/StreetFoodExperience";
import { PremiumHome } from "@/components/PremiumHome";
import { HomeMarketingModules } from "@/components/HomeMarketingModules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ThelaWala — Local Thela, super fast delivery in Bhubaneswar" },
      { name: "description", content: "Order bhata dali, dahi bara, rolls, chaat, biryani, momo and chai from Bhubaneswar street stalls, delivered in 15 minutes." },
      { property: "og:title", content: "ThelaWala — Local Thela | Super Fast Delivery" },
      { property: "og:description", content: "Hot food from your nearest thela, delivered in 15 minutes across Bhubaneswar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Item = StreetFoodItem;
type Category = StreetFoodCategory;
type Vendor = StreetFoodVendor;

const TINTS = [
  "bg-[color-mix(in_oklab,var(--color-brand)_28%,white)]",
  "bg-[color-mix(in_oklab,var(--color-primary)_14%,white)]",
  "bg-[color-mix(in_oklab,var(--color-destructive)_12%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-2)_16%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-5)_18%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-3)_12%,white)]",
];

const PRODUCT_TINTS = ["bg-[#E5F0E6]", "bg-[#F7F0E2]", "bg-[#FFF5C9]", "bg-[#E8EEF2]"];

const routeSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Home() {
  const { user } = useSession();
  const navigate = useNavigate();
  const lines = useCart();
  const { count, foodTotal } = cartTotals(lines);
  const regularCartTotal = lines.filter((line) => !line.promotionalMinimum).reduce((sum, line) => sum + line.price * line.qty, 0);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [deals, setDeals] = useState<CuratedFoodDeal[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReload, setCatalogReload] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [promoFocus, setPromoFocus] = useState<string | null>(null);
  const topBarTheme = useTopBarTheme();
  const theme = themeStyle(topBarTheme?.theme_token);
  const homeSections = useHomeSections();
  const festiveTheme = homeSections.find((s) => s.section_type === "FESTIVE_GRID_4" && s.cards.some((c) => c.title || c.image_url)) ?? null;
  const otherSections = festiveTheme ? homeSections.filter((s) => s.id !== festiveTheme.id) : homeSections;

  useEffect(() => {
    let alive = true;
    activeCampaign().then((value) => { if (alive) setCampaign(value); });
    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      const [categoryResult, vendorResult, itemResult, dealResult] = await Promise.all([
        supabase.from("categories").select("id,name,emoji").order("sort_order"),
        supabase.from("vendors").select("id,stall_name,is_open,photo_url,offer_percent,offer_label,address,zone,default_prep_minutes").eq("status", "APPROVED"),
        supabase.from("menu_items").select("id,vendor_id,category_id,name,details,photo_url,unit,price,mrp,in_stock,food_type").order("created_at"),
        supabase.from("curated_bundles").select("id,menu_item_id,item_name,offer_price,original_price,image_url,tag,bundle_title,bundle_subtitle").eq("is_active", true).order("sort_order"),
      ]);
      if (!alive) return;
      if (itemResult.error) {
        setCatalogError("We couldn't load the food menu. Please try again.");
        setCatalogLoading(false);
        return;
      }
      const catalogVendors = (vendorResult.data ?? []) as Vendor[];
      setCats(categoryResult.data ?? []);
      setVendors(catalogVendors);
      setItems((itemResult.data ?? []) as Item[]);
      setDeals((dealResult.data ?? []) as CuratedFoodDeal[]);
      setCatalogLoading(false);
      const vendorIds = catalogVendors.map((vendor) => vendor.id);
      if (!vendorIds.length) { setRatings({}); return; }
      const { data: ratingsData } = await supabase.from("order_ratings").select("vendor_id,food_stars").in("vendor_id", vendorIds);
      if (!alive) return;
      const ratingTotals = new Map<string, { total: number; count: number }>();
      for (const rating of ratingsData ?? []) {
        if (!rating.vendor_id) continue;
        const current = ratingTotals.get(rating.vendor_id) ?? { total: 0, count: 0 };
        current.total += Number(rating.food_stars);
        current.count += 1;
        ratingTotals.set(rating.vendor_id, current);
      }
      setRatings(Object.fromEntries([...ratingTotals].map(([vendorId, rating]) => [vendorId, rating.total / rating.count])));
    };
    void loadCatalog();
    const refreshCampaign = () => activeCampaign().then((value) => { if (alive) setCampaign(value); });
    const channel = supabase
      .channel("street-food-home-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => void loadCatalog())
      .on("postgres_changes", { event: "*", schema: "public", table: "vendors" }, () => void loadCatalog())
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => void loadCatalog())
      .on("postgres_changes", { event: "*", schema: "public", table: "curated_bundles" }, () => void loadCatalog())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_ratings" }, () => void loadCatalog())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, refreshCampaign)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [catalogReload]);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance,status").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setBalance(data?.status === "ACTIVE" ? Number(data.balance) : 0);
    });
    supabase
      .from("addresses")
      .select("line,landmark")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setAddress(data?.line ?? null));
    supabase
      .from("favorites")
      .select("item_id")
      .eq("user_id", user.id)
      .then(({ data }) => setFavs((data ?? []).map((f) => f.item_id).filter(Boolean) as string[]));
  }, [user?.id]);

  async function toggleFav(itemId: string, vendorId: string) {
    if (!user) return;
    if (favs.includes(itemId)) {
      setFavs((f) => f.filter((x) => x !== itemId));
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_id", itemId);
    } else {
      setFavs((f) => [...f, itemId]);
      await supabase.from("favorites").insert({ user_id: user.id, item_id: itemId, vendor_id: vendorId });
    }
  }

  const vendorName = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.stall_name])),
    [vendors],
  );
  const vendorOffer = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, Number(v.offer_percent ?? 0)])),
    [vendors],
  );

  const query = q.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (!active || i.category_id === active) &&
      (!vendorFilter || i.vendor_id === vendorFilter) &&
      (!query ||
        i.name.toLowerCase().includes(query) ||
        (vendorName[i.vendor_id] ?? "").toLowerCase().includes(query)) &&
      (!onlyVeg || i.food_type !== "NONVEG") &&
      (!onlyFav || favs.includes(i.id)),
  );

  function add(i: Item, offerPrice?: number, promotionalMinimum?: number) {
    const res = cart.add({
      itemId: i.id,
      vendorId: i.vendor_id,
      name: i.name,
      photo: i.photo_url,
      unit: i.unit,
      base: Number(i.price),
      price: offerPrice ?? customerPrice(i.price),
      mrp: customerPrice(i.mrp),
      ...(promotionalMinimum ? { promotionalMinimum } : {}),
    });
    if (!res.ok) setToast(res.error);
    else setToast(null);
  }

  const clearPromoFocus = useCallback(() => setPromoFocus(null), []);

  function openBannerRoute(target: string) {
    const path = target.split(/[?#]/, 1)[0]!.replace(/\/$/, "") || "/";
    const parts = path.split("/").filter(Boolean).map((part) => {
      try { return decodeURIComponent(part); } catch { return part; }
    });
    if (parts[0] === "category" && parts[1]) {
      const wanted = routeSlug(parts[1]);
      const category = cats.find((candidate) => routeSlug(candidate.name) === wanted || routeSlug(candidate.name).includes(wanted));
      setActive(category?.id ?? null);
      setQ(category ? "" : parts[1].replace(/-/g, " "));
      setVendorFilter(null);
      setPromoFocus(null);
      document.getElementById("street-food-recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if ((parts[0] === "stall" || parts[0] === "stalls") && parts[1]) {
      const wanted = routeSlug(parts[1]);
      const vendor = vendors.find((candidate) => candidate.id === parts[1] || routeSlug(candidate.stall_name).includes(wanted));
      if (vendor) {
        void navigate({ to: "/stalls/$id", params: { id: vendor.id } });
        return;
      }
      setActive(null);
      setVendorFilter(null);
      setQ(parts[1].replace(/-/g, " "));
      setToast(`Showing matching local food for “${parts[1].replace(/-/g, " ")}”.`);
      return;
    }
    if (parts[0] === "deal" && parts[1]) {
      setPromoFocus(parts.slice(1).join("-"));
      return;
    }
    const validRoutes = new Set(["/categories", "/cart", "/wallet", "/orders", "/profile", "/support"]);
    if (validRoutes.has(path)) {
      void navigate({ to: path as "/categories" | "/cart" | "/wallet" | "/orders" | "/profile" | "/support" });
      return;
    }
    setToast("That banner destination is not available. Browse the live menu below.");
    document.getElementById("street-food-recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const registry: SectionRegistry = {
    smart_asset: () => <DynamicAssetBanner />,
    banner_carousel: () => (
      <BannerCarousel
        onCategory={(id) => { setActive(id); setVendorFilter(null); }}
        onVendor={(id) => navigate({ to: "/stalls/$id", params: { id } })}
      />
    ),
    festive: () => (
      <FestiveWidget campaign={campaign} onFilter={(v) => { setQ(v); setActive(null); setVendorFilter(null); }} />
    ),
    festive_photos: () => <FestivePhotoStrip />,
    festive_sections: () => (
      <FestiveSections
        sections={otherSections}
        items={items}
        onFilter={(v) => { setQ(v); setActive(null); setVendorFilter(null); }}
        onAdd={(id) => { const it = items.find((x) => x.id === id); if (it) add(it); }}
        qtyOf={(id) => lines.find((l) => l.itemId === id)?.qty ?? 0}
      />
    ),
    quick_bites: (cfg) => (
      <section className="px-5 pt-6">
        <h2 className="text-[17px] font-extrabold">{cfg.title ?? "Quick bites"}</h2>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">Pick a craving, we do the running</p>
        <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActive(null)}
            style={{ animationDelay: "0ms" }}
            className="press rise-in w-[74px] shrink-0 snap-start text-center"
          >
            <span
              className={`relative block aspect-square overflow-hidden rounded-[1.5rem] ${TINTS[0]} shadow-[0_12px_24px_-16px_rgba(15,23,42,0.75)] ring-offset-2 transition-all ${!active ? "ring-2 ring-primary" : ""}`}
            >
              <img src="/food/food-thali.jpg" alt="All street food" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
            </span>
            <span className="mt-1.5 block text-[10.5px] font-extrabold leading-tight">All</span>
          </button>
          {campaign?.top_tab_label ? (
            <button
              onClick={() => { setQ(campaign.top_tab_label ?? ""); setActive(null); setVendorFilter(null); }}
              className="press rise-in w-[74px] shrink-0 snap-start text-center"
            >
              <span className="relative block aspect-square overflow-hidden rounded-[1.5rem] shadow-[0_12px_24px_-16px_rgba(15,23,42,0.75)] ring-2 ring-primary">
                <img
                  src={campaign.top_tab_icon_url || "/food/food-sweets.jpg"}
                  alt={campaign.top_tab_label}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
              </span>
              <span className="mt-1.5 block truncate text-[10.5px] font-extrabold leading-tight">{campaign.top_tab_label}</span>
            </button>
          ) : null}
          {cats.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              style={{ animationDelay: `${(idx + 1) * 50}ms` }}
              className="press rise-in w-[74px] shrink-0 snap-start text-center"
            >
              <span
                className={`relative block aspect-square overflow-hidden rounded-[1.5rem] ${TINTS[(idx + 1) % TINTS.length]} shadow-[0_12px_24px_-16px_rgba(15,23,42,0.75)] transition-all ${active === c.id ? "ring-2 ring-primary" : ""}`}
              >
                <img src={foodImage(c.name)} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
                {c.emoji ? (
                  <span className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-card/85 text-[11px] shadow-sm">
                    {c.emoji}
                  </span>
                ) : null}
              </span>
              <span className="mt-1.5 block truncate text-[10.5px] font-extrabold leading-tight">{c.name}</span>
            </button>
          ))}
        </div>
      </section>
    ),
    trending_stalls: (cfg) => (
      <>
        <section className="flex items-center gap-2 px-5 pt-7">
          <h2 className="mr-auto text-[17px] font-extrabold">{cfg.title ?? "Trending stalls"}</h2>
          {vendorFilter ? (
            <button
              onClick={() => setVendorFilter(null)}
              className="press rounded-full border border-primary bg-[color-mix(in_oklab,var(--color-primary)_10%,white)] px-3 py-1.5 text-[11px] font-extrabold text-primary"
            >
              <span className="flex items-center gap-1">{vendorName[vendorFilter] ?? "Stall"} <X className="h-3 w-3" /></span>
            </button>
          ) : null}
          <button
            onClick={() => setOnlyVeg((v) => !v)}
            className={`press rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${onlyVeg ? "border-primary bg-[color-mix(in_oklab,var(--color-primary)_10%,white)] text-primary" : "border-border text-muted-foreground"}`}
          >
            Veg only
          </button>
          <button
            onClick={() => setOnlyFav((v) => !v)}
            className={`press rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${onlyFav ? "border-primary bg-[color-mix(in_oklab,var(--color-primary)_10%,white)] text-primary" : "border-border text-muted-foreground"}`}
          >
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> Favourites</span>
          </button>
        </section>

        <div className="grid grid-cols-2 gap-3.5 px-5 pb-36 pt-3">
          {shown.map((i, idx) => {
            const line = lines.find((l) => l.itemId === i.id);
            const shownPrice = customerPrice(i.price);
            // Discounts only exist when the stall itself runs an offer.
            const off = vendorOffer[i.vendor_id] ?? 0;
            const offerPrice = off > 0 ? Math.round(shownPrice * (100 - off)) / 100 : shownPrice;
            return (
              <div key={i.id} style={{ animationDelay: `${Math.min(idx, 8) * 55}ms` }} className="press rise-in overflow-visible rounded-2xl bg-white p-2 shadow-card hover:-translate-y-0.5">
                <div className={`product-tile relative aspect-square overflow-visible ${PRODUCT_TINTS[idx % PRODUCT_TINTS.length]}`}>
                  <img
                    src={i.photo_url ?? foodImage(i.name)}
                    alt={i.name}
                    className="h-full w-full rounded-2xl object-contain p-2"
                  />
                  {off > 0 ? (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow-md">
                      {off}% OFF
                    </span>
                  ) : null}
                  {!i.in_stock ? (
                    <span className="absolute inset-0 grid place-items-center rounded-[1.4rem] bg-black/55 text-xs font-bold text-white">
                      Out of stock
                    </span>
                  ) : null}
                  {user ? (
                    <button
                      aria-label={favs.includes(i.id) ? "Remove from favourites" : "Add to favourites"}
                      onClick={() => toggleFav(i.id, i.vendor_id)}
                      className={`press absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card/90 text-sm shadow-md ${favs.includes(i.id) ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      <Heart className="h-4 w-4" fill={favs.includes(i.id) ? "currentColor" : "none"} />
                    </button>
                  ) : null}
                  {!i.in_stock ? null : line ? (
                    <div className="absolute -bottom-3 right-2 z-20 flex items-center gap-1 rounded-full border border-primary bg-white px-1.5 py-1 text-primary shadow-sm">
                      <button aria-label="Remove one" onClick={() => cart.remove(i.id)} className="press grid h-6 w-6 place-items-center rounded-full text-sm font-bold">−</button>
                      <span className="min-w-3 text-center text-[10px] font-extrabold">{line.qty}</span>
                      <button aria-label="Add one" onClick={() => add(i)} className="press grid h-6 w-6 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">+</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => add(i)}
                      aria-label={`Add ${i.name}`}
                      className="press absolute -bottom-3 right-2 z-20 grid h-8 w-8 place-items-center rounded-full border border-primary bg-white text-primary shadow-sm"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                  )}
                </div>
                <p className="mt-4 truncate px-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-primary">{off > 0 ? "Member's pick" : vendorName[i.vendor_id] ?? "Thela favourite"}</p>
                <p className="mt-1 truncate px-0.5 text-[13px] font-semibold">{i.name}</p>
                <p className="truncate px-0.5 text-[11px] font-medium text-muted-foreground">
                  {i.unit ?? "Freshly made"}
                </p>
                <div className="mt-2.5 flex items-center justify-between px-0.5">
                  <p className="text-[15px] font-extrabold text-primary">
                    {inr(offerPrice)}{" "}
                    {off > 0 ? (
                      <span className="text-[11px] font-medium text-muted-foreground line-through">{inr(shownPrice)}</span>
                    ) : null}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </>
    ),
  };

  return (
    <Shell>
      <PremiumHome
        address={address}
        balance={balance}
        categories={cats}
        vendors={vendors}
        items={shown}
        spotlightItems={items}
        deals={deals}
        lines={lines}
        query={q}
        activeCategoryId={active}
        voiceSearch={<VoiceSearch stalls={vendors.map((vendor) => vendor.stall_name)} items={items.map((item) => item.name)} onResult={(result) => { setQ(result.query); setActive(null); setOnlyFav(false); const vendor = result.stall ? vendors.find((candidate) => candidate.stall_name === result.stall) : null; setVendorFilter(vendor?.id ?? null); }} />}
        onQueryChange={(value) => { setQ(value); setVendorFilter(null); }}
        onCategoryChange={(categoryId) => { setActive(categoryId); setQ(""); setVendorFilter(null); }}
        onVendor={(vendorId) => navigate({ to: "/stalls/$id", params: { id: vendorId } })}
        onAdd={add}
        onRemove={(itemId) => cart.remove(itemId)}
        onViewDeals={() => { setPromoFocus("deals"); document.getElementById("street-food-recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
      />

      <HomeMarketingModules onSearch={(value) => { setQ(value); setActive(null); setVendorFilter(null); }} />

      <main className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
        <DynamicBanners onInternalRoute={openBannerRoute} />
        {topBarTheme?.header_bg_image_url ? (
          <section className="px-5 py-3">
            <img
              key={topBarTheme.header_bg_image_url}
              src={topBarTheme.header_bg_image_url}
              alt="Thaleewala festive offer"
              className="festive-header-photo block h-auto w-full rounded-2xl shadow-sm"
            />
          </section>
        ) : null}
        {user?.id ? <ActiveOrderTracker userId={user.id} /> : null}
        {catalogLoading ? (
          <section className="px-5 py-4" aria-live="polite">
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((slot) => (
                <div key={slot} className="animate-pulse rounded-xl border border-border bg-card p-2">
                  <div className="aspect-[4/3] rounded-lg bg-muted" />
                  <div className="mt-3 h-3 w-3/4 rounded bg-muted" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
                </div>
              ))}
            </div>
          </section>
        ) : catalogError ? (
          <section className="mx-5 rounded-xl border border-border bg-card px-5 py-8 text-center">
            <span className="text-4xl" aria-hidden="true">🛒</span>
            <p className="mt-3 text-sm font-extrabold text-foreground">Food menu didn’t load</p>
            <p className="mt-1 text-xs text-muted-foreground">Check your connection and try once more.</p>
            <button type="button" onClick={() => setCatalogReload((value) => value + 1)} className="press mt-4 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground">Try again</button>
          </section>
        ) : items.length ? null : (
          <section className="mx-5 rounded-xl border border-dashed border-border px-5 py-8 text-center">
            <span className="text-4xl" aria-hidden="true">🍽️</span>
            <p className="mt-3 text-sm font-extrabold">No food is available right now</p>
          </section>
        )}
        {vendors.length > 0 ? (
          <section className="px-5 pt-2">
            <h2 className="font-display text-2xl text-primary">Your stalls</h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Tap a stall to see only their food</p>
            <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {vendors.map((v) => (
                <button
                  key={v.id}
                  onClick={() => navigate({ to: "/stalls/$id", params: { id: v.id } })}
                  className="press w-[70px] shrink-0 snap-start text-center"
                >
                  <span
                    className={`relative block aspect-square overflow-hidden rounded-full bg-muted shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)] ${vendorFilter === v.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
                  >
                    <img
                      src={v.photo_url ?? foodImage(v.stall_name)}
                      alt={v.stall_name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="mt-1.5 block truncate text-[10.5px] font-extrabold leading-tight">{v.stall_name}</span>
                  {Number(v.offer_percent ?? 0) > 0 ? (
                    <span className="block text-[9px] font-black text-primary">{v.offer_percent}% OFF</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        <StreetFoodExperience
          items={items}
          categories={cats}
          vendors={vendors}
          lines={lines}
          ratings={ratings}
          activeCategoryId={active}
          regularCartTotal={regularCartTotal}
          promoFocus={promoFocus}
          onSelectCategory={(categoryId) => { setActive(categoryId); setQ(""); setVendorFilter(null); }}
          onAdd={(item, offerPrice, promoMinimum) => add(item, offerPrice, promoMinimum)}
          onRemove={(itemId) => cart.remove(itemId)}
          onOptions={(itemId, options) => cart.setOptions(itemId, options)}
          onVendor={(vendorId) => navigate({ to: "/stalls/$id", params: { id: vendorId } })}
          onClearPromoFocus={clearPromoFocus}
          deals={deals}
        />
        <FestivePhotoStrip />
        <DynamicPageRenderer app="customer" page="home" registry={registry} />
      </main>
      <div className="pb-28" />

      <HomeChat userId={user?.id} />

      {toast ? (
        <div className="fixed inset-x-0 bottom-44 z-40 mx-auto w-full max-w-[440px] px-4">
          <div className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background">{toast}</div>
        </div>
      ) : null}

    </Shell>
  );
}
