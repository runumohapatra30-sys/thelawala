import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { customerPrice } from "@/lib/pricing";
import { foodImage } from "@/lib/foodImage";
import { inr } from "@/lib/fees";
import type { CartLine } from "@/lib/cart";
import type { DynamicBanner } from "@/lib/dynamicBanners";
import type { StreetFoodItem } from "@/components/StreetFoodExperience";

const DEFAULT_THEME = "#FAF7F2";

export function BestValueCarousel({
  items,
  lines,
  promo,
  onAdd,
  onRemove,
  onActiveTheme,
  onInternalRoute,
}: {
  items: StreetFoodItem[];
  lines: CartLine[];
  promo: DynamicBanner | undefined;
  onAdd: (item: StreetFoodItem) => void;
  onRemove: (itemId: string) => void;
  onActiveTheme: (color: string | null) => void;
  onInternalRoute: (route: string) => void;
}) {
  const [viewportRef, embla] = useEmblaCarousel({
    align: "start",
    loop: Boolean(promo),
    duration: 30,
  });
  const [selected, setSelected] = useState(0);
  const selectSlide = useCallback(() => {
    setSelected(embla?.selectedScrollSnap() ?? 0);
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    selectSlide();
    embla.on("select", selectSlide);
    embla.on("reInit", selectSlide);
    return () => {
      embla.off("select", selectSlide);
      embla.off("reInit", selectSlide);
    };
  }, [embla, selectSlide]);

  useEffect(() => {
    if (!promo) {
      onActiveTheme(null);
      return;
    }
    const color = selected === 1 && promo ? promo.theme_color : DEFAULT_THEME;
    onActiveTheme(
      color && /^#[0-9a-f]{6}$/i.test(color) ? color : selected === 1 ? "#FF6B00" : DEFAULT_THEME,
    );
  }, [selected, promo, onActiveTheme]);

  function openPromo() {
    const route = promo?.target_route?.trim();
    if (!route) return;
    if (/^https?:\/\//i.test(route)) {
      window.open(route, "_blank", "noopener,noreferrer");
    } else if (route.startsWith("/") && !route.startsWith("//")) {
      onInternalRoute(route);
    }
  }

  return (
    <div className="min-h-[252px] min-w-0">
      <div ref={viewportRef} className="h-full min-h-[252px] overflow-hidden rounded-3xl">
        <div className="flex h-full touch-pan-y">
          <div className="min-w-0 shrink-0 basis-full">
            <div className="flex min-h-[252px] flex-col rounded-3xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-1">
                <span className="text-xs font-black text-foreground">Best value</span>
                <Link to="/categories" className="text-[10px] font-black text-primary">
                  See all ›
                </Link>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-2">
                {items.map((item) => {
                  const line = lines.find((candidate) => candidate.itemId === item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex min-h-[61px] items-center gap-2 rounded-2xl border border-border bg-muted/45 p-1.5"
                    >
                      <img
                        src={item.photo_url ?? foodImage(item.name)}
                        alt={item.name}
                        className="h-10 w-10 shrink-0 rounded-xl bg-brand-soft object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-bold text-foreground">
                          {item.name}
                        </span>
                        <span className="text-xs font-black text-primary">
                          {inr(customerPrice(item.price))}
                        </span>
                      </span>
                      {line ? (
                        <span className="flex items-center gap-1 rounded-lg bg-primary p-1 text-primary-foreground">
                          <button
                            type="button"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => onRemove(item.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-3 text-center text-[10px] font-black">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            aria-label={`Add one ${item.name}`}
                            onClick={() => onAdd(item)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAdd(item)}
                          className="rounded-lg border border-primary bg-card px-2 py-1 text-[9px] font-black text-primary"
                        >
                          ADD
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {promo ? (
            <div className="min-w-0 shrink-0 basis-full">
              <button
                type="button"
                onClick={openPromo}
                aria-label={`Open offer: ${promo.title || "Best value promotion"}`}
                className="relative flex min-h-[252px] w-full overflow-hidden rounded-3xl border border-border bg-card p-0 text-left shadow-sm"
              >
                {promo.media_type === "video" ? (
                  <video
                    src={promo.media_url}
                    autoPlay={selected === 1}
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={promo.media_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="relative mt-auto flex w-full flex-col gap-1 p-3 text-white">
                  {promo.badge ? (
                    <span className="w-fit rounded-full bg-white/20 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide backdrop-blur-sm">
                      {promo.badge}
                    </span>
                  ) : null}
                  <span className="line-clamp-2 text-sm font-black leading-tight">
                    {promo.title || "Special offer"}
                  </span>
                  {promo.subtitle ? (
                    <span className="line-clamp-2 text-[10px] font-semibold text-white/90">
                      {promo.subtitle}
                    </span>
                  ) : null}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
