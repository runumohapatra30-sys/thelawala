import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type MotionStyle } from "framer-motion";
import { ArrowRight, Gift, Ticket, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import type { DynamicBanner } from "@/lib/dynamicBanners";
import type { StreetFoodItem } from "@/components/StreetFoodExperience";
import { foodImage } from "@/lib/foodImage";
import { PENDING_HOME_COUPON_KEY } from "@/lib/coupons";

type Promotion = Tables<"app_promotions">;
type Modal =
  | { kind: "recommend"; banner: DynamicBanner | null; item: StreetFoodItem }
  | { kind: "gift"; banner: DynamicBanner | null; promotion: Promotion | null; item: StreetFoodItem };

const dayStamp = () => new Date().toLocaleDateString("en-CA");
const SEEN_RECOMMENDATION = "thelawala.recommendation-modal-day";
const SEEN_GIFT = "thelawala.gift-modal-day";
const MONSOON_TERMS = /monsoon|rain|event|festival|puja|diwali|ratha|durga/i;
const LOCAL_FOOD_TERMS = [/pakudi|pakora|pakoda/i, /dahi\s*bara|dahibara/i, /bara\s*ghuguni|ghuguni/i, /chaat|gupchup/i];

function monsoonPick(items: StreetFoodItem[]) {
  const available = items.filter((item) => item.in_stock);
  for (const term of LOCAL_FOOD_TERMS) {
    const found = available.find((item) => term.test(item.name));
    if (found) return found;
  }
  return null;
}

function itemFromRoute(route: string | null | undefined, items: StreetFoodItem[]) {
  const match = route?.match(/^\/?item\/([0-9a-f-]{36})\/?$/i);
  return match ? items.find((item) => item.id === match[1] && item.in_stock) ?? null : null;
}

export function HomeFeatureModals({
  banners,
  promotion,
  campaignTitle,
  rainMode,
  items,
  onRoute,
}: {
  banners: DynamicBanner[];
  promotion: Promotion | null;
  campaignTitle: string | null;
  rainMode: boolean;
  items: StreetFoodItem[];
  onRoute: (route: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [modal, setModal] = useState<Modal | null>(null);
  const [mutedForDay, setMutedForDay] = useState(false);
  const available = useMemo(() => items.filter((item) => item.in_stock), [items]);
  const giftBanner = useMemo(() => banners.find((banner) => /gift|coupon/i.test(banner.badge)) ?? null, [banners]);
  const customBanner = useMemo(() => banners.find((banner) =>
    !/gift|coupon/i.test(banner.badge) &&
    Boolean(banner.media_url && banner.target_route && (banner.title || banner.subtitle)),
  ) ?? null, [banners]);
  const eventPick = useMemo(
    () => (rainMode || MONSOON_TERMS.test(campaignTitle ?? "")) ? monsoonPick(items) : null,
    [rainMode, campaignTitle, items],
  );
  const giftRoute = giftBanner?.target_route ?? promotion?.target_route;
  const giftItem = useMemo(
    () => itemFromRoute(giftRoute, items) ?? available[0] ?? null,
    [giftRoute, items, available],
  );

  useEffect(() => {
    if (!available.length) return;
    let dismissedRecommendation = false;
    let dismissedGift = false;
    try {
      dismissedRecommendation = window.localStorage.getItem(SEEN_RECOMMENDATION) === dayStamp();
      dismissedGift = window.localStorage.getItem(SEEN_GIFT) === dayStamp();
    } catch {
      // Continue without persistence when browser storage is unavailable.
    }

    const recommendation: Modal | null = customBanner
      ? { kind: "recommend", banner: customBanner, item: itemFromRoute(customBanner.target_route, items) ?? available[0]! }
      : eventPick
        ? { kind: "recommend", banner: null, item: eventPick }
        : null;
    const next = !dismissedRecommendation && recommendation
      ? recommendation
      : !dismissedGift && (giftBanner || promotion) && giftItem
        ? { kind: "gift" as const, banner: giftBanner ?? null, promotion: giftBanner ? null : promotion, item: giftItem }
        : null;
    if (!next) return;
    const timer = window.setTimeout(() => setModal(next), 700);
    return () => window.clearTimeout(timer);
  }, [available, customBanner, eventPick, giftBanner, giftItem, items, promotion]);

  function close() {
    if (!modal) return;
    try {
      window.localStorage.setItem(modal.kind === "recommend" ? SEEN_RECOMMENDATION : SEEN_GIFT, dayStamp());
    } catch {
      // Dismissal still works for this visit when storage is unavailable.
    }
    setModal(null);
    if (modal.kind === "recommend" && (giftBanner || promotion) && giftItem) {
      let giftSeen = false;
      try { giftSeen = window.localStorage.getItem(SEEN_GIFT) === dayStamp(); } catch { /* optional */ }
      if (!giftSeen) {
        window.setTimeout(() => setModal({
          kind: "gift",
          banner: giftBanner ?? null,
          promotion: giftBanner ? null : promotion,
          item: giftItem,
        }), 260);
      }
    }
  }

  if (!modal || mutedForDay) return null;
  const banner = modal.banner;
  const promotionItem = modal.kind === "gift" ? modal.promotion : null;
  const giftBadge = banner?.badge || promotionItem?.badge_text || "";
  const couponCode = modal.kind === "gift"
    ? giftBadge.match(/(?:coupon\s*:\s*|code\s*:\s*)([a-z0-9_-]+)/i)?.[1]?.toUpperCase() ?? null
    : null;
  const route = banner?.target_route ?? promotionItem?.target_route ?? `/item/${modal.item.id}`;
  const heading = modal.kind === "gift"
    ? banner?.title || promotionItem?.offer_title || promotionItem?.title || "A little treat for you"
    : banner?.title || "Monsoon Special";
  const copy = modal.kind === "gift"
    ? banner?.subtitle || promotionItem?.offer_subtitle || promotionItem?.description_1 || promotionItem?.description_2
    : banner?.subtitle || `Local favourites like ${modal.item.name}, available from nearby stalls.`;
  const theme = banner?.theme_color && /^#[0-9a-f]{6}$/i.test(banner.theme_color) ? banner.theme_color : "#FF5A1F";
  const style = { "--feature-theme": theme } as MotionStyle;

  return (
    <AnimatePresence>
      <motion.div
        key={modal.kind}
        className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/60 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="presentation"
        onClick={close}
      >
        <motion.section
          style={style}
          initial={reduceMotion ? false : { y: 36, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={reduceMotion ? {} : { y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-feature-title"
          className="relative w-full overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl"
        >
          <button type="button" onClick={close} aria-label="Close promotion" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-foreground shadow">
            <X className="h-5 w-5" />
          </button>
          {modal.kind === "recommend" && banner?.media_url ? (
            <div className="relative h-48 overflow-hidden bg-brand-soft sm:h-56">
              {banner.media_type === "video" ? <video src={banner.media_url} autoPlay={!reduceMotion} muted loop playsInline className="h-full w-full object-cover" /> : <img src={banner.media_url} alt={banner.title || "Featured local offer"} className="h-full w-full object-cover" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              {banner.badge ? <span className="absolute bottom-3 left-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black text-primary">{banner.badge}</span> : null}
            </div>
          ) : modal.kind === "gift" && banner?.media_url ? (
            <div className="relative grid h-44 place-items-center overflow-hidden sm:h-52">
              <img src={banner.media_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-[color-mix(in_oklab,var(--feature-theme)_55%,transparent)]" />
              <img src={modal.item.photo_url || foodImage(modal.item.name)} alt={modal.item.name} className="relative z-10 h-36 w-36 rounded-full border-4 border-white object-cover shadow-xl" />
              <span className="absolute bottom-3 left-4 rounded-full bg-white px-3 py-1 text-[10px] font-black text-primary"><Ticket className="mr-1 inline h-3 w-3" />{banner.badge || "GIFT"}</span>
            </div>
          ) : (
            <div className="relative grid h-44 place-items-center overflow-hidden bg-[color-mix(in_oklab,var(--feature-theme)_12%,white)] sm:h-52">
              <span className="absolute -right-8 -top-12 h-36 w-36 rounded-full border-[18px] border-[color-mix(in_oklab,var(--feature-theme)_10%,white)]" />
              <img src={modal.item.photo_url || foodImage(modal.item.name)} alt={modal.item.name} className="relative z-10 h-36 w-36 rounded-full border-4 border-white object-cover shadow-xl" />
              <span className="absolute bottom-3 left-4 rounded-full bg-white px-3 py-1 text-[10px] font-black text-primary">{modal.kind === "gift" ? <><Ticket className="mr-1 inline h-3 w-3" />{banner?.badge || promotionItem?.badge_text || "GIFT"}</> : "LOCAL FAVOURITE"}</span>
            </div>
          )}
          <div className="space-y-3 px-5 pb-5 pt-4">
            <div className="flex items-start gap-3">
              {modal.kind === "gift" ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-primary"><Gift className="h-5 w-5" /></span> : null}
              <div className="min-w-0 flex-1">
                <h2 id="home-feature-title" className="text-xl font-black text-foreground">{heading}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy || `Discover ${modal.item.name} from a local stall.`}</p>
              </div>
              <span className="shrink-0 text-right text-sm font-black text-primary">{modal.item.name}<span className="block text-xs font-semibold text-muted-foreground">{modal.item.unit || "Local menu"}</span></span>
            </div>
            {modal.kind === "gift" ? (
              <div className="rounded-xl border border-dashed border-[color-mix(in_oklab,var(--feature-theme)_50%,var(--color-border))] bg-[color-mix(in_oklab,var(--feature-theme)_7%,white)] px-3 py-2 text-xs font-semibold text-foreground">
                {promotionItem?.cashback_text || promotionItem?.description_2 || "Add this local favourite to your cart and enjoy."}
              </div>
            ) : null}
            <button type="button" onClick={() => {
              if (couponCode) {
                try { window.localStorage.setItem(PENDING_HOME_COUPON_KEY, couponCode); } catch { /* optional */ }
                onRoute("/cart");
              } else {
                onRoute(route);
              }
              close();
            }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--feature-theme)] px-4 text-sm font-black text-white">
              {couponCode ? "Apply coupon" : modal.kind === "gift" ? promotionItem?.cta_button_text || "Add to Cart" : itemFromRoute(route, items) ? "Add to Cart" : "Explore local pick"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { setMutedForDay(true); close(); }} className="w-full py-1 text-xs font-bold text-muted-foreground">Not now</button>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}