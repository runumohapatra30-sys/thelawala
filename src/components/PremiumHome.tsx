import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, MapPin, Minus, Plus, QrCode, Search, ShoppingBag, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import type { CartLine } from "@/lib/cart";
import type { CuratedFoodDeal, StreetFoodCategory, StreetFoodItem, StreetFoodVendor } from "@/components/StreetFoodExperience";

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
};

export function PremiumHome({
  address,
  balance,
  categories,
  vendors,
  items,
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
}: Props) {
  const reduceMotion = useReducedMotion();
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    if (query || reduceMotion) return;
    const timer = window.setInterval(() => setSuggestionIndex((value) => (value + 1) % SEARCH_SUGGESTIONS.length), 2800);
    return () => window.clearInterval(timer);
  }, [query, reduceMotion]);

  const openVendors = useMemo(() => vendors.filter((vendor) => vendor.is_open), [vendors]);
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
  const spotlightVendor = openVendors[0] ?? vendors[0];
  const spotlightItems = spotlightVendor ? inStock.filter((item) => item.vendor_id === spotlightVendor.id).slice(0, 4) : inStock.slice(0, 4);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 pb-3 pt-3 shadow-sm backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link to="/cart" className="flex min-w-0 items-center gap-2.5 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-primary"><MapPin className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-black text-foreground">
                15 min delivery
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
              </span>
              <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-muted-foreground"><span className="max-w-[220px] truncate">{address ?? "Bhubaneswar · set your address"}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" /></span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/categories" aria-label="Scan or browse categories" className="grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground"><QrCode className="h-4 w-4" /></Link>
            <Link to="/wallet" aria-label={`Wallet balance ${inr(balance)}`} className="grid h-9 min-w-9 place-items-center rounded-full bg-primary px-2 text-[10px] font-black text-primary-foreground"><Wallet className="h-4 w-4" /></Link>
          </div>
        </div>

        <label className="flex h-11 items-center rounded-2xl border border-border bg-muted/70 px-3.5 shadow-inner focus-within:border-primary focus-within:bg-card">
          <Search className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="relative h-5 min-w-0 flex-1 overflow-hidden">
            {query ? null : (
              <AnimatePresence mode="wait">
                <motion.span key={suggestionIndex} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.22 }} className="absolute inset-x-0 truncate text-xs font-semibold text-muted-foreground">
                  Search “{SEARCH_SUGGESTIONS[suggestionIndex]}”
                </motion.span>
              </AnimatePresence>
            )}
            <input value={query} onChange={(event) => onQueryChange(event.target.value)} aria-label="Search food and stalls" className="absolute inset-0 w-full bg-transparent text-sm font-semibold text-foreground outline-none" />
          </span>
          <span className="ml-2 shrink-0">{voiceSearch}</span>
        </label>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        <button type="button" onClick={() => onCategoryChange(null)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-extrabold transition ${activeCategoryId === null ? "border-foreground bg-foreground text-background shadow-sm" : "border-border bg-card text-muted-foreground"}`}>All stalls</button>
        {categories.map((category) => (
          <button key={category.id} type="button" onClick={() => onCategoryChange(category.id)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-extrabold transition ${activeCategoryId === category.id ? "border-foreground bg-foreground text-background shadow-sm" : "border-border bg-card text-muted-foreground"}`}>{category.emoji ? `${category.emoji} ` : ""}{category.name}</button>
        ))}
      </div>

      <section className="px-4 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => spotlightVendor && onVendor(spotlightVendor.id)} className="relative flex min-h-[252px] flex-col justify-between overflow-hidden rounded-3xl bg-primary p-3.5 text-left text-primary-foreground shadow-[0_18px_34px_-22px_var(--color-primary)]">
            <span className="relative z-10">
              <span className="rounded-md bg-primary-foreground/15 px-2 py-1 text-[9px] font-black uppercase">Local spotlight</span>
              <span className="mt-2 block text-lg font-black leading-tight">{spotlightVendor?.stall_name ?? "Bhubaneswar street-food picks"}</span>
              <span className="mt-1 block text-[11px] font-semibold opacity-75">{spotlightVendor?.offer_label ?? "Hot, fresh and close to you"}</span>
            </span>
            <span className="relative z-10 my-3 grid grid-cols-2 gap-1.5">
              {spotlightItems.map((item) => <span key={item.id} className="overflow-hidden rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-1.5"><img src={item.photo_url ?? foodImage(item.name)} alt="" className="mx-auto h-10 w-10 rounded-lg object-cover" /><span className="mt-1 block truncate text-center text-[9px] font-bold">{item.name}</span></span>)}
            </span>
            <span className="relative z-10 flex w-full items-center justify-center gap-1 rounded-xl bg-card py-2 text-[11px] font-black text-primary">Explore stall <ArrowRight className="h-3 w-3" /></span>
          </button>

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