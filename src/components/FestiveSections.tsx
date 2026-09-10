import { useHomeSections, type HomeSection } from "@/lib/homeSections";
import { customerPrice } from "@/lib/pricing";
import { inr } from "@/lib/fees";
import { foodImage } from "@/lib/foodImage";

export type PickItem = {
  id: string;
  name: string;
  photo_url: string | null;
  price: number;
  mrp: number;
  in_stock: boolean;
};

type Props = {
  items: PickItem[];
  onFilter: (value: string) => void;
  onAdd: (itemId: string) => void;
  qtyOf?: (itemId: string) => number;
  /** Pass sections directly for the admin preview; otherwise the live published ones are used. */
  sections?: HomeSection[];
};

export function FestiveSections(props: Props) {
  const live = useHomeSections();
  const rows = props.sections ?? live;
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map((s) =>
        s.section_type === "FESTIVE_GRID_4" ? (
          <FestiveGrid key={s.id} section={s} onFilter={props.onFilter} />
        ) : (
          <FestivePicks key={s.id} section={s} {...props} />
        ),
      )}
    </>
  );
}

function bgStyle(section: HomeSection) {
  return section.bg_image_url
    ? { backgroundImage: `url(${section.bg_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: section.bg_color || "linear-gradient(135deg,#FFF3C4,#FFD9A0)" };
}

function FestiveGrid({ section, onFilter }: { section: HomeSection; onFilter: (v: string) => void }) {
  const cards = section.cards.filter((c) => c.title || c.image_url).slice(0, 4);
  if (cards.length === 0) return null;
  return (
    <section className="px-4 pt-6">
      <div style={bgStyle(section)} className="overflow-hidden rounded-2xl p-4 shadow-md">
        <p className="text-[17px] font-extrabold leading-tight text-[#1f2937] drop-shadow-sm">{section.title}</p>
        {section.subtitle ? (
          <p className="mt-0.5 text-[11.5px] font-semibold text-[#1f2937]/75">{section.subtitle}</p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {cards.map((c, n) => (
            <button
              key={n}
              onClick={() => onFilter(c.filter || c.title)}
              className="press overflow-hidden rounded-2xl bg-card p-2 text-left shadow-md"
            >
              <img
                src={c.image_url || foodImage(c.title)}
                alt={c.title}
                loading="lazy"
                className="aspect-square w-full rounded-xl object-cover"
              />
              <p className="mt-2 truncate px-0.5 text-[12px] font-extrabold">{c.title}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function FestivePicks({ section, items, onAdd, qtyOf }: Props & { section: HomeSection }) {
  const picks = section.item_ids
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is PickItem => Boolean(i));
  if (picks.length === 0) return null;

  return (
    <section className="pt-6">
      <div style={bgStyle(section)} className="mx-4 overflow-hidden rounded-2xl px-4 py-4 shadow-md">
        <p className="text-[17px] font-extrabold leading-tight text-[#1f2937] drop-shadow-sm">{section.title}</p>
        {section.subtitle ? (
          <p className="mt-0.5 text-[11.5px] font-semibold text-[#1f2937]/75">{section.subtitle}</p>
        ) : null}

        <div className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {picks.map((i) => {
            const price = customerPrice(i.price);
            const mrp = customerPrice(i.mrp);
            const off = Math.max(0, Math.round(mrp - price));
            const qty = qtyOf?.(i.id) ?? 0;
            return (
              <div key={i.id} className="w-[150px] shrink-0 snap-start rounded-2xl bg-card p-2 shadow-md">
                <div className="relative">
                  <img
                    src={i.photo_url ?? foodImage(i.name)}
                    alt={i.name}
                    loading="lazy"
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  {off > 0 ? (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-[#2563EB] px-2 py-0.5 text-[9.5px] font-black text-white shadow">
                      {inr(off)} OFF
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                  <span aria-hidden>⏱</span> 14 mins
                </p>
                <p className="mt-0.5 line-clamp-2 min-h-[30px] text-[12px] font-extrabold leading-tight">{i.name}</p>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-extrabold">{inr(price)}</p>
                    {mrp > price ? (
                      <p className="truncate text-[10.5px] font-medium text-muted-foreground line-through">{inr(mrp)}</p>
                    ) : null}
                  </div>
                  {!i.in_stock ? (
                    <span className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground">
                      Sold out
                    </span>
                  ) : (
                    <button
                      onClick={() => onAdd(i.id)}
                      className="press rounded-lg border border-primary bg-[color-mix(in_oklab,var(--color-primary)_10%,white)] px-3 py-1.5 text-[11px] font-extrabold text-primary"
                    >
                      {qty > 0 ? `ADD · ${qty}` : "ADD"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
