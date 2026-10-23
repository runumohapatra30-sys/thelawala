import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Clock3, Filter, Heart, Minus, Plus, Search, ShoppingBag, SlidersHorizontal, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import type { CartLine } from "@/lib/cart";
import { Slider } from "@/components/ui/slider";
import type { CuratedFoodDeal, StreetFoodCategory, StreetFoodItem, StreetFoodVendor } from "@/components/StreetFoodExperience";
import { LiveHomeHeader } from "@/components/LiveHomeHeader";
import { LocalSpotlight } from "@/components/LocalSpotlight";
import { DynamicBanners } from "@/components/DynamicBanners";
import { AutoSlideRail } from "@/components/AutoSlideRail";
import { useHomeBanners } from "@/lib/homeBanners";
import { OfferImageOverlay } from "@/components/OfferImageOverlay";
import { useVisualEngineSettings } from "@/lib/visualEngine";

const SEARCH_SUGGESTIONS = [
  "Khandagiri Dahi Bara",
  "Gupchup & Chaat",
  "Egg Chicken Roll",
  "Cuttack Famous Aloo Dum",
  "Evening Hot Pakoda",
];

function highlightQuery(value: string, query: string) {
  const index = value.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase());
  if (index < 0) return value;
  const matchEnd = index + query.trim().length;
  return (
    <>
      {value.slice(0, index)}
      <mark className="rounded-sm bg-primary/15 font-extrabold text-foreground">{value.slice(index, matchEnd)}</mark>
      {value.slice(matchEnd)}
    </>
  );
}

