import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { foodImage } from "@/lib/foodImage";
import type { StreetFoodItem, StreetFoodVendor } from "@/components/StreetFoodExperience";

export function LocalSpotlight({ vendors, items, onVendor }: { vendors: StreetFoodVendor[]; items: StreetFoodItem[]; onVendor: (id: string) => void }) {
  const reduced = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = useMemo(() => {
    const groups = vendors.map((vendor) => {
      const food = items.filter((item) => item.vendor_id === vendor.id && item.in_stock);
      return Array.from({ length: Math.max(1, Math.ceil(food.length / 4)) }, (_, page) => ({ vendor, food: food.slice(page * 4, page * 4 + 4) }));
    });
    const result: { vendor: StreetFoodVendor; food: StreetFoodItem[] }[] = [];
    const pages = Math.max(0, ...groups.map((group) => group.length));
    for (let page = 0; page < pages; page++) for (const group of groups) { const entry = group[page]; if (entry) result.push(entry); }
    return result;
  }, [vendors, items]);
  useEffect(() => {
    if (reduced || paused || slides.length < 2) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") setSlide((value) => (value + 1) % slides.length); }, 5000);
    return () => window.clearInterval(timer);
  }, [reduced, paused, slides.length]);
  const index = slides.length ? slide % slides.length : 0;
  const current = slides[index];
  const move = (step: number) => setSlide((value) => (value + step + slides.length) % slides.length);
  return (
    <section aria-label="Local spotlight" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} className="flex h-[292px] min-w-0 flex-col overflow-hidden rounded-3xl bg-primary p-3.5 text-primary-foreground shadow-card">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] font-black uppercase">Local spotlight</span>
        {slides.length > 1 ? <span className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label="Previous spotlight" onClick={() => move(-1)} className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Next spotlight" onClick={() => move(1)} className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"><ChevronRight /></Button></span> : null}
      </div>
      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div key={current ? `${current.vendor.id}-${index}` : "empty"} initial={reduced ? false : { y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduced ? { opacity: 0 } : { y: "-100%", opacity: 0 }} transition={{ duration: reduced ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0">
            <h2 className="line-clamp-2 h-11 text-base font-black leading-snug">{current?.vendor.stall_name ?? "Local street-food stalls"}</h2>
            <p className="mt-1 truncate text-[10px] font-semibold opacity-80">{current ? (current.vendor.is_open ? current.vendor.offer_label || "Fresh from your neighbourhood" : "Currently closed") : "More street bites soon"}</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {current?.food.map((item) => <div key={item.id} className="min-w-0 rounded-lg bg-primary-foreground/10 p-1.5"><img src={item.photo_url ?? foodImage(item.name)} alt={item.name} className="mx-auto h-10 w-10 rounded-md object-cover" /><p className="mt-1 truncate text-center text-[9px] font-bold">{item.name}</p></div>)}
              {!current?.food.length ? <div className="col-span-2 flex h-28 items-center justify-center"><Store className="h-10 w-10 opacity-70" /></div> : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <Button variant="secondary" disabled={!current} onClick={() => { if (current) onVendor(current.vendor.id); }} className="mt-2 h-8 w-full shrink-0 rounded-lg bg-card text-[11px] font-black text-primary">Explore stall <ArrowRight /></Button>
    </section>
  );
}