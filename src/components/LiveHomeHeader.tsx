import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, ChevronDown, MapPin, Search, SlidersHorizontal, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DynamicBanners } from "@/components/DynamicBanners";
import { useHomeBanners } from "@/lib/homeBanners";
import type { DynamicBanner } from "@/lib/dynamicBanners";
import type { StreetFoodCategory } from "@/components/StreetFoodExperience";
import { inr } from "@/lib/fees";
import { foodImage } from "@/lib/foodImage";
import { ThelaLogo } from "@/components/Shell";
import { useAuthBranding } from "@/lib/authBranding";

const suggestions = ["Khandagiri Dahi Bara", "Gupchup & Chaat", "Egg Chicken Roll", "Evening Hot Pakoda"];

export function LiveHomeHeader({ address, balance, displayName, avatarUrl, query, onQueryChange, voiceSearch, onInternalRoute, categories, activeCategoryId, onCategoryChange, bestValueTheme }: {
  address: string | null; balance: number; query: string; onQueryChange: (query: string) => void;
  displayName?: string | null | undefined; avatarUrl?: string | null | undefined;
  voiceSearch: ReactNode; onInternalRoute: (route: string) => void;
  categories: StreetFoodCategory[]; activeCategoryId: string | null; onCategoryChange: (categoryId: string | null) => void;
  bestValueTheme: string | null;
}) {
  const banners = useHomeBanners();
  const rows = useMemo(() => banners.filter((row) => row.banner_format !== "BEST_VALUE"), [banners]);
  const branding = useAuthBranding();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suggestion, setSuggestion] = useState(0);
  const reduceMotion = useReducedMotion();
  const active = rows.find((row) => row.id === activeId) ?? rows[0];
  const onActive = useCallback((row: DynamicBanner | null) => setActiveId(row?.id ?? null), []);
  const themeColor = bestValueTheme ?? active?.theme_color;
  const hasBg = Boolean(active?.media_url);
  const style = themeColor && /^#[0-9a-f]{6}$/i.test(themeColor)
    ? { "--home-theme": themeColor } as CSSProperties : undefined;

  useEffect(() => {
    let frame = 0;
    const scroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        setCollapsed((previous) => window.scrollY > 80 ? true : window.scrollY < 16 ? false : previous);
        frame = 0;
      });
    };
    scroll(); window.addEventListener("scroll", scroll, { passive: true });
    return () => { window.removeEventListener("scroll", scroll); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => {
    if (query || reduceMotion) return;
    const timer = window.setInterval(() => setSuggestion((value) => (value + 1) % suggestions.length), 2800);
    return () => window.clearInterval(timer);
  }, [query, reduceMotion]);

  return <header data-collapsed={collapsed} style={style} className="home-live-header sticky top-0 z-50 border-b border-border shadow-card transition-colors duration-500">
    <div className={`relative px-4 transition-all duration-500 ${collapsed ? "pb-2 pt-2" : "pb-3 pt-4"}`}>
      {!collapsed ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="ThelaWala home">
            {branding.appLogoUrl ? (
              <img
                src={branding.appLogoUrl}
                alt=""
                onError={(event) => { event.currentTarget.style.display = "none"; }}
                className="h-10 w-10 shrink-0 object-contain"
              />
            ) : <ThelaLogo className="h-10 w-10 shrink-0" />}
            <span className="min-w-0">
              <span className={`block text-lg font-black leading-tight ${"text-foreground"}`}>ThelaWala</span>
              <span className={`block truncate text-[9px] font-extrabold uppercase tracking-[0.1em] ${"text-muted-foreground"}`}>15 minutes · Bhubaneswar</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button asChild size="icon" variant="outline"><Link to="/notifications" aria-label="Notifications" title="Notifications"><Bell /></Link></Button>
            <Button asChild size="icon" variant="outline"><Link to="/wallet" aria-label={`Wallet balance ${inr(balance)}`} title={`Wallet ${inr(balance)}`}><Wallet /></Link></Button>
            <Link to="/profile" aria-label="Your profile" className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card text-primary">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-black">{displayName?.slice(0, 1).toUpperCase() || "TW"}</span>}
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-extrabold ${"text-foreground"}`}>Delivering to</p>
          <Button asChild variant="ghost" className={`mt-1 h-auto min-w-0 max-w-full p-0 text-xs font-bold hover:bg-transparent ${"text-foreground"}`}><Link to="/cart" title={address ?? "Choose delivery location"} aria-label="Choose delivery location"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{address ?? "Choose delivery location"}</span><ChevronDown className="h-3 w-3 shrink-0" /></Link></Button>
        </div>
      </div>
      <label className="flex h-12 min-w-0 items-center rounded-2xl border border-border bg-card px-3.5 shadow-card focus-within:ring-2 focus-within:ring-primary/20">
        <Search className="mr-2 h-4 w-4 shrink-0 text-primary" />
        <span className="relative h-5 min-w-0 flex-1 overflow-hidden">
          {!query && <AnimatePresence mode="wait"><motion.span key={suggestion} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.3 }} className="absolute inset-x-0 truncate text-xs text-muted-foreground">Search “{suggestions[suggestion]}”</motion.span></AnimatePresence>}
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} aria-label="Search food and stalls" className="absolute inset-0 w-full bg-transparent text-sm text-foreground outline-none" />
        </span>
        <Button variant="ghost" type="button" aria-label="Filter food by category" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} className={`ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-full border-l border-border pl-2 text-primary ${filtersOpen ? "bg-brand-soft" : ""}`}>
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
        <span className="ml-1 shrink-0 border-l border-border pl-2">{voiceSearch}</span>
      </label>
      {filtersOpen && !collapsed ? (
        <div className="mt-2 rounded-2xl border border-border bg-card p-3 shadow-card">
          <p className="mb-2 text-[11px] font-extrabold text-muted-foreground">Filter by category</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <Button variant="ghost" type="button" onClick={() => onCategoryChange(null)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${activeCategoryId === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>All food</Button>
            {categories.map((category) => (
              <Button variant="ghost" key={category.id} type="button" onClick={() => onCategoryChange(category.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${activeCategoryId === category.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>{category.emoji ? `${category.emoji} ` : ""}{category.name}</Button>
            ))}
          </div>
        </div>
      ) : null}
      {!collapsed && (
        <section className="mt-3">
          <h2 className={`mb-2 text-xs font-black ${"text-foreground"}`}>Explore Categories</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            <Button variant="ghost" type="button" onClick={() => onCategoryChange(null)} className="w-[68px] shrink-0 text-center">
              <span className={`mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-full border bg-card ${activeCategoryId === null ? "border-primary" : "border-card"}`}>
                <img src="/food/food-thali.jpg" alt="" className="h-full w-full object-cover" />
              </span>
              <span className="mt-1 block truncate text-[10px] font-bold">All food</span>
            </Button>
            {categories.map((category) => (
              <Button variant="ghost" key={category.id} type="button" onClick={() => onCategoryChange(category.id)} className="w-[68px] shrink-0 text-center">
                <span className={`relative mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-full border bg-card ${activeCategoryId === category.id ? "border-primary" : "border-card"}`}>
                  <img src={foodImage(category.name)} alt="" className="h-full w-full object-cover" />
                  {category.emoji ? <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-card text-[10px]">{category.emoji}</span> : null}
                </span>
                <span className="mt-1 block truncate text-[10px] font-bold">{category.name}</span>
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
    <motion.div initial={false} animate={{ height: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1 }} transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }} className="relative overflow-hidden" inert={collapsed}>
      <DynamicBanners rows={rows} onActive={onActive} onInternalRoute={onInternalRoute} overlayOnly={false} />
    </motion.div>
  </header>;
}
