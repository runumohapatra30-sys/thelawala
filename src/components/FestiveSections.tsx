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

function CardMedia({
  card,
  className,
}: {
  card: { title: string; image_url: string; video_url?: string };
  className: string;
}) {
  if (card.video_url) {
    return (
      <video
        src={card.video_url}
        autoPlay
        loop
        muted
        playsInline
        className={`${className} bg-black/10`}
      />
    );
  }
  return (
    <img
      src={card.image_url || foodImage(card.title)}
      alt={card.title}
      loading="lazy"
      className={className}
    />
  );
}

/** Gentle floating sparkles / diya glows for the festive header. */
export function FestiveAmbience() {
  const sparks = [
    { left: "8%", size: 10, dur: "11s", delay: "0s", x: "18px" },
    { left: "24%", size: 6, dur: "9s", delay: "1.6s", x: "-14px" },
    { left: "41%", size: 12, dur: "13s", delay: "3.2s", x: "10px" },
    { left: "58%", size: 7, dur: "10s", delay: "0.8s", x: "-20px" },
    { left: "73%", size: 9, dur: "12s", delay: "2.4s", x: "16px" },
    { left: "89%", size: 6, dur: "8.5s", delay: "4s", x: "-10px" },
  ];
  const glows = [
    { left: "12%", top: "18%", size: 90, dur: "6s", delay: "0s" },
    { left: "70%", top: "8%", size: 120, dur: "7.5s", delay: "1.2s" },
    { left: "45%", top: "58%", size: 100, dur: "6.8s", delay: "2.4s" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-60">
      {glows.map((g, n) => (
        <span
          key={`g${n}`}
          className="festive-glow"
          style={{ left: g.left, top: g.top, width: g.size, height: g.size, ["--dur" as string]: g.dur, ["--delay" as string]: g.delay }}
        />
      ))}
      {sparks.map((sp, n) => (
        <span
          key={`s${n}`}
          className="festive-spark"
          style={{
            left: sp.left,
            bottom: "-10%",
            width: sp.size,
            height: sp.size,
            ["--dur" as string]: sp.dur,
            ["--delay" as string]: sp.delay,
            ["--drift-x" as string]: sp.x,
          }}
        />
      ))}
    </div>
  );
}

function GridCardButton({
  card,
  tall,
  onFilter,
  cardClass,
}: {
  card: { title: string; image_url: string; video_url?: string; filter: string; tag: string };
  tall?: boolean;
  onFilter: (v: string) => void;
  cardClass?: string | undefined;
}) {
  return (
    <button
      onClick={() => onFilter(card.filter || card.title)}
      className={`press flex min-w-0 flex-col gap-2 overflow-hidden rounded-3xl text-left shadow-md ${tall ? "h-full p-3" : "p-2"} ${cardClass ?? "border border-card/60 bg-card/85"}`}
    >
      <div className="min-w-0">
        <p className={`font-black leading-tight ${cardClass ? "" : "text-foreground"} ${tall ? "text-[16px]" : "text-[11.5px]"}`}>{card.title}</p>
        {card.tag ? (
          <span className="mt-1 inline-block rounded-md bg-current/15 px-1.5 py-0.5 text-[9.5px] font-black opacity-90">
            {card.tag}
          </span>
        ) : null}
      </div>
      <CardMedia
        card={card}
        className={`mt-auto w-full rounded-2xl object-cover ${tall ? "aspect-[3/4]" : "aspect-square"}`}
      />
    </button>
  );
}

/** Bare festive grid (no own background/padding) for rendering inside the themed top header. */
export function FestiveHero({
  section,
  onFilter,
  cardClass,
}: {
  section: HomeSection;
  onFilter: (v: string) => void;
  cardClass?: string | undefined;
}) {
  const cards = section.cards.filter((c) => c.title || c.image_url || c.video_url).slice(0, 5);
  if (cards.length === 0) return null;
  const [first, ...rest] = cards;
  return (
    <div className="relative z-10 min-w-0">
      <div className="mb-3 text-center">
        <p className="festive-shimmer inline-block rounded-full bg-current/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] opacity-80">
          Celebrate
        </p>
        <p className="mt-1 text-[22px] font-black leading-tight drop-shadow-sm">{section.title}</p>
        {section.subtitle ? (
          <p className="mt-1 text-[11px] font-semibold opacity-80">{section.subtitle}</p>
        ) : null}
      </div>
      <div className={`grid min-w-0 gap-3 ${rest.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
        {first ? <GridCardButton card={first} tall onFilter={onFilter} cardClass={cardClass} /> : null}
        {rest.length > 0 ? (
          <div className={`grid min-w-0 content-start gap-2 ${rest.length > 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {rest.map((c, n) => (
              <GridCardButton key={n} card={c} onFilter={onFilter} cardClass={cardClass} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FestiveGrid({ section, onFilter }: { section: HomeSection; onFilter: (v: string) => void }) {
  if (section.cards.filter((c) => c.title || c.image_url || c.video_url).length === 0) return null;
  return (
    <section className="pt-5">
      <div style={bgStyle(section)} className="relative overflow-hidden px-4 pb-5 pt-6 text-foreground shadow-sm">
        <FestiveAmbience />
        <FestiveHero section={section} onFilter={onFilter} />
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