type Props = {
  address: string | null;
  balance: number;
  categories: StreetFoodCategory[];
  vendors: StreetFoodVendor[];
  items: StreetFoodItem[];
  spotlightItems: StreetFoodItem[];
  searchItems: StreetFoodItem[];
  favoriteIds: string[];
  ratings: Record<string, number>;
  ratingCounts: Record<string, number>;
  userCanFavorite: boolean;
  deals: CuratedFoodDeal[];
  lines: CartLine[];
  query: string;
  activeCategoryId: string | null;
  voiceSearch: ReactNode;
  onQueryChange: (query: string) => void;
  onSearchSelect: (query: string) => void;
  onFavorite: (itemId: string, vendorId: string) => void;
  onItem: (itemId: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onVendor: (vendorId: string) => void;
  onAdd: (item: StreetFoodItem, price?: number, promotionalMinimum?: number) => void;
  onRemove: (itemId: string) => void;
  onViewDeals: () => void;
  onInternalRoute: (route: string) => void;
  displayName?: string | null | undefined;
  avatarUrl?: string | null | undefined;
};

export function PremiumHome({
  address,
  categories,
  vendors,
  items,
  spotlightItems,
  searchItems,
  favoriteIds,
  ratings,
  ratingCounts,
  userCanFavorite,
  deals,
  lines,
  query,
  activeCategoryId,
  voiceSearch,
  onQueryChange,
  onSearchSelect,
  onFavorite,
  onItem,
  onCategoryChange,
  onVendor,
  onAdd,
  onRemove,
  onViewDeals,
  onInternalRoute,
  avatarUrl,
}: Props) {
  const reduceMotion = useReducedMotion();
  const banners = useHomeBanners();
  const { settings: presentation } = useVisualEngineSettings();
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [searchScreen, setSearchScreen] = useState<"suggestions" | "results" | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState({ ratedOnly: false, vegOnly: false, under15: false, bestDeals: false, nonVegOnly: false, maxMinutes: 45, minPrice: "", maxPrice: "" });
  const [filterDraft, setFilterDraft] = useState(filters);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchOpen = searchScreen !== null;

  useEffect(() => {
    if (query || reduceMotion) return;
    const timer = window.setInterval(() => setSuggestionIndex((value) => (value + 1) % SEARCH_SUGGESTIONS.length), 2800);
    return () => window.clearInterval(timer);
  }, [query, reduceMotion]);

  const inStock = useMemo(() => items.filter((item) => item.in_stock), [items]);
  const searchMatches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return searchItems
      .filter((item) => {
        const stallName = vendors.find((vendor) => vendor.id === item.vendor_id)?.stall_name ?? "";
        return item.in_stock && `${item.name} ${item.details ?? ""} ${stallName}`.toLocaleLowerCase().includes(term);
      })
      .sort((first, second) => {
        const firstStarts = first.name.toLocaleLowerCase().startsWith(term);
        const secondStarts = second.name.toLocaleLowerCase().startsWith(term);
        return Number(secondStarts) - Number(firstStarts) || first.name.localeCompare(second.name);
      });
  }, [query, searchItems, vendors]);
  const searchSuggestions = useMemo(
    () => searchMatches.slice(0, 8),
    [searchMatches],
  );
  const filteredSearchMatches = useMemo(() => searchMatches.filter((item) => {
    const vendor = vendors.find((candidate) => candidate.id === item.vendor_id);
    const matchingDeal = deals.find((deal) => deal.menu_item_id === item.id);
    const price = matchingDeal ? Number(matchingDeal.offer_price) : customerPrice(item.price);
    const rating = ratings[item.vendor_id] ?? 0;
    const prepTime = vendor?.default_prep_minutes || 15;
    const discount = Number(vendor?.offer_percent ?? 0) > 0 || Number(item.mrp) > Number(item.price) * 1.05 || Boolean(matchingDeal);
    return (!filters.ratedOnly || rating >= 4) &&
      (!filters.vegOnly || item.food_type !== "NONVEG") &&
      (!filters.nonVegOnly || item.food_type === "NONVEG") &&
      (!filters.under15 || prepTime <= 15) &&
      (!filters.bestDeals || discount) &&
      (!filters.minPrice || price >= Number(filters.minPrice)) &&
      (!filters.maxPrice || price <= Number(filters.maxPrice)) &&
      prepTime <= filters.maxMinutes;
  }), [searchMatches, vendors, deals, ratings, filters]);

  useEffect(() => {
    if (searchScreen === "suggestions") searchInput.current?.focus();
  }, [searchScreen]);
  useEffect(() => {
    if (!searchOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [searchOpen]);
  const showResults = (value = query) => {
    const term = value.trim();
    if (!term) return;
    onSearchSelect(term);
    const next = [term, ...recentSearches.filter((entry) => entry.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 8);
    setRecentSearches(next);
    try { window.localStorage.setItem("thelawala.recent_searches", JSON.stringify(next)); }
    catch (error) { console.error("Could not save recent searches:", error); }
    setSearchScreen("results");
    searchInput.current?.blur();
  };
  const goBack = () => {
    if (searchScreen === "results") {
      setSearchScreen("suggestions");
      searchInput.current?.focus();
      return;
    }
    onQueryChange("");
    setSearchScreen(null);
  };
  useEffect(() => {
    try {
      const recent = window.localStorage.getItem("thelawala.recent_searches");
      if (recent) {
        const parsed: unknown = JSON.parse(recent);
        if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) setRecentSearches(parsed.slice(0, 8));
      }
    } catch (error) {
      console.error("Could not load recent searches:", error);
    }
  }, []);
  const valueItems = useMemo(
    () => [...inStock].sort((a, b) => customerPrice(a.price) - customerPrice(b.price)).slice(0, 3),
    [inStock],
  );
  const featured = useMemo(() => {
    const dealItems = deals
      .map((deal) => ({ deal, item: inStock.find((candidate) => candidate.id === deal.menu_item_id) }))
      .filter((entry): entry is { deal: CuratedFoodDeal; item: StreetFoodItem } => Boolean(entry.item));
    if (dealItems.length) return dealItems.slice(0, 2);
    return inStock.slice(3, 5).map((item) => ({
      item,
      deal: {
        id: item.id,
        menu_item_id: item.id,
        item_name: item.name,
        offer_price: customerPrice(item.price),
        original_price: customerPrice(item.mrp),
        image_url: item.photo_url,
        tag: null,
        bundle_title: "Local favourite",
        bundle_subtitle: "Freshly prepared",
      },
    }));
  }, [deals, inStock]);

  return (
    <>
      <LiveHomeHeader address={address} avatarUrl={avatarUrl} query={query} onQueryChange={onQueryChange} onSearchFocus={() => setSearchScreen("suggestions")} voiceSearch={voiceSearch} onInternalRoute={onInternalRoute} categories={categories} activeCategoryId={activeCategoryId} onCategoryChange={onCategoryChange} />
      <AnimatePresence>
        {searchScreen ? (
          <motion.section
            key="fullscreen-search"
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Food search"
            className="fixed inset-0 z-[60] flex flex-col bg-background"
          >
            <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col overflow-hidden px-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <form
                onSubmit={(event) => { event.preventDefault(); showResults(); }}
                className="flex h-12 shrink-0 items-center gap-1 rounded-2xl border border-border bg-card px-2 shadow-card focus-within:ring-2 focus-within:ring-primary/20"
              >
                <button type="button" aria-label={searchScreen === "results" ? "Back to suggestions" : "Back to home"} onClick={goBack} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <input
                  ref={searchInput}
                  value={query}
                  onFocus={() => setSearchScreen("suggestions")}
                  onChange={(event) => onQueryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") goBack();
                  }}
                  placeholder="Search food and stalls"
                  aria-label="Search food and stalls"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <span className="grid h-9 w-8 shrink-0 place-items-center">{voiceSearch}</span>
                <button type="button" aria-label="Filter search results" onClick={() => { setFilterDraft(filters); setFilterOpen(true); }} className="grid h-9 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
                <button type="button" aria-label={query ? "Clear search" : "Close search"} onClick={() => { if (query) { onQueryChange(""); setSearchScreen("suggestions"); searchInput.current?.focus(); } else goBack(); }} className="grid h-9 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                </button>
                <button type="submit" aria-label="Show search results" className="sr-only">Search</button>
              </form>

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
                {searchScreen === "suggestions" && !query.trim() ? (
                  <section className="pt-6">
                    <h2 className="mb-3 text-base font-black text-foreground">Looking for?</h2>
                    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
                      {[
                        { label: "Breakfast", query: "Breakfast", image: "Idli breakfast" },
                        { label: "Lunch", query: "Thali", image: "Lunch thali" },
                        { label: "Evening Snacks", query: "Snacks", image: "Evening snacks" },
                        { label: "Street Food", query: "Chaat", image: "Street food chaat" },
                      ].map((category) => (
                        <button key={category.label} type="button" onClick={() => showResults(category.query)} className="w-[76px] shrink-0 text-center">
                          <span className="mx-auto block h-16 w-16 overflow-hidden rounded-full border border-border bg-brand-soft p-1">
                            <img src={foodImage(category.image)} alt="" className="h-full w-full rounded-full object-cover" />
                          </span>
                          <span className="mt-1.5 block text-[10px] font-bold text-foreground">{category.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-black text-foreground">Your recent searches</h2>
                        {recentSearches.length ? <button type="button" onClick={() => { setRecentSearches([]); try { window.localStorage.removeItem("thelawala.recent_searches"); } catch (error) { console.error("Could not clear recent searches:", error); } }} className="text-[10px] font-bold text-primary">Clear</button> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(recentSearches.length ? recentSearches : ["Gupchup", "Dahi Bara", "Chaat", "Paneer Roll"]).map((term) => (
                          <button key={term} type="button" onClick={() => showResults(term)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
                            <span className="flex items-center gap-1.5"><Search className="h-3 w-3 text-muted-foreground" />{term}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 border-t border-border pt-4">
                      <h2 className="mb-3 text-sm font-black text-foreground">Popular stalls</h2>
                      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                        {vendors.slice(0, 8).map((vendor) => (
                          <button key={vendor.id} type="button" onClick={() => onVendor(vendor.id)} className="w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm">
                            <img src={vendor.photo_url ?? foodImage(vendor.stall_name)} alt="" className="h-20 w-full object-cover" />
                            <span className="block break-words p-2 text-xs font-bold text-foreground">{vendor.stall_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                ) : searchScreen === "suggestions" ? (
                  <section className="pt-4">
                    <h2 className="sr-only">Suggestions for {query}</h2>
                    {searchSuggestions.length ? (
                      <ul className="divide-y divide-border">
                        {searchSuggestions.map((item) => (
                          <li key={item.id}>
                            <button type="button" onClick={() => showResults(item.name)} className="flex w-full items-center gap-3 py-3 text-left">
                              <img src={item.photo_url ?? foodImage(item.name)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{highlightQuery(item.name, query)}</span>
                              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-5 text-sm text-muted-foreground">No matching food found. Try another search.</p>
                    )}
                    <button type="button" onClick={() => showResults()} className="mt-2 flex w-full items-center gap-3 border-t border-border py-4 text-left text-sm font-bold text-primary">
                      <Search className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">Show all results for &apos;{query}&apos;</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" />
                    </button>
                  </section>
                ) : (
                  <section className="pt-5">
                    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-4 pt-4">
                      {[
                        { key: "ratedOnly", label: "4+ rated" },
                        { key: "vegOnly", label: "Pure Veg" },
                        { key: "under15", label: "Under 15 mins" },
                        { key: "bestDeals", label: "Best Deals" },
                      ].map((filter) => {
                        const active = filters[filter.key as keyof typeof filters] === true;
                        return <button key={filter.key} type="button" aria-pressed={active} onClick={() => setFilters((current) => ({ ...current, [filter.key]: !active }))} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>{filter.label}</button>;
                      })}
                      <button type="button" onClick={() => { setFilterDraft(filters); setFilterOpen(true); }} className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-bold text-foreground"><Filter className="h-3 w-3" />Filters</button>
                    </div>
                    <h2 className="mb-3 text-sm font-black text-foreground">{filteredSearchMatches.length} results for &apos;{query}&apos;</h2>
                    {filteredSearchMatches.length ? (
                      <div className="space-y-3 pb-5">
                        {filteredSearchMatches.map((item) => {
                          const vendor = vendors.find((candidate) => candidate.id === item.vendor_id);
                          const matchingDeal = deals.find((deal) => deal.menu_item_id === item.id);
                          const price = matchingDeal ? Number(matchingDeal.offer_price) : (Number(vendor?.offer_percent ?? 0) > 0 ? customerPrice(item.price) * (100 - Number(vendor?.offer_percent)) / 100 : customerPrice(item.price));
                          const mrp = customerPrice(item.mrp);
                          const rating = ratings[item.vendor_id];
                          const isFavorite = favoriteIds.includes(item.id);
                          return (
                            <article key={item.id} role="link" tabIndex={0} onClick={() => onItem(item.id)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onItem(item.id); } }} className="relative flex min-w-0 cursor-pointer gap-3 overflow-hidden rounded-2xl border border-border bg-white p-2.5 shadow-sm">
                              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-brand-soft">
                                <img src={item.photo_url ?? foodImage(item.name)} alt={item.name} className="h-full w-full object-cover" />
                                <OfferImageOverlay stallName={vendor?.stall_name ?? "Local stall"} offerPercent={Number(vendor?.offer_percent ?? 0)} offerLabel={vendor?.offer_label} offerPrice={price} mrp={mrp} />
                                {matchingDeal || mrp > price ? <span className="absolute left-1.5 top-1.5 rounded-md bg-primary px-1.5 py-1 text-[8px] font-black uppercase text-primary-foreground">{matchingDeal?.tag ?? (mrp > price ? `${Math.round((1 - price / mrp) * 100)}% off` : "Deal")}</span> : null}
                                <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-white/95 px-1 py-1 text-[8px] font-black text-foreground shadow-sm">
                                  <Clock3 className="h-3 w-3 text-primary" />{vendor?.default_prep_minutes ?? 15} min
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 py-0.5 pr-7">
                                <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-foreground">{item.name}</h3>
                                <p className="mt-1 break-words text-[10px] font-semibold text-muted-foreground">{vendor?.stall_name ?? "Local stall"}</p>
                                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-foreground">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{rating ? rating.toFixed(1) : "New"} <span className="font-medium text-muted-foreground">({ratingCounts[item.vendor_id] ?? 0})</span>
                                  <span className="mx-0.5 text-muted-foreground">·</span>{vendor?.default_prep_minutes ?? 15}-{(vendor?.default_prep_minutes ?? 15) + 5} min
                                </p>
                                <p className="mt-2 text-xs font-black text-foreground">Starting at just {inr(price)} {mrp > price ? <span className="ml-1 text-[10px] font-medium text-muted-foreground line-through">{inr(mrp)}</span> : null}</p>
                              </div>
                                <button
                                  type="button"
                                  disabled={!userCanFavorite}
                                  aria-label={isFavorite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
                                  aria-pressed={isFavorite}
                                  title={userCanFavorite ? (isFavorite ? "Remove from favourites" : "Add to favourites") : "Sign in to save favourites"}
                                  onClick={(event) => { event.stopPropagation(); onFavorite(item.id, item.vendor_id); }}
                                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-primary shadow-sm disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                  <Heart className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
                                </button>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-muted/50 px-3 py-4 text-sm text-muted-foreground">No matching food found. Try another search.</p>
                    )}
                  </section>
                )}
              </div>
            </div>
            {filterOpen ? (
              <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}>
                <section role="dialog" aria-modal="true" aria-labelledby="search-filter-title" className="w-full max-w-[520px] rounded-t-3xl bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 id="search-filter-title" className="text-lg font-black text-foreground">Filter your choices</h2>
                    <button type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-muted"><X className="h-4 w-4" /></button>
                  </div>
                  <fieldset>
                    <legend className="mb-3 text-sm font-bold text-foreground">Food preference</legend>
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filterDraft.vegOnly} onChange={(event) => setFilterDraft((current) => ({ ...current, vegOnly: event.target.checked, nonVegOnly: event.target.checked ? false : current.nonVegOnly }))} />Veg</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filterDraft.nonVegOnly} onChange={(event) => setFilterDraft((current) => ({ ...current, nonVegOnly: event.target.checked, vegOnly: event.target.checked ? false : current.vegOnly }))} />Non-veg</label>
                    </div>
                  </fieldset>
                  <div className="mt-6">
                    <div className="mb-3 flex justify-between text-sm font-bold"><label htmlFor="search-max-time">Delivery time</label><span>{filterDraft.maxMinutes} min</span></div>
                    <Slider id="search-max-time" min={10} max={45} step={5} value={[filterDraft.maxMinutes]} onValueChange={([value]) => { if (value !== undefined) setFilterDraft((current) => ({ ...current, maxMinutes: value })); }} aria-label="Maximum delivery time" />
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>10 min</span><span>45 min</span></div>
                  </div>
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-bold">Price range</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-semibold text-muted-foreground">Min price<input type="number" min="0" value={filterDraft.minPrice} onChange={(event) => setFilterDraft((current) => ({ ...current, minPrice: event.target.value }))} placeholder="₹0" className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground" /></label>
                      <label className="text-xs font-semibold text-muted-foreground">Max price<input type="number" min="0" value={filterDraft.maxPrice} onChange={(event) => setFilterDraft((current) => ({ ...current, maxPrice: event.target.value }))} placeholder="No limit" className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground" /></label>
                    </div>
                  </div>
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => { const reset = { ratedOnly: false, vegOnly: false, under15: false, bestDeals: false, nonVegOnly: false, maxMinutes: 45, minPrice: "", maxPrice: "" }; setFilterDraft(reset); setFilters(reset); }} className="h-11 rounded-xl border border-border text-sm font-bold text-foreground">Reset all</button>
                    <button type="button" onClick={() => { setFilters(filterDraft); setFilterOpen(false); }} className="h-11 rounded-xl bg-primary text-sm font-black text-primary-foreground">Apply</button>
                  </div>
                </section>
              </div>
            ) : null}
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className="px-4 pb-2 pt-3">
        <AutoSlideRail>
          {presentation.spotlight_enabled && <LocalSpotlight vendors={vendors} items={spotlightItems} onVendor={onVendor} />}

          {presentation.best_value_enabled && <div className="flex h-[292px] min-w-0 flex-col rounded-3xl border border-border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-1"><span className="text-xs font-black text-foreground">Best value</span><Link to="/categories" className="text-[10px] font-black text-primary">See all ›</Link></div>
            <div className="flex flex-1 flex-col justify-between gap-2">
              {valueItems.map((item) => {
                const line = lines.find((candidate) => candidate.itemId === item.id);
                return (
                  <div key={item.id} role="link" tabIndex={0} onClick={() => onItem(item.id)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onItem(item.id); } }} className="flex min-h-[61px] cursor-pointer items-center gap-2 rounded-2xl border border-border bg-muted/45 p-1.5">
                    <img src={item.photo_url ?? foodImage(item.name)} alt={item.name} className="h-10 w-10 shrink-0 rounded-xl bg-brand-soft object-cover" />
                    <span className="min-w-0 flex-1"><span className="line-clamp-2 text-[10px] font-bold leading-tight text-foreground">{item.name}</span><span className="text-xs font-black text-primary">{inr(customerPrice(item.price))}</span></span>
                    {line ? <span className="flex items-center gap-1 rounded-lg bg-primary p-1 text-primary-foreground"><button type="button" aria-label={`Remove one ${item.name}`} onClick={(event) => { event.stopPropagation(); onRemove(item.id); }}><Minus className="h-3 w-3" /></button><span className="min-w-3 text-center text-[10px] font-black">{line.qty}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={(event) => { event.stopPropagation(); onAdd(item); }}><Plus className="h-3 w-3" /></button></span> : <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(item); }} className="rounded-lg border border-primary bg-card px-2 py-1 text-[9px] font-black text-primary">ADD</button>}
                  </div>
                );
              })}
            </div>
          </div>
          }
          {banners.map((banner) => <DynamicBanners key={banner.id} rows={[banner]} onInternalRoute={onInternalRoute} panel />)}
        </AutoSlideRail>
      </section>

      {featured.length ? (
        <section className="mx-4 my-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-end justify-between gap-2"><span><span className="block text-sm font-black text-foreground">Freshly picked near you</span><span className="text-[11px] font-semibold text-muted-foreground">Live prices from local stalls</span></span><button type="button" onClick={onViewDeals} className="text-[11px] font-black text-primary">View deals</button></div>
          <div className="grid grid-cols-2 gap-3">
            {featured.map(({ deal, item }) => {
              const line = lines.find((candidate) => candidate.itemId === item.id);
              const offer = Number(deal.offer_price);
              const original = Math.max(Number(deal.original_price), customerPrice(item.mrp));
              return (
                <article key={deal.id} role="link" tabIndex={0} onClick={() => onItem(item.id)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onItem(item.id); } }} className="min-w-0 cursor-pointer rounded-3xl border border-border bg-white p-2.5 shadow-sm">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-brand-soft"><img src={deal.image_url ?? item.photo_url ?? foodImage(item.name)} alt={item.name} className="h-full w-full object-cover" /><OfferImageOverlay stallName={vendors.find((vendor) => vendor.id === item.vendor_id)?.stall_name ?? "Local stall"} offerPercent={Number(vendors.find((vendor) => vendor.id === item.vendor_id)?.offer_percent ?? 0)} offerLabel={vendors.find((vendor) => vendor.id === item.vendor_id)?.offer_label} offerPrice={offer} mrp={original} />{offer < original ? <span className="absolute left-2 top-2 rounded-md bg-success px-1.5 py-0.5 text-[9px] font-black text-success-foreground">SAVE {inr(original - offer)}</span> : null}</div>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onVendor(item.vendor_id); }} className="mt-2 block w-full break-words text-left text-[9px] font-bold text-muted-foreground">{vendors.find((vendor) => vendor.id === item.vendor_id)?.stall_name ?? "Local stall"}</button>
                  <h2 className="truncate text-xs font-extrabold text-foreground">{item.name}</h2>
                  <div className="mt-2 flex items-center justify-between gap-1"><span className="text-xs font-black text-primary">{inr(offer)} {offer < original ? <span className="text-[9px] font-medium text-muted-foreground line-through">{inr(original)}</span> : null}</span>{line ? <span className="flex items-center gap-1 rounded-lg bg-primary p-1 text-primary-foreground"><button type="button" aria-label={`Remove one ${item.name}`} onClick={(event) => { event.stopPropagation(); onRemove(item.id); }}><Minus className="h-3 w-3" /></button><span className="text-[10px] font-black">{line.qty}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={(event) => { event.stopPropagation(); onAdd(item, offer, offer === 1 ? 199 : undefined); }}><Plus className="h-3 w-3" /></button></span> : <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(item, offer, offer === 1 ? 199 : undefined); }} className="rounded-lg bg-primary px-2.5 py-1.5 text-[9px] font-black text-primary-foreground">+ ADD</button>}</div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {lines.length ? (
        <motion.div initial={reduceMotion ? false : { y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed inset-x-0 bottom-[98px] z-40 mx-auto w-full max-w-[480px] px-3">
          <Link to="/cart" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-primary/20 bg-primary px-3 py-2.5 text-primary-foreground shadow-[0_18px_38px_-16px_var(--color-primary)]">
            <span className="flex -space-x-2">{lines.slice(0, 3).map((line) => <img key={line.itemId} src={line.photo ?? "/food/food-tiffin.jpg"} alt="" className="h-8 w-8 rounded-full border-2 border-primary-foreground object-cover" />)}</span>
            <span className="min-w-0"><span className="block text-[10px] font-black uppercase">{lines.reduce((total, line) => total + line.qty, 0)} items in cart</span><span className="block truncate text-[10px] font-semibold opacity-75">From your local stall</span></span>
            <span className="flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-[10px] font-black text-primary"><ShoppingBag className="h-3.5 w-3.5" /> View</span>
          </Link>
        </motion.div>
      ) : null}
    </>
  );
}