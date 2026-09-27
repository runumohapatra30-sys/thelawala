import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bike, MapPin, Minus, Plus, Timer, Utensils, Zap } from "lucide-react";
import { customerPrice } from "@/lib/pricing";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import type { CartLine } from "@/lib/cart";

export type StreetFoodItem = {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name: string;
  details: string | null;
  photo_url: string | null;
  unit: string | null;
  price: number;
  mrp: number;
  in_stock: boolean;
  food_type: string;
};

export type StreetFoodCategory = { id: string; name: string; emoji: string | null };
export type StreetFoodVendor = {
  id: string;
  stall_name: string;
  is_open: boolean;
  photo_url: string | null;
  offer_percent: number | null;
  offer_label?: string | null;
  address: string | null;
  zone: string | null;
  default_prep_minutes: number;
};
export type CuratedFoodDeal = {
  id: string;
  menu_item_id: string;
  item_name: string;
  offer_price: number;
  original_price: number;
  image_url: string | null;
  tag: string | null;
  bundle_title: string;
  bundle_subtitle: string;
};

type Props = {
  items: StreetFoodItem[];
  categories: StreetFoodCategory[];
  vendors: StreetFoodVendor[];
  lines: CartLine[];
  ratings: Record<string, number>;
  activeCategoryId: string | null;
  regularCartTotal: number;
  promoFocus: string | null;
  onSelectCategory: (id: string | null) => void;
  onAdd: (item: StreetFoodItem, offerPrice?: number, promoMinimum?: number) => void;
  onRemove: (itemId: string) => void;
  onOptions: (itemId: string, options: string[]) => void;
  onVendor: (vendorId: string) => void;
  onClearPromoFocus: () => void;
  deals: CuratedFoodDeal[];
};

