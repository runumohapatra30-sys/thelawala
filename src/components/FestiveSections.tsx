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

function GridCardButton({
  card,
  tall,
  wide,
  onFilter,
}: {
  card: { title: string; image_url: string; filter: string; tag: string };
  tall?: boolean;
  wide?: boolean;
  onFilter: (v: string) => void;
}) {
  return (
    <button
      onClick={() => onFilter(card.filter || card.title)}
      className={`press flex min-w-0 flex-col gap-2 overflow-hidden rounded-3xl border border-card/60 bg-card/85 p-3 text-left shadow-md ${tall ? "row-span-2" : ""} ${wide ? "col-span-2" : ""}`}
    >
      <div className="min-w-0">
        <p className={`font-black leading-tight text-foreground ${tall ? "text-[16px]" : "text-[12.5px]"}`}>{card.title}</p>
        {card.tag ? (
          <span className="mt-1 inline-block rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-black text-primary">
            {card.tag}
          </span>
        ) : null}
      </div>
      <img
        src={card.image_url || foodImage(card.title)}
        alt={card.title}
        loading="lazy"
        className={`mt-auto w-full rounded-2xl object-cover ${tall ? "aspect-[3/4]" : wide ? "aspect-[3/1]" : "aspect-square"}`}
      />
    </button>
  );
}

function FestiveGrid({ section, onFilter }: { section: HomeSection; onFilter: (v: string) => void }) {
  const cards = section.cards.filter((c) => c.title || c.image_url).slice(0, 4);
  if (cards.length === 0) return null;
  const [first, ...rest] = cards;
  return (
    <section className="pt-5">
      <div style={bgStyle(section)} className="relative overflow-hidden px-4 pb-5 pt-6 shadow-sm">
        <div className="mb-4 text-center">
          <p className="text-[9px] font-black uppercase text-foreground/55">Celebrate</p>
          <p className="text-[22px] font-black leading-tight text-foreground drop-shadow-sm">{section.title}</p>
          {section.subtitle ? (
            <p className="mt-1 text-[11px] font-semibold text-foreground/65">{section.subtitle}</p>
          ) : null}
        </div>
        <div className="grid h-auto grid-cols-2 auto-rows-auto items-stretch gap-3">
          {first ? <GridCardButton card={first} tall onFilter={onFilter} /> : null}
          {rest.map((c, n) => (
            <GridCardButton key={n} card={c} wide={n === 2} onFilter={onFilter} />
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
    <section className="pt-5">
      <div style={bgStyle(section)} className="overflow-hidden px-4 py-5 shadow-sm">
        <p className="text-[20px] font-black leading-tight text-foreground drop-shadow-sm">✦ {section.title}</p>
        {section.subtitle ? (
          <p className="mt-0.5 text-[11.5px] font-semibold text-[#1f2937]/75">{section.subtitle}</p>
        ) : null}

        <div className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {picks.map((i) => {
            const price = customerPrice(i.price);
            const qty = qtyOf?.(i.id) ?? 0;
            return (
              <div key={i.id} className="w-[156px] shrink-0 snap-start rounded-2xl border border-border/70 bg-card p-2 shadow-md">
                <div className="relative">
                  <img
                    src={i.photo_url ?? foodImage(i.name)}
                    alt={i.name}
                    loading="lazy"
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                  <span aria-hidden>⏱</span> 14 mins
                </p>
                <p className="mt-0.5 line-clamp-2 min-h-[30px] text-[12px] font-extrabold leading-tight">{i.name}</p>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-extrabold">{inr(price)}</p>
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
