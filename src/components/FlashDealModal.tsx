import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Clock3, X, Zap } from "lucide-react";
import { inr } from "@/lib/fees";
import { foodImage } from "@/lib/foodImage";
import type { VisualEngineSettings } from "@/lib/visualEngine";
import type { StreetFoodItem, StreetFoodVendor } from "@/components/StreetFoodExperience";

type Props = {
  items: StreetFoodItem[];
  vendors: StreetFoodVendor[];
  settings: VisualEngineSettings;
  loading: boolean;
};

function indiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function FlashDealModal({ items, vendors, settings, loading }: Props) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const item = useMemo(
    () => items.find((entry) => entry.id === settings.flash_menu_item_id && entry.in_stock),
    [items, settings.flash_menu_item_id],
  );
  const vendor = item ? vendors.find((entry) => entry.id === item.vendor_id) : undefined;
  const image = settings.flash_image_url || item?.photo_url || (item ? foodImage(item.name) : "");

  useEffect(() => {
    if (loading || !settings.is_enabled || !settings.flash_deal_enabled || !item || !vendor) {
      setOpen(false);
      return;
    }
    const key = "thelawala_flash_deal_seen";
    try {
      if (window.localStorage.getItem(key) === indiaDate()) return;
      window.localStorage.setItem(key, indiaDate());
      setOpen(true);
    } catch (error) {
      console.error("Could not persist the daily flash-deal view:", error);
      setOpen(true);
    }
  }, [
    item,
    loading,
    settings.flash_deal_enabled,
    settings.flash_menu_item_id,
    settings.flash_price,
    settings.is_enabled,
    vendor,
  ]);

  if (
    !settings.is_enabled ||
    !settings.flash_deal_enabled ||
    !item ||
    !vendor ||
    !settings.flash_price
  )
    return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="presentation"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="flash-deal-title"
            initial={reduceMotion ? false : { opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_-25px_rgba(0,0,0,.7)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close flash deal"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative aspect-[1.15/1] overflow-hidden bg-[#221437]">
              <img src={image} alt={item.name} className="h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-[#211333] via-[#211333]/15 to-transparent" />
              <motion.span
                animate={reduceMotion ? {} : { rotate: [-5, 4, -5], scale: [1, 1.04, 1] }}
                transition={{ duration: 3.2, repeat: Infinity }}
                className="absolute left-4 top-4 grid h-[82px] w-[82px] rotate-[-5deg] place-items-center rounded-full border-[3px] border-[#ffd66f] bg-[radial-gradient(circle_at_35%_28%,#fff7cb,#f3ac31_62%,#b35420)] text-center text-[#652c16] shadow-[0_10px_30px_rgba(0,0,0,.35)]"
              >
                <span>
                  <span className="block text-[9px] font-black uppercase">Starting at</span>
                  <span className="block text-xl font-black leading-tight">
                    {inr(Number(settings.flash_price))}
                  </span>
                </span>
              </motion.span>
              <span className="absolute inset-x-4 bottom-4 text-white">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ff6a25] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em]">
                  <Zap className="h-3 w-3" /> Flash deal is live now
                </span>
                <span className="mt-2 block text-[10px] font-bold text-white/75">
                  {vendor.stall_name}
                </span>
                <span
                  id="flash-deal-title"
                  className="mt-0.5 block text-2xl font-black leading-tight"
                >
                  {item.name}
                </span>
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" /> Today&apos;s deal
                </span>
                <span className="font-black text-[#a7441e]">
                  {inr(Number(settings.flash_price))}
                </span>
              </div>
              <Link
                to="/campaign/99-store"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(100deg,#ff6a24,#ed3e2d)] py-3.5 text-sm font-black text-white shadow-[0_12px_24px_-14px_rgba(223,66,38,.85)]"
              >
                Buy Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
