import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Clock3, Heart, Minus, Plus, Search, ShoppingBag, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import type { CartLine } from "@/lib/cart";
import type { CuratedFoodDeal, StreetFoodCategory, StreetFoodItem, StreetFoodVendor } from "@/components/StreetFoodExperience";
import { LiveHomeHeader } from "@/components/LiveHomeHeader";
import { LocalSpotlight } from "@/components/LocalSpotlight";

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
  userCanFavorite: boolean;
  deals: CuratedFoodDeal[];
  lines: CartLine[];
  query: string;
  activeCategoryId: string | null;
  voiceSearch: ReactNode;
  onQueryChange: (query: string) => void;
  onSearchSelect: (query: string) => void;
  onFavorite: (itemId: string, vendorId: string) => void;
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
  userCanFavorite,
  deals,
  lines,
  query,
  activeCategoryId,
  voiceSearch,
  onQueryChange,
  onSearchSelect,
  onFavorite,
  onCategoryChange,
  onVendor,
  onAdd,
  onRemove,
  onViewDeals,
  onInternalRoute,
  avatarUrl,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [searchScreen, setSearchScreen] = useState<"suggestions" | "results" | null>(null);
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
    setSearchScreen("results");
    searchInput.current?.blur();
  };
  const goBack = () => {
    if (searchScreen === "results") {
      setSearchScreen("suggestions");
      return;
    }
    onQueryChange("");
    setSearchScreen(null);
  };
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
                className="flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-border bg-card px-2 shadow-card focus-within:ring-2 focus-within:ring-primary/20"
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
                {query ? (
                  <button type="button" aria-label="Clear search" onClick={() => { onQueryChange(""); setSearchScreen("suggestions"); searchInput.current?.focus(); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                <button type="submit" aria-label="Show search results" className="sr-only">Search</button>
              </form>

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
                {searchScreen === "suggestions" && !query.trim() ? (
                  <section className="pt-6">
                    <h2 className="mb-3 text-sm font-black text-foreground">Trending Street Food Searches</h2>
                    <div className="flex flex-wrap gap-2">
                      {["Dahi Bara", "Chaat", "Paneer Roll"].map((term) => (
                        <button key={term} type="button" onClick={() => showResults(term)} className="rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm">
                          <span className="flex items-center gap-2"><Search className="h-3.5 w-3.5 text-primary" />{term}</span>
                        </button>
                      ))}
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
                    <h2 className="mb-3 text-sm font-black text-foreground">{searchMatches.length} results for &apos;{query}&apos;</h2>
                    {searchMatches.length ? (
                      <div className="grid grid-cols-2 gap-3 pb-5">
                        {searchMatches.map((item) => {
                          const vendor = vendors.find((candidate) => candidate.id === item.vendor_id);
                          const line = lines.find((candidate) => candidate.itemId === item.id);
                          const price = customerPrice(item.price);
                          const mrp = customerPrice(item.mrp);
                          const rating = ratings[item.vendor_id];
                          const isFavorite = favoriteIds.includes(item.id);
                          return (
                            <article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                              <div className="relative aspect-square bg-brand-soft">
                                <img src={item.photo_url ?? foodImage(item.name)} alt={item.name} className="h-full w-full object-cover" />
                                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-1 text-[9px] font-black text-foreground shadow-sm">
                                  <Clock3 className="h-3 w-3 text-primary" />{vendor?.default_prep_minutes ?? 15} MINS
                                  <span className="mx-0.5 h-3 w-px bg-border" />
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{rating ? rating.toFixed(1) : "New"}
                                </span>
                                <button
                                  type="button"
                                  disabled={!userCanFavorite}
                                  aria-label={isFavorite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
                                  aria-pressed={isFavorite}
                                  title={userCanFavorite ? (isFavorite ? "Remove from favourites" : "Add to favourites") : "Sign in to save favourites"}
                                  onClick={() => onFavorite(item.id, item.vendor_id)}
                                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-primary shadow-sm disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                  <Heart className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
                                </button>
                              </div>
                              <div className="p-2.5">
                                <h3 className="line-clamp-2 min-h-9 text-xs font-extrabold leading-snug text-foreground">{item.name}</h3>
                                <button type="button" onClick={() => onVendor(item.vendor_id)} className="mt-1 block w-full truncate text-left text-[10px] font-semibold text-muted-foreground">{vendor?.stall_name ?? "Local stall"}</button>
                                <div className="mt-2 flex items-end justify-between gap-1">
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-black text-foreground">{inr(price)}</span>
                                    {mrp > 0 ? <span className="block text-[10px] font-medium text-muted-foreground line-through">{inr(mrp)}</span> : null}
                                  </span>
                                  <button type="button" onClick={() => onAdd(item)} className="shrink-0 rounded-lg border border-primary bg-primary/5 px-2.5 py-1.5 text-[10px] font-black text-primary hover:bg-primary hover:text-primary-foreground">
                                    {line ? `+ ADD · ${line.qty}` : "+ ADD"}
                                  </button>
                                </div>
                              </div>
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
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className="px-4 pb-2 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <LocalSpotlight vendors={vendors} items={spotlightItems} onVendor={onVendor} />

          <div className="flex min-h-[252px] flex-col rounded-3xl border border-border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-1"><span className="text-xs font-black text-foreground">Best value</span><Link to="/categories" className="text-[10px] font-black text-primary">See all ›</Link></div>
            <div className="flex flex-1 flex-col justify-between gap-2">
              {valueItems.map((item) => {
                const line = lines.find((candidate) => candidate.itemId === item.id);
                return (
                  <div key={item.id} className="flex min-h-[61px] items-center gap-2 rounded-2xl border border-border bg-muted/45 p-1.5">
                    <img src={item.photo_url ?? foodImage(item.name)} alt={item.name} className="h-10 w-10 shrink-0 rounded-xl bg-brand-soft object-cover" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold text-foreground">{item.name}</span><span className="text-xs font-black text-primary">{inr(customerPrice(item.price))}</span></span>
                    {line ? <span className="flex items-center gap-1 rounded-lg bg-primary p-1 text-primary-foreground"><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onRemove(item.id)}><Minus className="h-3 w-3" /></button><span className="min-w-3 text-center text-[10px] font-black">{line.qty}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => onAdd(item)}><Plus className="h-3 w-3" /></button></span> : <button type="button" onClick={() => onAdd(item)} className="rounded-lg border border-primary bg-card px-2 py-1 text-[9px] font-black text-primary">ADD</button>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
                <article key={deal.id} className="min-w-0 rounded-3xl border border-border bg-white p-2.5 shadow-sm">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-brand-soft"><img src={deal.image_url ?? item.photo_url ?? foodImage(item.name)} alt={item.name} className="h-full w-full object-cover" />{offer < original ? <span className="absolute left-2 top-2 rounded-md bg-success px-1.5 py-0.5 text-[9px] font-black text-success-foreground">SAVE {inr(original - offer)}</span> : null}</div>
                  <button type="button" onClick={() => onVendor(item.vendor_id)} className="mt-2 block w-full truncate text-left text-[9px] font-bold text-muted-foreground">{vendors.find((vendor) => vendor.id === item.vendor_id)?.stall_name ?? "Local stall"}</button>
                  <h2 className="truncate text-xs font-extrabold text-foreground">{item.name}</h2>
                  <div className="mt-2 flex items-center justify-between gap-1"><span className="text-xs font-black text-primary">{inr(offer)} {offer < original ? <span className="text-[9px] font-medium text-muted-foreground line-through">{inr(original)}</span> : null}</span>{line ? <span className="flex items-center gap-1 rounded-lg bg-primary p-1 text-primary-foreground"><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onRemove(item.id)}><Minus className="h-3 w-3" /></button><span className="text-[10px] font-black">{line.qty}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => onAdd(item, offer, offer === 1 ? 199 : undefined)}><Plus className="h-3 w-3" /></button></span> : <button type="button" onClick={() => onAdd(item, offer, offer === 1 ? 199 : undefined)} className="rounded-lg bg-primary px-2.5 py-1.5 text-[9px] font-black text-primary-foreground">+ ADD</button>}</div>
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