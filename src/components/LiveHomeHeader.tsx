import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Bell, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DynamicBanners } from "@/components/DynamicBanners";
import { useHomeBanners } from "@/lib/homeBanners";
import type { DynamicBanner } from "@/lib/dynamicBanners";
import type { StreetFoodCategory } from "@/components/StreetFoodExperience";
import { foodImage } from "@/lib/foodImage";
import { useTopBarTheme } from "@/lib/appTheme";
import { useVisualEngineSettings } from "@/lib/visualEngine";
import { RainIndicator } from "@/components/RainIndicator";

/** Per-category circle accents (ring + label pill) like quick-commerce apps. */
const CATEGORY_THEMES = ["#E8590C", "#2F6FDB", "#0F9D58", "#C2255C", "#7048E8", "#D9480F", "#0C8599", "#B08900"];

/** Ultra-subtle pastel header tint per category, Swiggy Instamart style. */
function categoryTint(name: string | null): { bg: string; text: string } {
  if (!name) return { bg: "#FFF7ED", text: "#EA580C" }; // All food — warm orange
  const n = name.toLowerCase();
  if (n.includes("dahi")) return { bg: "#EFF6FF", text: "#2563EB" }; // Dahi Bara — soft blue
  if (n.includes("chaat")) return { bg: "#F0FDF4", text: "#16A34A" }; // Chaat — fresh green
  if (n.includes("bhata") || n.includes("dali")) return { bg: "#FEFCE8", text: "#D97706" }; // Bhata Dali — soft amber
  return { bg: "#FFF7ED", text: "#EA580C" }; // Roll & everything else — warm orange
}

export function LiveHomeHeader({ address, avatarUrl, query, onQueryChange, onSearchFocus, voiceSearch, onInternalRoute, categories, activeCategoryId, onCategoryChange }: {
  address: string | null; query: string; onQueryChange: (query: string) => void;
  onSearchFocus: () => void;
  avatarUrl?: string | null | undefined;
  voiceSearch: ReactNode; onInternalRoute: (route: string) => void;
  categories: StreetFoodCategory[]; activeCategoryId: string | null; onCategoryChange: (categoryId: string | null) => void;
}) {
  const rows = useHomeBanners();
  const theme = useTopBarTheme();
  const { settings } = useVisualEngineSettings();
  const headerPhoto = theme?.header_bg_image_url;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const onActive = useCallback((row: DynamicBanner | null) => setActiveId(row?.id ?? null), []);
  const activeCategory = activeCategoryId ? categories.find((category) => category.id === activeCategoryId) : null;
  const tint = categoryTint(activeCategory?.name ?? null);

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
  return <header data-collapsed={collapsed} data-artwork={Boolean(headerPhoto)} style={{ backgroundColor: tint.bg, transition: "background-color 0.3s ease" }} className="home-artwork-header sticky top-0 z-50 border-b border-border">
    {headerPhoto && !collapsed ? <div className="home-header-artwork"><img src={headerPhoto} alt="ThelaWala festive artwork" /><span aria-hidden="true" /></div> : null}
    <div className={`relative px-4 transition-all duration-300 ${collapsed ? "pb-2 pt-2" : "pb-2.5 pt-3"}`}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><p style={{ color: tint.text, transition: "color 0.3s ease" }} className="text-[22px] font-extrabold leading-tight">15 mins</p><RainIndicator enabled={settings.rain_animation_enabled} /></div>
          <Link to="/cart" title={address ?? "Choose delivery location"} aria-label="Choose delivery location" className="mt-0.5 flex max-w-full items-center gap-0.5 text-[11px] font-semibold text-muted-foreground">
            <span className="truncate">To {address ?? "Bhubaneswar"}</span><ChevronDown className="h-3 w-3 shrink-0" />
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/notifications" aria-label="Notifications" title="Notifications" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm"><Bell className="h-4 w-4" /></Link>
          <Link to="/profile" aria-label="Your profile" className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card text-primary shadow-sm">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-black">TW</span>}
          </Link>
        </div>
      </div>
      <label className="flex h-11 min-w-0 items-center rounded-2xl border border-border bg-card px-3.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
        <Search className="mr-2 h-4 w-4 shrink-0 text-primary" />
        <input value={query} onFocus={onSearchFocus} onChange={(event) => onQueryChange(event.target.value)} aria-label="Search food and stalls" placeholder='Search for "Gupchup", "Dahi Bara"...' className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        <button type="button" aria-label="Filter food by category" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} className={`ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-full border-l border-border pl-2 text-primary ${filtersOpen ? "bg-brand-soft" : ""}`}>
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <span className="ml-1 shrink-0 border-l border-border pl-2">{voiceSearch}</span>
      </label>
      {filtersOpen && !collapsed ? (
        <div className="mt-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
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
        <section className="mt-2.5">
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            <button type="button" aria-pressed={activeCategoryId === null} onClick={() => onCategoryChange(null)} className="w-[68px] shrink-0 text-center">
              <span className={`mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 bg-white shadow-sm transition-all duration-300 ${activeCategoryId === null ? "scale-105 border-primary ring-2 ring-primary/30" : "border-white"}`}>
                <img src="/food/food-thali.jpg" alt="" className="h-full w-full object-cover" />
              </span>
              <span className={`mt-1 block truncate rounded-full px-1 py-0.5 text-[10px] font-bold transition-colors duration-300 ${activeCategoryId === null ? "bg-primary text-primary-foreground" : "text-foreground"}`}>All food</span>
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
                  <span style={selected ? { backgroundColor: color } : undefined} className={`mt-1 block truncate rounded-full px-1 py-0.5 text-[10px] font-bold transition-colors duration-300 ${selected ? "text-white" : "text-foreground"}`}>{category.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  </header>;
}
