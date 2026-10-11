import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, MapPin, QrCode, Search, Wallet, Zap } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DynamicBanners } from "@/components/DynamicBanners";
import { useHomeBanners } from "@/lib/homeBanners";
import type { DynamicBanner } from "@/lib/dynamicBanners";
import type { StreetFoodCategory } from "@/components/StreetFoodExperience";
import { inr } from "@/lib/fees";

const suggestions = ["Khandagiri Dahi Bara", "Gupchup & Chaat", "Egg Chicken Roll", "Evening Hot Pakoda"];

export function LiveHomeHeader({ address, balance, query, onQueryChange, voiceSearch, onInternalRoute, categories, activeCategoryId, onCategoryChange }: {
  address: string | null; balance: number; query: string; onQueryChange: (query: string) => void;
  voiceSearch: ReactNode; onInternalRoute: (route: string) => void;
  categories: StreetFoodCategory[]; activeCategoryId: string | null; onCategoryChange: (categoryId: string | null) => void;
}) {
  const rows = useHomeBanners();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [suggestion, setSuggestion] = useState(0);
  const reduceMotion = useReducedMotion();
  const active = rows.find((row) => row.id === activeId) ?? rows[0];
  const onActive = useCallback((row: DynamicBanner | null) => setActiveId(row?.id ?? null), []);
  const themeColor = active?.theme_color;
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

  const pill = (isActive: boolean) => `shrink-0 rounded-full border px-3.5 py-2 text-xs font-extrabold transition ${isActive
    ? "border-foreground bg-foreground text-background shadow-sm"
    : hasBg ? "border-white/30 bg-white/15 text-white backdrop-blur-sm" : "border-border bg-card text-muted-foreground"}`;

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
    <div className={`relative px-4 transition-all duration-500 ${collapsed ? "pb-2 pt-2" : "pb-3 pt-4"}`}>
      <motion.div initial={false} animate={{ height: collapsed ? 0 : 26, opacity: collapsed ? 0 : 1 }} transition={{ duration: reduceMotion ? 0 : 0.35 }} className="overflow-hidden">
        <p className={`text-xl font-black leading-none ${hasBg ? "text-white drop-shadow" : "text-primary"}`}>ThelaWala<span className="text-destructive">.</span></p>
      </motion.div>
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-extrabold text-primary-foreground"><Zap className="h-3 w-3 fill-current" />15 minutes</span>
            <Button asChild variant="ghost" className={`h-auto min-w-0 p-0 text-xs font-bold hover:bg-transparent ${hasBg ? "text-white" : ""}`}><Link to="/cart" title={address ?? "Choose delivery location"} aria-label="Choose delivery location"><MapPin className="h-3 w-3" /><span className="truncate">Bhubaneswar</span><ChevronDown className="h-3 w-3" /></Link></Button>
          </div>
          {!collapsed && <p className={`mt-1 max-w-[260px] truncate text-[10px] font-medium ${hasBg ? "text-white/85" : "text-muted-foreground"}`}>{address ?? "Fresh from your neighbourhood thela"}</p>}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button asChild size="icon" variant="outline"><Link to="/categories" aria-label="Browse categories" title="Browse categories"><QrCode /></Link></Button>
          <Button asChild size="icon"><Link to="/wallet" aria-label={`Wallet balance ${inr(balance)}`} title={`Wallet ${inr(balance)}`}><Wallet /></Link></Button>
        </div>
      </div>
      <label className="flex h-11 min-w-0 items-center rounded-lg border border-border bg-card px-3.5 shadow-card focus-within:ring-2 focus-within:ring-primary/20">
        <Search className="mr-2 h-4 w-4 shrink-0 text-primary" />
        <span className="relative h-5 min-w-0 flex-1 overflow-hidden">
          {!query && <AnimatePresence mode="wait"><motion.span key={suggestion} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.3 }} className="absolute inset-x-0 truncate text-xs text-muted-foreground">Search “{suggestions[suggestion]}”</motion.span></AnimatePresence>}
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} aria-label="Search food and stalls" className="absolute inset-0 w-full bg-transparent text-sm text-foreground outline-none" />
        </span>
        <span className="ml-2 shrink-0 border-l border-border pl-2">{voiceSearch}</span>
      </label>
      {!collapsed && <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        <button type="button" onClick={() => onCategoryChange(null)} className={pill(activeCategoryId === null)}>All stalls</button>
        {categories.map((category) => (
          <button key={category.id} type="button" onClick={() => onCategoryChange(category.id)} className={pill(activeCategoryId === category.id)}>{category.emoji ? `${category.emoji} ` : ""}{category.name}</button>
        ))}
      </div>}
    </div>
    <motion.div initial={false} animate={{ height: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1 }} transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }} className="relative overflow-hidden" inert={collapsed}>
      <DynamicBanners rows={rows} onActive={onActive} onInternalRoute={onInternalRoute} overlayOnly={hasBg} />
    </motion.div>
  </header>;
}
