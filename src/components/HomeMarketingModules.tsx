import { motion, useReducedMotion } from "framer-motion";
import { Droplets, Flame, MapPinned, Store } from "lucide-react";

const trustItems = [
  { title: "Local street-food stalls", detail: "Find neighbourhood favourites", icon: Store },
  { title: "Live menu availability", detail: "Browse dishes currently in stock", icon: Flame },
  { title: "Clear item pricing", detail: "See prices before you add to cart", icon: Droplets },
  { title: "One stall per order", detail: "Your cart stays with one local kitchen", icon: MapPinned },
];

const cravings = [
  { title: "Morning Tiffin", detail: "Browse tiffin from local stalls", query: "tiffin", image: "/food/food-tiffin.jpg" },
  { title: "Evening Crunchy Adda", detail: "Chaat, Singada & Pakoda", query: "pakoda", image: "/food/food-pakoda.jpg" },
  { title: "Late Night Hunger", detail: "Hot Rolls & Momos", query: "roll", image: "/food/food-roll.jpg" },
];

type Props = {
  onSearch: (query: string) => void;
};

export function HomeMarketingModules({ onSearch }: Props) {
  const reduceMotion = useReducedMotion();

  const enter = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.18 },
    transition: { duration: reduceMotion ? 0 : 0.42, delay },
  });

  const selectCraving = (query: string) => {
    onSearch(query);
    document.getElementById("street-food-recommendations")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <div className="flex min-w-0 flex-col gap-7 overflow-x-hidden px-4 py-5">
        <motion.section {...enter()}>
          <div className="mb-3">
            <h2 className="text-lg font-black text-foreground">What makes us different</h2>
            <p className="text-xs font-semibold text-muted-foreground">Street food, held to a higher standard</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {trustItems.map(({ title, detail, icon: Icon }, index) => (
              <motion.article key={title} {...enter(index * 0.05)} className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-card">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-primary"><Icon className="h-4 w-4" /></span>
                <h3 className="mt-3 text-[12px] font-black leading-tight text-foreground">{title}</h3>
                <p className="mt-1 text-[10px] font-semibold leading-snug text-muted-foreground">{detail}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section {...enter()} className="min-w-0">
          <div className="mb-3">
            <h2 className="text-lg font-black text-foreground">Shop by lifestyle</h2>
            <p className="text-xs font-semibold text-muted-foreground">What are you craving right now?</p>
          </div>
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
            {cravings.map((craving) => (
              <button key={craving.title} type="button" onClick={() => selectCraving(craving.query)} className="relative h-40 w-[82%] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-xl text-left shadow-card sm:w-[280px]">
                <img src={craving.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/25 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4 text-primary-foreground">
                  <span className="block text-base font-black">{craving.title}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold opacity-85">{craving.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section {...enter()} className="rounded-2xl bg-primary px-4 py-5 text-primary-foreground">
          <p className="text-[10px] font-black uppercase">Order local. Support local.</p>
          <p className="mt-1 text-lg font-black">Discover local stalls near you</p>
          <p className="mt-1 text-xs font-medium text-primary-foreground/80">Explore real menus and current availability from neighbourhood kitchens.</p>
        </motion.section>

        <motion.section {...enter()}>
          <button type="button" onClick={() => selectCraving("snack")} className="grid w-full grid-cols-[minmax(0,1fr)_88px] items-center overflow-hidden rounded-xl border border-border bg-coupon text-left shadow-card">
            <span className="min-w-0 p-4">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary">Freshly picked near you</span>
              <span className="mt-1 block text-lg font-black text-foreground">Today&apos;s local menu</span>
              <span className="mt-1 block text-[11px] font-semibold text-muted-foreground">Browse the dishes currently available at local stalls.</span>
            </span>
            <span className="relative h-full min-h-28 bg-brand-soft"><img src="/food/food-pakoda.jpg" alt="Desi aloo chop and street snacks" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /></span>
          </button>
        </motion.section>
      </div>
    </>
  );
}