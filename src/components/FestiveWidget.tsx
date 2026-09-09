import type { Campaign } from "@/lib/marketing";

type Props = {
  campaign: Campaign | null;
  onFilter: (value: string) => void;
};

export function FestiveWidget({ campaign, onFilter }: Props) {
  if (!campaign) return null;
  const cards = campaign.promo_cards.filter((c) => c.title || c.image_url);
  if (cards.length === 0 && !campaign.deals_section_active) return null;

  const style = campaign.theme_bg_image_url
    ? { backgroundImage: `url(${campaign.theme_bg_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: campaign.theme_bg_color ?? "linear-gradient(135deg,#fff2c2,#ffd8a8)" };

  return (
    <section className="px-5 pt-6">
      <div style={style} className="overflow-hidden rounded-[1.6rem] p-4 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.6)]">
        <p className="text-[15px] font-extrabold text-[#1f2937] drop-shadow-sm">{campaign.title}</p>
        {cards.length ? (
          <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cards.map((c, n) => (
              <button
                key={n}
                onClick={() => c.redirect_category_or_filter && onFilter(c.redirect_category_or_filter)}
                className="press w-[132px] shrink-0 snap-start overflow-hidden rounded-[1.3rem] bg-card p-2 text-left shadow-[0_12px_24px_-18px_rgba(15,23,42,0.8)]"
              >
                {c.image_url ? (
                  <img src={c.image_url} alt={c.title} loading="lazy" className="aspect-square w-full rounded-[1rem] object-cover" />
                ) : null}
                <p className="mt-2 truncate text-[12px] font-extrabold">{c.title}</p>
                <p className="truncate text-[10.5px] font-medium text-muted-foreground">{c.subtitle}</p>
              </button>
            ))}
          </div>
        ) : null}

        {campaign.deals_section_active ? (
          <div className="mt-3 rounded-[1.3rem] bg-card/90 px-3 py-2.5">
            <p className="text-[12px] font-extrabold">Deals worth grabbing</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {["Limited offers", "Under ₹99", "Buy 1 Get 1", "Free delivery"].map((d) => (
                <button
                  key={d}
                  onClick={() => onFilter(d)}
                  className="press shrink-0 rounded-full border border-primary px-3 py-1.5 text-[11px] font-extrabold text-primary"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
