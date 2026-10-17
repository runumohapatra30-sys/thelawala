import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, ChevronDown, MapPin, Search, SlidersHorizontal, Wallet } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
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
/** Per-category header themes: tapping a category tints the whole header like quick-commerce apps. */
const CATEGORY_THEMES = ["#E8590C", "#2F6FDB", "#0F9D58", "#C2255C", "#7048E8", "#D9480F", "#0C8599", "#B08900"];

export function LiveHomeHeader({ address, balance, displayName, avatarUrl, query, onQueryChange, voiceSearch, onInternalRoute, categories, activeCategoryId, onCategoryChange }: {
  address: string | null; balance: number; query: string; onQueryChange: (query: string) => void;
  displayName?: string | null | undefined; avatarUrl?: string | null | undefined;
  voiceSearch: ReactNode; onInternalRoute: (route: string) => void;
  categories: StreetFoodCategory[]; activeCategoryId: string | null; onCategoryChange: (categoryId: string | null) => void;
}) {
  const rows = useHomeBanners();
  const branding = useAuthBranding();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suggestion, setSuggestion] = useState(0);
  const reduceMotion = useReducedMotion();
  const active = rows.find((row) => row.id === activeId) ?? rows[0];
  const onActive = useCallback((row: DynamicBanner | null) => setActiveId(row?.id ?? null), []);
  const categoryIndex = activeCategoryId ? categories.findIndex((category) => category.id === activeCategoryId) : -1;
  const categoryColor = categoryIndex >= 0 ? CATEGORY_THEMES[categoryIndex % CATEGORY_THEMES.length] : null;
  const themeColor = categoryColor ?? active?.theme_color;
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
    {hasBg && <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <AnimatePresence mode="sync">
        <motion.div key={active!.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.6 }} className="absolute inset-0">
          {active!.media_type === "video"
            ? <video src={active!.media_url} autoPlay={!reduceMotion} muted loop playsInline className="h-full w-full object-cover" />
            : <img src={active!.media_url} alt="" className="h-full w-full object-cover" />}
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-background" />
    </div>}
    <div aria-hidden="true" className={`home-category-tint pointer-events-none absolute inset-0 transition-opacity duration-500 ${categoryColor && hasBg ? "opacity-100" : "opacity-0"}`} />
    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background transition-opacity duration-500 ${categoryColor && hasBg ? "opacity-100" : "opacity-0"}`} />
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
              <span className={`block text-lg font-black leading-tight ${hasBg ? "text-white drop-shadow" : "text-primary"}`}>ThelaWala</span>
              <span className={`block truncate text-[9px] font-extrabold uppercase tracking-[0.1em] ${hasBg ? "text-white/85" : "text-muted-foreground"}`}>Local taste. Trusted service.</span>
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
          <p className={`truncate text-sm font-extrabold ${hasBg ? "text-white drop-shadow" : "text-foreground"}`}>{displayName ? `Welcome Back, ${displayName.split(" ")[0]}` : "Welcome Back"}</p>
          <Button asChild variant="ghost" className={`mt-1 h-auto min-w-0 max-w-full p-0 text-xs font-bold hover:bg-transparent ${hasBg ? "text-white" : "text-primary"}`}><Link to="/cart" title={address ?? "Choose delivery location"} aria-label="Choose delivery location"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{address ?? "Choose delivery location"}</span><ChevronDown className="h-3 w-3 shrink-0" /></Link></Button>
        </div>
      </div>
      <label className="flex h-12 min-w-0 items-center rounded-2xl border border-border bg-card px-3.5 shadow-card focus-within:ring-2 focus-within:ring-primary/20">
        <Search className="mr-2 h-4 w-4 shrink-0 text-primary" />
        <span className="relative h-5 min-w-0 flex-1 overflow-hidden">
          {!query && <AnimatePresence mode="wait"><motion.span key={suggestion} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.3 }} className="absolute inset-x-0 truncate text-xs text-muted-foreground">Search “{suggestions[suggestion]}”</motion.span></AnimatePresence>}
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} aria-label="Search food and stalls" className="absolute inset-0 w-full bg-transparent text-sm text-foreground outline-none" />
        </span>
        <button type="button" aria-label="Filter food by category" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} className={`ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-full border-l border-border pl-2 text-primary ${filtersOpen ? "bg-brand-soft" : ""}`}>
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <span className="ml-1 shrink-0 border-l border-border pl-2">{voiceSearch}</span>
      </label>
      {filtersOpen && !collapsed ? (
        <div className="mt-2 rounded-2xl border border-border bg-card p-3 shadow-card">
          <p className="mb-2 text-[11px] font-extrabold text-muted-foreground">Filter by category</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <button type="button" onClick={() => onCategoryChange(null)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${activeCategoryId === null ? "border-primary bg-primary text-white" : "border-border bg-white text-foreground"}`}>All food</button>
            {categories.map((category) => (
              <button key={category.id} type="button" onClick={() => onCategoryChange(category.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${activeCategoryId === category.id ? "border-primary bg-primary text-white" : "border-border bg-white text-foreground"}`}>{category.emoji ? `${category.emoji} ` : ""}{category.name}</button>
            ))}
          </div>
        </div>
      ) : null}
      {!collapsed && (
        <section className="mt-3">
          <h2 className={`mb-2 text-xs font-black ${hasBg ? "text-white" : "text-foreground"}`}>Explore Categories</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            <button type="button" aria-pressed={activeCategoryId === null} onClick={() => onCategoryChange(null)} className="w-[68px] shrink-0 text-center">
              <span className={`mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 bg-white shadow-sm transition-all duration-300 ${activeCategoryId === null ? "scale-105 border-primary ring-2 ring-primary/30" : "border-white"}`}>
                <img src="/food/food-thali.jpg" alt="" className="h-full w-full object-cover" />
              </span>
              <span className={`mt-1 block truncate rounded-full px-1 py-0.5 text-[10px] font-bold transition-colors duration-300 ${activeCategoryId === null ? "bg-primary text-primary-foreground" : hasBg ? "text-white" : "text-foreground"}`}>All food</span>
            </button>
            {categories.map((category, index) => {
              const selected = activeCategoryId === category.id;
              const color = CATEGORY_THEMES[index % CATEGORY_THEMES.length];
              return (
                <button key={category.id} type="button" aria-pressed={selected} onClick={() => onCategoryChange(selected ? null : category.id)} className="w-[68px] shrink-0 text-center">
                  <span style={selected ? { borderColor: color, boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 35%, transparent)` } : undefined} className={`relative mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 bg-white shadow-sm transition-all duration-300 ${selected ? "scale-110" : "border-white"}`}>
                    <img src={foodImage(category.name)} alt="" className="h-full w-full object-cover" />
                    {category.emoji ? <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px]">{category.emoji}</span> : null}
                  </span>
                  <span style={selected ? { backgroundColor: color } : undefined} className={`mt-1 block truncate rounded-full px-1 py-0.5 text-[10px] font-bold transition-colors duration-300 ${selected ? "text-white" : hasBg ? "text-white" : "text-foreground"}`}>{category.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
    <motion.div initial={false} animate={{ height: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1 }} transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }} className="relative overflow-hidden" inert={collapsed}>
      <DynamicBanners rows={rows} onActive={onActive} onInternalRoute={onInternalRoute} overlayOnly={hasBg} />
    </motion.div>
  </header>;
}
