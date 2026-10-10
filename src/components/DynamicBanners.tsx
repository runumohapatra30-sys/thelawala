import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { DynamicBanner } from "@/lib/dynamicBanners";

export function DynamicBanners({ rows, onActive, onInternalRoute }: {
  rows: DynamicBanner[]; onActive?: (banner: DynamicBanner | null) => void; onInternalRoute?: (route: string) => void;
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
  return <section aria-label="Live promotions" aria-roledescription="carousel" className="min-w-0 pb-3 pt-2"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onPointerDown={() => setTouched(true)} onPointerUp={() => setTouched(false)} onPointerCancel={() => setTouched(false)}
    onTouchStart={() => setTouched(true)} onTouchEnd={() => setTouched(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div ref={emblaRef} className="overflow-hidden"><div className="flex touch-pan-y">
      {rows.map((row, index) => <div key={row.id} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${rows.length}`} className="min-w-0 shrink-0 basis-full px-4">
        <Button variant="ghost" tabIndex={index === selected ? 0 : -1} onClick={() => open(row)} aria-label={row.title || `Promotion ${index + 1}`} className="relative block h-auto w-full overflow-hidden rounded-lg p-0 hover:bg-transparent">
          {row.banner_format === "4_GRID" ? <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-1 bg-card p-1">{row.grid_image_urls.slice(0,4).map((url, i) => <img key={i} src={url} alt={`Promotion tile ${i + 1}`} className="h-full min-h-0 w-full object-cover" />)}</div>
            : row.media_type === "video" ? <video src={row.media_url} muted autoPlay={!reduceMotion && index === selected} loop playsInline className={`${row.banner_format === "SLIM" ? "aspect-[4/1]" : "aspect-[16/9]"} w-full object-cover`} />
            : <img src={row.media_url} alt={row.title || "ThelaWala offer"} className={`${row.banner_format === "SLIM" ? "aspect-[4/1]" : "aspect-[16/9]"} w-full object-cover`} />}
          {(row.title || row.subtitle || row.badge) && <span className="home-banner-copy absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-3 text-left whitespace-normal">
            {row.badge && <span className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">{row.badge}</span>}
            {row.title && <span className="text-lg font-extrabold leading-tight text-foreground">{row.title}</span>}
            {row.subtitle && <span className="text-xs text-muted-foreground">{row.subtitle}</span>}
          </span>}
        </Button>
      </div>)}
    </div></div>
    {rows.length > 1 && <div className="mt-2 flex justify-center gap-1" aria-label="Choose promotion">{rows.map((row, i) => <Button key={row.id} variant="ghost" aria-label={`Go to banner ${i + 1}`} aria-pressed={selected === i} onClick={() => embla?.scrollTo(i)} className="h-6 w-6 p-0 hover:bg-transparent"><span className={`h-1.5 rounded-full transition-all duration-500 ${selected === i ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40"}`} /></Button>)}</div>}
  </section>;
}
