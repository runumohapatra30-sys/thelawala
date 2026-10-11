import { useEffect, useState, type CSSProperties } from "react";
import type { Campaign } from "@/lib/marketing";
import type { ThemeConfig } from "@/lib/appTheme";
import { getFestiveContext } from "@/utils/festiveCalendar";

type Props = {
  campaign: Campaign | null;
  theme: ThemeConfig | null;
  onFilter: (query: string) => void;
};

export function FestiveContextBanner({ campaign, theme, onFilter }: Props) {
  const [context, setContext] = useState(() => getFestiveContext());
  useEffect(() => {
    const timer = window.setInterval(() => setContext(getFestiveContext()), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  const campaignOverride = Boolean(campaign?.title.trim());
  const adminThemeOverride = Boolean(theme?.festive_style_active);
  const adminBackground: CSSProperties | null = adminThemeOverride
    ? theme.header_bg_image_url
      ? {
          backgroundImage: `url("${theme.header_bg_image_url}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : { background: theme.current_bg_color || context.background }
    : null;
  const campaignBackground: CSSProperties | null = campaign?.theme_bg_image_url
    ? {
        backgroundImage: `url("${campaign.theme_bg_image_url}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : campaign?.theme_bg_color
      ? { background: campaign.theme_bg_color }
      : null;
  const style = campaignBackground ?? adminBackground ?? { background: context.background };
  const title = campaignOverride ? campaign.title : context.title;
  const backgroundImage = (campaignBackground ?? adminBackground)?.backgroundImage;

  return (
    <section className="px-5 pt-4" aria-label={`${context.eventLabel} food picks`}>
      <div
        style={style}
        className="relative isolate overflow-hidden rounded-[1.75rem] px-4 py-4 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.55)]"
      >
        {backgroundImage ? <div className="absolute inset-0 z-0 bg-black/35" /> : null}
        <div
          className="pointer-events-none absolute -right-8 -top-8 z-0 h-36 w-36 rounded-full opacity-20 blur-2xl"
          style={{ backgroundColor: context.accent }}
        />
        <div className="relative z-10 flex items-start gap-3">
          {context.event === "navratri" ? (
            <div
              aria-hidden="true"
              className="grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-full border-4 border-white/80 bg-[#F7D8A6] shadow-inner"
            >
              <svg viewBox="0 0 72 72" className="h-12 w-12" fill="none">
                <circle cx="36" cy="36" r="35" fill="#FFF8E9" />
                <path d="M17 40h38l-5 14H22l-5-14Z" fill="#D77938" />
                <path d="M20 40c2 9 8 14 16 14s14-5 16-14H20Z" fill="#F2A454" />
                <path d="M24 38c0-7 5-12 12-12s12 5 12 12H24Z" fill="#EBC374" />
                <circle cx="30" cy="32" r="2" fill="#FFF3D3" />
                <circle cx="37" cy="29" r="2" fill="#FFF3D3" />
                <circle cx="43" cy="33" r="2" fill="#FFF3D3" />
                <path d="M26 42h20" stroke="#FFF3D3" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <img
              src={context.image}
              alt=""
              className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl border-2 border-white/75 object-cover shadow-sm"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <span
              className="inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em]"
              style={{ color: context.accent }}
            >
              {context.eventLabel}
            </span>
            <h2
              className="mt-1.5 text-lg font-black leading-tight"
              style={{ color: backgroundImage ? "#fff" : context.foreground }}
            >
              {title}
            </h2>
            <p
              className="mt-1 text-[11px] leading-relaxed"
              style={{ color: backgroundImage ? "rgba(255,255,255,.9)" : context.foreground }}
            >
              {context.description}
            </p>
          </div>
        </div>
        <div className="no-scrollbar relative z-10 mt-4 flex gap-2 overflow-x-auto pb-0.5">
          {context.filters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => onFilter(filter.query)}
              className="shrink-0 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-[10px] font-extrabold shadow-sm transition hover:bg-white"
              style={{ color: context.accent }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
