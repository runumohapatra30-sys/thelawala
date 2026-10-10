import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, MapPin, Minus, Plus, QrCode, Search, ShoppingBag, Wallet, Zap } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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

type Props = {
  address: string | null;
  balance: number;
  categories: StreetFoodCategory[];
  vendors: StreetFoodVendor[];
  items: StreetFoodItem[];
  spotlightItems: StreetFoodItem[];
  deals: CuratedFoodDeal[];
  lines: CartLine[];
  query: string;
  activeCategoryId: string | null;
  voiceSearch: ReactNode;
  onQueryChange: (query: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onVendor: (vendorId: string) => void;
  onAdd: (item: StreetFoodItem, price?: number, promotionalMinimum?: number) => void;
  onRemove: (itemId: string) => void;
  onViewDeals: () => void;
  onInternalRoute: (route: string) => void;
};

export function PremiumHome({
  address,
  balance,
  categories,
  vendors,
  items,
  spotlightItems,
  deals,
  lines,
  query,
  activeCategoryId,
  voiceSearch,
  onQueryChange,
  onCategoryChange,
  onVendor,
  onAdd,
  onRemove,
  onViewDeals,
  onInternalRoute,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    if (query || reduceMotion) return;
    const timer = window.setInterval(() => setSuggestionIndex((value) => (value + 1) % SEARCH_SUGGESTIONS.length), 2800);
    return () => window.clearInterval(timer);
  }, [query, reduceMotion]);

  const inStock = useMemo(() => items.filter((item) => item.in_stock), [items]);
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
      <LiveHomeHeader address={address} balance={balance} query={query} onQueryChange={onQueryChange} voiceSearch={voiceSearch} onInternalRoute={onInternalRoute} />

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        <button type="button" onClick={() => onCategoryChange(null)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-extrabold transition ${activeCategoryId === null ? "border-foreground bg-foreground text-background shadow-sm" : "border-border bg-card text-muted-foreground"}`}>All stalls</button>
        {categories.map((category) => (
          <button key={category.id} type="button" onClick={() => onCategoryChange(category.id)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-extrabold transition ${activeCategoryId === category.id ? "border-foreground bg-foreground text-background shadow-sm" : "border-border bg-card text-muted-foreground"}`}>{category.emoji ? `${category.emoji} ` : ""}{category.name}</button>
        ))}
      </div>

      <section className="px-4 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <LocalSpotlight vendors={vendors} items={spotlightItems} onVendor={onVendor} />

          <div className="flex min-h-[252px] flex-col rounded-3xl border border-border bg-card p-3 shadow-card">
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
        <section className="mx-4 my-3 rounded-3xl border border-border bg-card p-4 shadow-card">
          <div className="mb-3 flex items-end justify-between gap-2"><span><span className="block text-sm font-black text-foreground">Freshly picked near you</span><span className="text-[11px] font-semibold text-muted-foreground">Live prices from local stalls</span></span><button type="button" onClick={onViewDeals} className="text-[11px] font-black text-primary">View deals</button></div>
          <div className="grid grid-cols-2 gap-3">
            {featured.map(({ deal, item }) => {
              const line = lines.find((candidate) => candidate.itemId === item.id);
              const offer = Number(deal.offer_price);
              const original = Math.max(Number(deal.original_price), customerPrice(item.mrp));
              return (
                <article key={deal.id} className="min-w-0 rounded-2xl border border-border p-2.5">
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
            <span className="min-w-0"><span className="block text-[10px] font-black uppercase">{lines.reduce((total, line) => total + line.qty, 0)} items in cart</span><span className="block truncate text-[10px] font-semibold opacity-75">Ready in about 15 minutes</span></span>
            <span className="flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-[10px] font-black text-primary"><ShoppingBag className="h-3.5 w-3.5" /> View</span>
          </Link>
        </motion.div>
      ) : null}
    </>
  );
}