import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bike, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import { loadCommerceCampaign, type CampaignCatalogEntry } from "@/lib/commerceCampaigns";
import type { Campaign } from "@/lib/marketing";

export function FreeCashBanner({ amount }: { amount: number }) {
  return (
    <section className="px-4 pt-3">
      <Link
        to="/cart"
        className="relative isolate block overflow-hidden rounded-[1.6rem] bg-[linear-gradient(120deg,#091d48,#123f82_58%,#0b2858)] px-4 py-4 text-white shadow-[0_16px_34px_-18px_rgba(10,31,75,0.8)]"
      >
        <span className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full border-[18px] border-white/5" />
        <span className="pointer-events-none absolute -bottom-10 left-20 h-28 w-52 rounded-[50%] border-t-[18px] border-[#4d78b8]/35" />
        {[
          { right: "27%", top: "16%" },
          { right: "10%", bottom: "18%" },
          { right: "43%", bottom: "8%" },
        ].map((position, index) => (
          <motion.span
            key={index}
            aria-hidden="true"
            animate={{ y: [0, -8, 0], rotate: [0, 12, -8, 0] }}
            transition={{ duration: 2.8 + index * 0.4, repeat: Infinity, delay: index * 0.25 }}
            style={position}
            className="pointer-events-none absolute text-xl drop-shadow-md"
          >
            🪙
          </motion.span>
        ))}
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[#f7cb68] bg-[radial-gradient(circle_at_35%_30%,#fff3bd,#e3a92f_68%,#9c5b14)] text-center text-[10px] font-black leading-tight text-[#63370d] shadow-[0_0_18px_rgba(255,206,98,0.4)]">
            FREE
            <br />₹{amount}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#f8d37c]">
              A little treat from us
            </span>
            <span className="mt-1 block text-sm font-black leading-snug">
              Use your ₹{amount} free cash
            </span>
            <span className="block text-[11px] font-medium text-white/75">
              Auto applied at checkout on your next order
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-[#f8d37c]" />
        </div>
      </Link>
    </section>
  );
}

export function DurgaPujaTrigger({ campaign }: { campaign: Campaign | null }) {
  const reduceMotion = useReducedMotion();
  if (!campaign || !/durga\s*puja/i.test(campaign.title)) return null;
  return (
    <Link
      to="/festival/durga-puja"
      aria-label="Explore the Durga Puja festive hub"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+190px)] right-3 z-30"
    >
      <motion.span
        {...(reduceMotion ? {} : { animate: { scale: [1, 1.06, 1], rotate: [0, 2, -2, 0] } })}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center gap-2 rounded-full border border-[#f6d28a] bg-[linear-gradient(135deg,#7d183a,#d64842)] px-3 py-2 text-white shadow-[0_12px_28px_-10px_rgba(125,24,58,0.75)]"
      >
        <Sparkles className="h-4 w-4 text-[#ffe5a4]" />
        <span className="text-[10px] font-black leading-tight">
          Durga Puja
          <br />
          Celebration
        </span>
      </motion.span>
    </Link>
  );
}

export function NinetyNineStoreSection({
  onAdd,
  onItem,
}: {
  onAdd: (itemId: string, offerPrice: number) => void;
  onItem: (itemId: string) => void;
}) {
  const [entries, setEntries] = useState<CampaignCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void loadCommerceCampaign("99-store")
      .then(({ campaign, entries: campaignEntries }) => {
        if (alive) setEntries(campaign?.is_active ? campaignEntries : []);
      })
      .catch((loadError: unknown) => {
        console.error("Could not load 99 Store items:", loadError);
        if (alive) setError("99 Store deals could not load right now.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading)
    return (
      <section
        aria-live="polite"
        className="mx-4 my-3 h-28 animate-pulse rounded-[1.7rem] bg-muted"
      />
    );
  if (error)
    return (
      <p
        role="alert"
        className="mx-4 my-3 rounded-xl border border-destructive/30 bg-card p-3 text-xs font-semibold text-destructive"
      >
        {error}
      </p>
    );
  if (entries.length === 0) return <section className="px-4 py-3"><Link to="/campaign/99-store" className="flex items-center justify-between border-y border-border py-4"><span><span className="block text-base font-black text-foreground">99 Store</span><span className="block text-xs text-muted-foreground">New deals are on the way</span></span><ArrowRight className="h-5 w-5 text-primary" /></Link></section>;
  return (
    <section className="mx-4 my-3 overflow-hidden rounded-[1.7rem] border border-[#b6d4c0] bg-[linear-gradient(135deg,#effcf2,#fff8e9)] p-3.5 shadow-[0_14px_30px_-22px_rgba(27,94,56,0.6)]">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 rotate-[-5deg] place-items-center rounded-xl bg-[linear-gradient(145deg,#fff27a,#ff9d22_65%,#ee472d)] text-center text-[9px] font-black uppercase leading-none text-[#7d2410] shadow-[0_6px_0_#c74024]">
          99
          <br />
          STORE
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-black text-[#17432e]">99 Store</span>
          <span className="block text-[10px] font-bold text-[#437259]">
            Meals at ₹99 + Free Delivery
          </span>
        </span>
        <Bike className="h-6 w-6 shrink-0 text-[#25834d]" />
        <Link to="/campaign/99-store" className="shrink-0 text-[10px] font-black text-[#1e7545]">
          See all ›
        </Link>
      </div>
      <div className="no-scrollbar mt-3 flex snap-x gap-2.5 overflow-x-auto pb-1">
        {entries.map(({ item, vendor, offer_price: offerPrice }) => (
          <article
            key={item.id}
            className="w-[142px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => onItem(item.id)}
              className="relative block aspect-[4/3] w-full overflow-hidden bg-[#f3f4ee] text-left"
            >
              <img
                src={item.photo_url || foodImage(item.name)}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full bg-[#eaffef] px-2 py-1 text-[9px] font-black text-[#176437] shadow">
                ₹{offerPrice}
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6 text-[9px] font-black text-white">
                {vendor.stall_name}
              </span>
            </button>
            <div className="p-2">
              <button
                type="button"
                onClick={() => onItem(item.id)}
                className="line-clamp-2 min-h-8 w-full text-left text-[11px] font-bold leading-tight text-foreground"
              >
                {item.name}
              </button>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="text-[12px] font-black text-[#176437]">
                  ₹{offerPrice}{" "}
                  <span className="text-[9px] font-medium text-muted-foreground line-through">
                    {inr(Number(item.mrp))}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Add ${item.name} to cart`}
                  disabled={!vendor.is_open}
                  onClick={() => onAdd(item.id, offerPrice)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#178146] text-white shadow-sm disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
