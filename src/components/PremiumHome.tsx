import { HomeFoodGrid } from "@/components/HomeFoodGrid";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, MapPin, Minus, Plus, QrCode, Search, ShoppingBag, ChevronRight, Wallet, Zap } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import type { CartLine } from "@/lib/cart";
import type { CuratedFoodDeal, StreetFoodCategory, StreetFoodItem, StreetFoodVendor } from "@/components/StreetFoodExperience";
import { LiveHomeHeader } from "@/components/LiveHomeHeader";
import { LocalSpotlight } from "@/components/LocalSpotlight";
import { BestValueCarousel } from "@/components/BestValueCarousel";
import type { DynamicBanner } from "@/lib/dynamicBanners";

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
  bestValuePromo: DynamicBanner | undefined;
  displayName?: string | null | undefined;
  avatarUrl?: string | null | undefined;
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
  bestValuePromo,
  displayName,
  avatarUrl,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [bestValueTheme, setBestValueTheme] = useState<string | null>(null);

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
      <LiveHomeHeader address={address} balance={balance} displayName={displayName} avatarUrl={avatarUrl} query={query} onQueryChange={onQueryChange} voiceSearch={voiceSearch} onInternalRoute={onInternalRoute} categories={categories} activeCategoryId={activeCategoryId} onCategoryChange={onCategoryChange} bestValueTheme={bestValueTheme} />

      <HomeFoodGrid items={inStock} vendors={vendors} lines={lines} onAdd={onAdd} onRemove={onRemove} onVendor={onVendor} />
      <section className="px-5 py-4"><LocalSpotlight vendors={vendors} items={spotlightItems} onVendor={onVendor} /></section>
      {bestValuePromo ? <section className="px-5 py-4"><BestValueCarousel items={valueItems} lines={lines} promo={bestValuePromo} onAdd={onAdd} onRemove={onRemove} onActiveTheme={setBestValueTheme} onInternalRoute={onInternalRoute} /></section> : null}

      {lines.length ? (
        <motion.div initial={reduceMotion ? false : { y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed inset-x-0 bottom-[98px] z-40 mx-auto w-full max-w-[480px] px-3">
          <Link to="/cart" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-full border border-primary/20 bg-primary px-3 py-2.5 text-primary-foreground shadow-card">
            <span className="flex -space-x-2">{lines.slice(0, 3).map((line) => <img key={line.itemId} src={line.photo ?? "/food/food-tiffin.jpg"} alt="" className="h-8 w-8 rounded-full border-2 border-primary-foreground object-cover" />)}</span>
            <span className="min-w-0"><span className="block text-[10px] font-black uppercase">{lines.reduce((total, line) => total + line.qty, 0)} items in cart</span><span className="block truncate text-[10px] font-semibold opacity-75">From your local stall</span></span>
            <span className="flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-[10px] font-black text-primary">View cart <ChevronRight className="h-4 w-4" /></span>
          </Link>
        </motion.div>
      ) : null}
    </>
  );
}