const BUILDERS = [
  { id: "all", label: "All street food", match: /.+/ },
  { id: "tiffin", label: "Breakfast & Tiffin", match: /breakfast|tiffin|bara|singada|singhara|aluchop|piaji|upma|idli|dosa/ },
  { id: "momos", label: "Momos", match: /momo|dumpling/ },
  { id: "chaat", label: "Chaat & Gupchup", match: /chaat|gupchup|pani puri|panipuri|dahibara|bhel/ },
  { id: "rolls", label: "Rolls & Fast Food", match: /roll|chowmein|noodle|burger|fries|sandwich|fast food/ },
] as const;
const OPTIONS = ["Less Spicy", "Extra Onion"];
const POSITIONS = [
  { left: "22%", top: "24%" },
  { left: "63%", top: "19%" },
  { left: "35%", top: "59%" },
  { left: "68%", top: "56%" },
  { left: "47%", top: "39%" },
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function vesselFor(key: string) {
  if (key === "momos") return "rounded-[28%] border-[7px] border-[#9A693F] bg-[repeating-linear-gradient(0deg,#DAB68A_0_5px,#C89969_5px_8px)] shadow-[inset_0_0_0_5px_rgba(91,54,25,0.22),0_20px_32px_-24px_rgba(17,24,39,0.8)]";
  if (key === "chaat") return "rounded-[46%_46%_42%_42%] border-[10px] border-[#A85D38] bg-[radial-gradient(ellipse_at_center,#F4C99E_0_58%,#DC996B_59%_70%,#AD6541_71%)] shadow-[0_20px_32px_-24px_rgba(17,24,39,0.8)]";
  if (key === "rolls") return "rounded-[22%] border-[7px] border-[#F8CB46] bg-[linear-gradient(135deg,#fff8df,#f3e8c5)] shadow-[0_20px_32px_-24px_rgba(17,24,39,0.8)]";
  return "rounded-full border-[10px] border-[#6C8B52] bg-[radial-gradient(circle,#F7F1D8_0_57%,#E7E1BE_58%_68%,#D7E5C8_69%)] shadow-[0_20px_32px_-24px_rgba(17,24,39,0.8)]";
}

function sideLabels(key: string) {
  if (key === "all") return ["Chutney", "Green chili"];
  if (key === "momos") return ["Red chutney", "Mayo"];
  if (key === "chaat") return ["Teekha pani", "Meetha pani"];
  if (key === "rolls") return ["Green chutney", "Onion salad"];
  return ["Ghuguni", "Chutney"];
}

export function StreetFoodExperience({
  items,
  categories,
  vendors,
  lines,
  ratings,
  activeCategoryId,
  regularCartTotal,
  promoFocus,
  onSelectCategory,
  onAdd,
  onRemove,
  onOptions,
  onVendor,
  onClearPromoFocus,
  deals,
}: Props) {
  const [builderOverride, setBuilderOverride] = useState<string | null>(null);
  useEffect(() => {
    if (!promoFocus) return;
    const target = promoFocus.includes("rupee") ? "one-rupee-store" : "street-food-recommendations";
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    onClearPromoFocus();
  }, [promoFocus, onClearPromoFocus]);

  const activeCategory = categories.find((category) => category.id === activeCategoryId);
  const activeBuilder = activeCategory
    ? BUILDERS.find((builder) => builder.id !== "all" && builder.match.test(activeCategory.name))
    : undefined;
  const selectedBuilder = activeBuilder ?? (activeCategory
    ? { id: "custom", label: activeCategory.name, match: /(?:)/ }
    : BUILDERS.find((builder) => builder.id === builderOverride) ?? BUILDERS[0]);
  const [area, setArea] = useState("All areas");
  const [quickOnly, setQuickOnly] = useState(false);
  const categoryName = (categoryId: string | null) => categories.find((category) => category.id === categoryId)?.name ?? "";
  const menuText = (item: StreetFoodItem) => `${item.name} ${item.details ?? ""} ${categoryName(item.category_id)}`;
  const builderItems = items.filter((item) => item.in_stock && (activeCategory && !activeBuilder
    ? item.category_id === activeCategory.id
    : selectedBuilder.match.test(menuText(item))));
  const relatedItems = (activeCategoryId
    ? items.filter((item) => item.category_id === activeCategoryId && item.in_stock)
    : selectedBuilder.id === "tiffin"
      ? builderItems.length ? builderItems : items.filter((item) => item.in_stock)
      : builderItems.length ? builderItems : items.filter((item) => item.in_stock)
  ).slice(0, 24);
  const plateItems = lines
    .filter((line) => builderItems.some((item) => item.id === line.itemId))
    .slice(0, 5);
  const vesselSides = sideLabels(selectedBuilder.id);
  const grouped = deals
    .map((deal) => ({ deal, item: items.find((item) => item.id === deal.menu_item_id) }))
    .filter((entry): entry is { deal: CuratedFoodDeal; item: StreetFoodItem } => Boolean(entry.item?.in_stock));
  const oneRupeeDeals = grouped.filter(({ deal }) => Number(deal.offer_price) === 1);
  const dailyDeals = grouped.length
    ? grouped
    : items.filter((item) => item.in_stock && Number(item.mrp) > Number(item.price) * 1.05)
        .sort((a, b) => (Number(b.mrp) - Number(b.price)) / Math.max(Number(b.mrp), 1) - (Number(a.mrp) - Number(a.price)) / Math.max(Number(a.mrp), 1))
        .slice(0, 8)
        .map((item) => ({ deal: { id: item.id, menu_item_id: item.id, item_name: item.name, offer_price: customerPrice(item.price), original_price: customerPrice(item.mrp), image_url: item.photo_url, tag: "Menu offer", bundle_title: "Today's street-food deal", bundle_subtitle: "Live stall price" }, item }));
  const rushDeals = grouped.filter(({ deal }) => /rush|12\s?am|midnight/i.test(deal.tag ?? ""));
  const filteredVendors = vendors.filter((vendor) => {
    const location = `${vendor.address ?? ""} ${vendor.zone ?? ""}`.toLowerCase();
    const areaMatch = area === "All areas" || location.includes(area.toLowerCase());
    return areaMatch && (!quickOnly || (vendor.is_open && vendor.default_prep_minutes > 0 && vendor.default_prep_minutes <= 15));
  });

  function addCurated(deal: CuratedFoodDeal, item: StreetFoodItem) {
    const price = Number(deal.offer_price);
    onAdd(item, price, price === 1 ? 199 : undefined);
  }

  function toggleOption(itemId: string, selected: string[], option: string) {
    onOptions(itemId, selected.includes(option) ? selected.filter((value) => value !== option) : [...selected, option]);
  }

  return (
    <div className="space-y-8 px-5 pb-8">
      <section id="plate-builder" className="scroll-mt-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0C831F]">Made your way</p>
            <h2 className="mt-1 text-xl font-black text-[#111827]">Build your plate</h2>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#6B7280]"><Utensils className="h-3.5 w-3.5" /> Live cart plate</span>
        </div>
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BUILDERS.map((builder) => {
            const category = categories.find((candidate) => builder.match.test(candidate.name));
            const active = selectedBuilder.id === builder.id;
            return (
              <button key={builder.id} type="button" onClick={() => { setBuilderOverride(builder.id); onSelectCategory(category?.id ?? null); }} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold transition-colors ${active ? "border-[#0C831F] bg-[#0C831F] text-white" : "border-[#EBECEF] bg-white text-[#111827]"}`}>
                {builder.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 rounded-2xl border border-[#EBECEF] bg-white p-3 shadow-[0_10px_28px_-22px_rgba(17,24,39,0.65)] sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:p-4">
          <div className="relative grid min-h-[270px] place-items-center overflow-hidden rounded-xl bg-[#F8F9FA]">
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center gap-6">
              {[0, 1, 2].map((steam) => <motion.span key={steam} animate={{ y: [-2, -26], opacity: [0, 0.5, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: steam * 0.48, ease: "easeOut" }} className="h-8 w-1.5 rounded-full bg-white blur-[3px]" />)}
            </div>
            <div className={`relative h-[226px] w-[226px] ${vesselFor(selectedBuilder.id)}`}>
              <span className="absolute inset-[13%] rounded-full border border-white/60" />
              {plateItems.length === 0 ? <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-[11px] font-semibold text-[#6B7280]">Choose a dish below to start your plate</p> : null}
              <AnimatePresence>
                {plateItems.map((line, index) => {
                  const position = POSITIONS[index % POSITIONS.length]!;
                  return (
                    <motion.div key={line.itemId} initial={{ y: -150, scale: 0.55, rotate: -18 }} animate={{ y: 0, scale: 1, rotate: index % 2 ? 7 : -6 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: "spring", stiffness: 310, damping: 17 }} style={{ left: position.left, top: position.top }} className="absolute z-10 h-12 w-12 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-white bg-white shadow-lg">
                      <img src={line.photo ?? "/food/food-tiffin.jpg"} alt={line.name} className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 right-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#0C831F] px-1 text-[8px] font-black text-white">{line.qty}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div className="absolute -bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {vesselSides.map((side) => <span key={side} className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-[#F8CB46] px-1 text-center text-[7px] font-black leading-tight text-[#111827] shadow-md">{side}</span>)}
              </div>
            </div>
            <span className="absolute bottom-2 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold text-[#6B7280]">{selectedBuilder.label}</span>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[#111827]">Choose your favourites</h3>
              <span className="text-[10px] font-semibold text-[#6B7280]">{builderItems.length} available</span>
            </div>
            <div className="max-h-[272px] space-y-2 overflow-y-auto pr-1">
              {builderItems.slice(0, 8).map((item) => {
                const line = lines.find((candidate) => candidate.itemId === item.id);
                const qty = line?.qty ?? 0;
                return (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg border border-[#EBECEF] p-2">
                    <img src={item.photo_url ?? foodImage(item.name)} alt={item.name} className="h-10 w-10 shrink-0 rounded-md bg-[#F8F9FA] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-[#111827]">{item.name}</p>
                      <p className="text-[10px] font-black text-[#0C831F]">{inr(customerPrice(item.price))}</p>
                    </div>
                    <div className="grid grid-cols-[1.75rem_1.25rem_1.75rem] items-center rounded-full border border-[#EBECEF]">
                      <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onRemove(item.id)} disabled={!qty} className="grid h-7 w-7 place-items-center text-[#0C831F] disabled:opacity-35"><Minus className="h-3 w-3" /></button>
                      <span className="text-center text-[10px] font-black">{qty}</span>
                      <button type="button" aria-label={`Add one ${item.name}`} onClick={() => onAdd(item)} className="grid h-7 w-7 place-items-center rounded-full bg-[#0052FF] text-white"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    {qty ? <span className="sr-only">{line?.qty} in cart</span> : null}
                  </div>
                );
              })}
              {builderItems.length === 0 ? <p className="rounded-lg bg-[#F8F9FA] p-4 text-xs text-[#6B7280]">No in-stock dishes in this style right now. Pick another plate style or browse all street food.</p> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPTIONS.map((option) => {
                const selected = lines.some((line) => builderItems.some((item) => item.id === line.itemId) && line.options?.includes(option));
                return <button key={option} type="button" onClick={() => { const targets = lines.filter((line) => builderItems.some((item) => item.id === line.itemId)); for (const line of targets) toggleOption(line.itemId, line.options ?? [], option); }} className={`rounded-full border px-2.5 py-1.5 text-[9px] font-bold ${selected ? "border-[#0C831F] bg-[#E8F5E9] text-[#0C831F]" : "border-[#EBECEF] text-[#6B7280]"}`}>{selected ? "✓ " : "+ "}{option}</button>;
              })}
            </div>
          </div>
        </div>
        {plateItems.length ? <p className="mt-2 text-[10px] font-semibold text-[#6B7280]">Kitchen plate: {plateItems.map((line) => `${line.qty}x ${line.name}`).join(", ")}</p> : null}
      </section>

      <section id="street-food-recommendations" className="scroll-mt-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0C831F]">Good together</p>
            <h2 className="mt-1 text-xl font-black text-[#111827]">Popular street food</h2>
          </div>
          <span className="text-[10px] font-semibold text-[#6B7280]">{relatedItems.length} picks</span>
        </div>
        {relatedItems.length ? (
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {relatedItems.map((item) => {
              const line = lines.find((candidate) => candidate.itemId === item.id);
              const original = customerPrice(item.mrp);
              const price = customerPrice(item.price);
              const discount = original > price ? Math.round((1 - price / original) * 100) : 0;
              return (
                <article key={item.id} className="w-[142px] shrink-0 snap-start overflow-hidden rounded-xl border border-[#EBECEF] bg-white">
                  <div className="relative aspect-[4/3] bg-[#F8F9FA]">
                    <img src={item.photo_url ?? foodImage(item.name)} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                    {discount > 0 ? <span className="absolute left-2 top-2 rounded-full bg-[#0C831F] px-2 py-1 text-[9px] font-black text-white">-{discount}%</span> : null}
                    <button type="button" aria-label={`Add ${item.name}`} onClick={() => onAdd(item)} className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-[#0052FF] text-white shadow-md"><Plus className="h-4 w-4" /></button>
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-[11px] font-bold text-[#111827]">{item.name}</p>
                    <p className="mt-1 flex items-baseline gap-1 text-xs font-black text-[#111827]">{inr(price)} {discount > 0 ? <span className="text-[9px] font-medium text-[#6B7280] line-through">{inr(original)}</span> : null}</p>
                    <p className="mt-1 text-[9px] font-medium text-[#6B7280]">{ratings[item.vendor_id] ? `★ ${ratings[item.vendor_id].toFixed(1)} stall rating` : "New menu item"}{line ? ` · ${line.qty} in cart` : ""}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p className="rounded-xl bg-[#F8F9FA] p-4 text-xs text-[#6B7280]">In-stock menu picks will appear here.</p>}
      </section>

      <section className="space-y-3" aria-label="Current food offers">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0C831F]">Stall-priced specials</p>
            <h2 className="mt-1 text-xl font-black text-[#111827]">Deals of the day</h2>
          </div>
          <Zap className="h-5 w-5 text-[#F8CB46]" fill="currentColor" />
        </div>
        {dailyDeals.length ? (
          <div className="-mx-5 overflow-hidden bg-gradient-to-r from-[#0C831F] to-[#075B1A] px-5 py-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-[#F8CB46] px-2 py-1 text-[9px] font-black text-[#111827]">{dailyDeals[0]!.deal.tag || "LIVE MENU DEAL"}</span>
                <h3 className="mt-2 truncate text-base font-black">{dailyDeals[0]!.deal.bundle_title || dailyDeals[0]!.item.name}</h3>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-white/80">{dailyDeals[0]!.deal.bundle_subtitle || dailyDeals[0]!.item.name}</p>
                <p className="mt-2 text-sm font-black">{inr(Number(dailyDeals[0]!.deal.offer_price))} <span className="ml-1 text-[10px] font-medium text-white/65 line-through">{inr(Number(dailyDeals[0]!.deal.original_price))}</span></p>
              </div>
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/30 bg-white/10">
                <img src={dailyDeals[0]!.deal.image_url || dailyDeals[0]!.item.photo_url || foodImage(dailyDeals[0]!.item.name)} alt={dailyDeals[0]!.item.name} className="h-full w-full object-cover" />
                <button type="button" onClick={() => addCurated(dailyDeals[0]!.deal, dailyDeals[0]!.item)} aria-label={`Add ${dailyDeals[0]!.item.name}`} className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-[#F8CB46] text-[#111827]"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ) : <p className="rounded-xl border border-dashed border-[#EBECEF] p-4 text-xs text-[#6B7280]">No discounted menu or curated bundles are live right now.</p>}

        {rushDeals.length ? (
          <div className="rounded-xl border border-[#EBECEF] bg-white p-4">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-[#E63946]">Deal rush</p><h3 className="mt-1 text-sm font-black text-[#111827]">Stall-curated limited offers</h3></div><span className="animate-pulse rounded-full bg-[#E63946] px-2 py-1 text-[9px] font-black text-white">{/12\s?am|midnight/i.test(rushDeals[0]!.deal.tag ?? "") ? "Only till 12 AM" : "LIVE NOW"}</span></div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{rushDeals.slice(0, 5).map(({ deal, item }) => <button key={deal.id} type="button" onClick={() => addCurated(deal, item)} className="flex shrink-0 items-center gap-2 rounded-lg bg-[#F8F9FA] p-2 text-left"><img src={deal.image_url || item.photo_url || foodImage(item.name)} alt={item.name} className="h-10 w-10 rounded-md object-cover" /><span><span className="block max-w-32 truncate text-[10px] font-bold text-[#111827]">{item.name}</span><span className="text-[10px] font-black text-[#0C831F]">{inr(Number(deal.offer_price))} <span className="font-medium text-[#6B7280] line-through">{inr(Number(deal.original_price))}</span></span></span></button>)}</div>
          </div>
        ) : null}

        <div id="one-rupee-store" className="scroll-mt-5 rounded-xl border border-[#EBECEF] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-[#0052FF]">Curated bundle offers</p>
              <h3 className="mt-1 text-base font-black text-[#111827]">₹1 Store</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6B7280]">Add ₹199 of regular-price food to unlock one eligible ₹1 menu bundle.</p>
            </div>
            <span className="rounded-lg bg-[#E8F5E9] px-2 py-1 text-[9px] font-black text-[#0C831F]">THELAWALA</span>
          </div>
          {oneRupeeDeals.length ? (
            <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">
              {oneRupeeDeals.map(({ deal, item }) => {
                const unlocked = regularCartTotal >= 199;
                const inCart = lines.some((line) => line.itemId === item.id);
                return <article key={deal.id} className="flex w-[240px] shrink-0 items-center gap-2 rounded-lg bg-[#F8F9FA] p-2">
                  <img src={deal.image_url || item.photo_url || foodImage(item.name)} alt={item.name} className="h-12 w-12 rounded-md object-cover" />
                  <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-[#111827]">{deal.item_name || item.name}</p><p className="text-[10px] font-black text-[#0C831F]">₹1 <span className="ml-1 font-medium text-[#6B7280] line-through">{inr(Number(deal.original_price))}</span></p><p className="truncate text-[9px] text-[#6B7280]">{unlocked ? "Basket offer unlocked" : `Add ${inr(199 - regularCartTotal)} more`}</p></div>
                  <button type="button" disabled={!unlocked || inCart} onClick={() => addCurated(deal, item)} aria-label={`Add ${item.name} for ₹1`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0052FF] text-white disabled:opacity-40">{inCart ? "✓" : <Plus className="h-4 w-4" />}</button>
                </article>;
              })}
            </div>
          ) : <p className="mt-3 rounded-lg bg-[#F8F9FA] p-3 text-[10px] leading-relaxed text-[#6B7280]">No ₹1 bundle is currently configured by a stall. Active offers will appear here automatically.</p>}
        </div>

        <div className="rounded-xl bg-[#111827] p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F8CB46]">Saver Pass preview</p><h3 className="mt-1 text-base font-black">Live discounts from your local stalls</h3><p className="mt-1 text-[10px] text-white/70">30-day price locks are not enabled yet. Current stall offers are shown here.</p></div>
            <button type="button" onClick={() => document.getElementById("street-food-recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="shrink-0 rounded-lg bg-[#0052FF] px-3 py-2 text-[10px] font-black">Browse deals</button>
          </div>
        </div>
      </section>

      <section className="scroll-mt-4" aria-label="Nearby street food stalls">
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0C831F]">Gali Kandi view</p><h2 className="mt-1 text-xl font-black text-[#111827]">Street-smart nearby</h2></div>
          <MapPin className="h-5 w-5 text-[#0C831F]" />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["All areas", "Dumduma", "Nayapalli", "Master Canteen"].map((place) => <button key={place} type="button" onClick={() => setArea(place)} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold ${area === place ? "border-[#0C831F] bg-[#0C831F] text-white" : "border-[#EBECEF] bg-white text-[#111827]"}`}>{place}</button>)}
          <button type="button" onClick={() => setQuickOnly((value) => !value)} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold ${quickOnly ? "border-[#0052FF] bg-[#0052FF] text-white" : "border-[#EBECEF] bg-white text-[#111827]"}`}><Timer className="mr-1 inline h-3 w-3" />10–15 min prep</button>
        </div>
        {filteredVendors.length ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {filteredVendors.slice(0, 6).map((vendor) => <button key={vendor.id} type="button" onClick={() => onVendor(vendor.id)} className="flex min-w-0 items-center gap-2 rounded-xl border border-[#EBECEF] bg-white p-2 text-left">
              <img src={vendor.photo_url || foodImage(vendor.stall_name)} alt={vendor.stall_name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-black text-[#111827]">{vendor.stall_name}</span><span className="mt-0.5 block truncate text-[9px] text-[#6B7280]">{vendor.address || vendor.zone || "Bhubaneswar"}</span><span className={`mt-1 flex items-center gap-1 text-[9px] font-bold ${vendor.is_open ? "text-[#0C831F]" : "text-[#6B7280]"}`}><Bike className="h-3 w-3" />{vendor.is_open ? vendor.default_prep_minutes ? `${vendor.default_prep_minutes} min prep` : "Open now" : "Closed now"}</span></span>
            </button>)}
          </div>
  ) : <p className="mt-3 rounded-xl bg-[#F8F9FA] p-4 text-xs text-[#6B7280]">No approved stalls match this area filter yet.</p>}
      </section>
    </div>
  );
}
