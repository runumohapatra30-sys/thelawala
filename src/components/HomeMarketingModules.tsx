import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Clock3, Droplets, Flame, MapPinned, Sparkles, Store, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import alooChopCutout from "@/assets/aloo-chop-cutout.png";

const DAILY_PROMO_KEY = "thelawala-home-promo-day";

const trustItems = [
  { title: "Live Tawa Fresh", detail: "Piping hot preparation", icon: Flame },
  { title: "RO Water & Clean Oil", detail: "Verified hygiene check", icon: Droplets },
  { title: "Real Thela Prices", detail: "Zero menu markup", icon: Store },
  { title: "Iconic Local Stalls", detail: "Heritage tastes of Bhubaneswar & Cuttack", icon: MapPinned },
];

const cravings = [
  { title: "Morning Energy Tiffin", detail: "Light, oil-free Idli & Ghuguni", query: "tiffin", image: "/food/food-tiffin.jpg" },
  { title: "Evening Crunchy Adda", detail: "Chaat, Singada & Pakoda", query: "pakoda", image: "/food/food-pakoda.jpg" },
  { title: "Late Night Hunger", detail: "Hot Rolls & Momos", query: "roll", image: "/food/food-roll.jpg" },
];

type Props = {
  onSearch: (query: string) => void;
};

export function HomeMarketingModules({ onSearch }: Props) {
  const reduceMotion = useReducedMotion();
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA");
    try {
      if (window.localStorage.getItem(DAILY_PROMO_KEY) === today) return;
      window.localStorage.setItem(DAILY_PROMO_KEY, today);
    } catch {
      // The promotion can still be shown when private storage is unavailable.
    }
    setShowPromo(true);
  }, []);

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
      <AnimatePresence>
        {showPromo ? (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/60 px-3 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-offer-title"
            onClick={() => setShowPromo(false)}
          >
            <motion.section
              initial={reduceMotion ? false : { y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-[440px] overflow-hidden rounded-t-3xl border border-border bg-card px-5 pb-6 pt-4 shadow-2xl sm:rounded-3xl"
            >
              <button type="button" onClick={() => setShowPromo(false)} aria-label="Close today’s offer" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground">
                <X className="h-4 w-4" />
              </button>
              <div className="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-2">
                <div className="min-w-0 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-black uppercase text-primary"><Sparkles className="h-3 w-3" /> Today only</span>
                  <h2 id="daily-offer-title" className="mt-3 text-2xl font-black leading-tight text-foreground">Welcome to ThelaWala</h2>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">Special Street Bite at</p>
                  <p className="mt-0.5 text-4xl font-black text-primary">₹9</p>
                </div>
                <motion.img
                  src={alooChopCutout}
                  alt="Crispy street-style aloo chop"
                  width={1024}
                  height={1024}
                  className="h-36 w-36 max-w-full object-contain drop-shadow-xl"
                  animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <button type="button" onClick={() => { setShowPromo(false); selectCraving("aloo chop"); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">
                Taste today’s street pick <Zap className="h-4 w-4" />
              </button>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

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

        <motion.section {...enter()}>
          <h2 className="mb-3 text-lg font-black text-foreground">Us vs them</h2>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <div className="min-w-0 bg-brand-soft p-3.5">
              <p className="text-sm font-black text-primary">ThelaWala</p>
              <ul className="mt-3 space-y-3">
                {["15-minute quick delivery", "Fresh from live kadai", "Authentic vendor pricing"].map((item) => <li key={item} className="flex items-start gap-1.5 text-[10px] font-bold leading-snug text-foreground"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{item}</li>)}
              </ul>
            </div>
            <div className="min-w-0 border-l border-border p-3.5">
              <p className="text-sm font-black text-muted-foreground">Big apps</p>
              <ul className="mt-3 space-y-3">
                {["45+ minute waits", "Cold food packaging", "High hidden delivery markups"].map((item) => <li key={item} className="flex items-start gap-1.5 text-[10px] font-bold leading-snug text-muted-foreground"><X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />{item}</li>)}
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section {...enter()}>
          <button type="button" onClick={() => selectCraving("snack")} className="grid w-full grid-cols-[minmax(0,1fr)_88px] items-center overflow-hidden rounded-xl border border-border bg-coupon text-left shadow-card">
            <span className="min-w-0 p-4">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-primary"><Clock3 className="h-3.5 w-3.5" /> Pocket-friendly picks</span>
              <span className="mt-1 block text-xl font-black text-foreground">Street Picks from ₹9</span>
              <span className="mt-1 block truncate text-[11px] font-semibold text-muted-foreground">Desi Aloo Chop · Kulhad Chai</span>
            </span>
            <span className="relative h-full min-h-28 bg-brand-soft"><img src="/food/food-pakoda.jpg" alt="Desi aloo chop and street snacks" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /></span>
          </button>
        </motion.section>
      </div>
    </>
  );
}