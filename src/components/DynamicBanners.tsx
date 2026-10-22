import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { DynamicBanner } from "@/lib/dynamicBanners";

export function DynamicBanners({ rows, onActive, onInternalRoute, overlayOnly = false, peek = false, panel = false }: {
  rows: DynamicBanner[]; onActive?: (banner: DynamicBanner | null) => void; onInternalRoute?: (route: string) => void; overlayOnly?: boolean; peek?: boolean; panel?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reduceMotion = useReducedMotion();
  const [emblaRef, embla] = useEmblaCarousel({ align: "center", loop: true, duration: 35 });
  const select = useCallback(() => {
    const index = embla?.selectedScrollSnap() ?? 0;
    setSelected(index); onActive?.(rows[index] ?? null);
  }, [embla, rows, onActive]);
  useEffect(() => {
    if (!embla) { onActive?.(rows[0] ?? null); return; }
    select(); embla.on("select", select); embla.on("reInit", select);
    return () => { embla.off("select", select); embla.off("reInit", select); };
  }, [embla, select, rows, onActive]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    visibility(); document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (!embla || rows.length < 2 || hovered || touched || focused || hidden || reduceMotion) return;
    const timer = window.setInterval(() => {
      if (embla.canScrollNext()) embla.scrollNext(); else embla.scrollTo(0);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [embla, rows.length, selected, hovered, touched, focused, hidden, reduceMotion]);
  if (!rows.length) return null;
  function open(row: DynamicBanner) {
    const route = row.target_route?.trim();
    if (!route) return;
    if (/^https?:\/\//i.test(route)) window.open(route, "_blank", "noopener,noreferrer");
    else if (route.startsWith("/") && !route.startsWith("//")) onInternalRoute?.(route);
  }
  return <section aria-label="Live promotions" aria-roledescription="carousel" className={panel ? "promotion-panel min-w-0 h-[292px]" : "min-w-0 pb-3 pt-2"}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onPointerDown={() => setTouched(true)} onPointerUp={() => setTouched(false)} onPointerCancel={() => setTouched(false)}
    onTouchStart={() => setTouched(true)} onTouchEnd={() => setTouched(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div ref={emblaRef} className={panel ? "h-full overflow-hidden rounded-3xl" : "overflow-hidden"}><div className={panel ? "flex h-full touch-pan-y" : "flex touch-pan-y"}>
      {rows.map((row, index) => <div key={row.id} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${rows.length}`} className={`min-w-0 shrink-0 ${panel ? "basis-full" : peek ? "basis-[76%] px-1.5" : "basis-full px-4"}`}>
        <Button variant="ghost" tabIndex={index === selected ? 0 : -1} onClick={() => open(row)} aria-label={row.title || `Promotion ${index + 1}`} className={`relative block h-auto w-full overflow-hidden rounded-3xl p-0 shadow-sm transition-transform duration-500 hover:bg-transparent ${panel ? "h-full bg-card" : ""}`}>
          {panel ? <span className="flex h-full w-full flex-col bg-card">{row.media_type === "video" ? <video src={row.media_url} autoPlay={!reduceMotion && index === selected} loop muted playsInline className="min-h-0 w-full flex-1 object-contain" /> : row.banner_format === "4_GRID" ? <span className="grid min-h-0 flex-1 grid-cols-2 gap-1">{row.grid_image_urls.slice(0,4).map((url) => <img key={url} src={url} alt="" className="h-full min-h-0 w-full object-contain" />)}</span> : <img src={row.media_url} alt={row.title || "ThelaWala offer"} className="min-h-0 w-full flex-1 object-contain" />}{(row.title || row.subtitle) && <span className="shrink-0 px-3 py-3 text-left whitespace-normal"><span className="line-clamp-2 text-sm font-black text-foreground">{row.title}</span><span className="mt-1 block line-clamp-2 text-[10px] text-muted-foreground">{row.subtitle}</span></span>}</span> : peek ? <span className="relative block h-40 w-full bg-card">
            {row.banner_format === "4_GRID" ? <span className="grid h-full grid-cols-2 grid-rows-2 gap-1 p-1">{row.grid_image_urls.slice(0,4).map((url, i) => <img key={i} src={url} alt="" className="h-full min-h-0 w-full rounded-2xl object-cover" />)}</span>
              : row.media_type === "video" ? <video src={row.media_url} muted autoPlay={!reduceMotion && index === selected} loop playsInline className="h-full w-full object-cover" />
              : <img src={row.media_url} alt={row.title || "ThelaWala offer"} className="h-full w-full object-cover" />}
          </span>
          : overlayOnly ? <span className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 px-6 py-3 text-center whitespace-normal">
            {row.badge && <span className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">{row.badge}</span>}
            {row.title && <span className="text-[26px] font-black uppercase leading-none tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">{row.title}</span>}
            {row.subtitle && <span className="text-xs font-semibold text-white/90 drop-shadow">{row.subtitle}</span>}
          </span>
          : row.banner_format === "4_GRID" ? <div className="grid h-40 grid-cols-2 grid-rows-2 gap-1 bg-card p-1">{row.grid_image_urls.slice(0,4).map((url, i) => <img key={i} src={url} alt={`Promotion tile ${i + 1}`} className="h-full min-h-0 w-full object-cover" />)}</div>
            : row.media_type === "video" ? <video src={row.media_url} muted autoPlay={!reduceMotion && index === selected} loop playsInline className={`${row.banner_format === "SLIM" ? "aspect-[4/1]" : "aspect-[16/9]"} max-h-40 w-full object-cover`} />
            : <img src={row.media_url} alt={row.title || "ThelaWala offer"} className={`${row.banner_format === "SLIM" ? "aspect-[4/1]" : "aspect-[16/9]"} max-h-40 w-full object-cover`} />}
          {!panel && (row.title || row.subtitle || row.badge) && <span className="home-banner-copy absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-3 text-left whitespace-normal">
            {row.badge && <span className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">{row.badge}</span>}
            {row.title && <span className="text-lg font-extrabold leading-tight text-foreground">{row.title}</span>}
            {row.subtitle && <span className="text-xs text-muted-foreground">{row.subtitle}</span>}
          </span>}
          {row.target_route && !overlayOnly && !panel ? <span className="absolute right-3 top-3 rounded-full bg-primary px-4 py-2 text-[11px] font-extrabold text-primary-foreground shadow-sm">Grab Voucher</span> : null}
        </Button>
      </div>)}
    </div></div>
    {rows.length > 1 && !panel && <div className="mt-2 flex justify-center gap-1" aria-label="Choose promotion">{rows.map((row, i) => <Button key={row.id} variant="ghost" aria-label={`Go to banner ${i + 1}`} aria-pressed={selected === i} onClick={() => embla?.scrollTo(i)} className="h-6 w-6 p-0 hover:bg-transparent"><span className={`h-1.5 rounded-full transition-all duration-500 ${selected === i ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40"}`} /></Button>)}</div>}
  </section>;
}
