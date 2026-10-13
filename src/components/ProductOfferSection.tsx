import { motion, useReducedMotion, type MotionStyle } from "framer-motion";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HomeSection } from "@/lib/homeSections";
import type { PickItem } from "@/components/FestiveSections";
import { customerPrice } from "@/lib/pricing";
import { inr } from "@/lib/fees";
import { foodImage } from "@/lib/foodImage";

export function ProductOfferSection({ section, items, onAdd, onRemove, qtyOf, onFilter }: { section: HomeSection; items: PickItem[]; onAdd: (id: string) => void; onRemove?: ((id: string) => void) | undefined; qtyOf?: ((id: string) => number) | undefined; onFilter: (value: string) => void }) {
  const reduced = useReducedMotion();
  const config = section.cards[0];
  const design = config?.offer_design ?? "SAVINGS_RAIL";
  const picks = config?.auto_items ? items.filter((item) => item.in_stock) : section.item_ids.map((id) => items.find((item) => item.id === id)).filter((item): item is PickItem => Boolean(item));
  if (!picks.length) return null;
  const style = { ...(section.bg_color && /^#[0-9a-f]{6}$/i.test(section.bg_color) ? { "--offer-color": section.bg_color } : {}), ...(section.bg_image_url ? { "--offer-art": `url(${JSON.stringify(section.bg_image_url)})` } : {}) } as MotionStyle;
  const grid = design === "PRODUCT_GRID";
  return <motion.section aria-label={section.title} style={style} className={`product-offer product-offer--${design.toLowerCase()} min-w-0 py-5`} initial={reduced ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
    <header className="px-4 text-center"><h2 className="text-xl font-black uppercase leading-tight text-primary">{section.title}</h2>{section.subtitle ? <p className="mt-1 text-xs text-muted-foreground">{section.subtitle}</p> : null}</header>
    <div className={grid ? "mt-4 grid grid-cols-2 gap-3 px-4" : "mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]"}>
      {picks.map((item) => {
        const price = customerPrice(item.price);
        const original = Math.max(price, customerPrice(item.mrp));
        const saving = Math.round((original - price) * 100) / 100;
        const percent = original > 0 ? Math.round(saving / original * 100) : 0;
        const qty = qtyOf?.(item.id) ?? 0;
        return <article key={item.id} className={`min-w-0 ${grid ? "" : design === "SPOTLIGHT" ? "w-[260px] shrink-0 snap-start" : design === "COMPACT_RAIL" ? "w-[140px] shrink-0 snap-start" : "w-[190px] shrink-0 snap-start"}`}>
          <div className="offer-product-art relative flex aspect-[4/5] flex-col items-center overflow-hidden rounded-lg p-3 text-primary-foreground">
            <div className="z-10 min-h-12 text-center">{saving > 0 ? <><p className="text-xs font-semibold opacity-85">{percent}% OFF</p><p className="text-xl font-black leading-tight">SAVE {inr(saving)}</p></> : <p className="text-sm font-bold">Fresh street pick</p>}</div>
            <img src={item.photo_url || foodImage(item.name)} alt={item.name} loading="lazy" className="mt-3 min-h-0 w-full flex-1 rounded-md object-contain" />
          </div>
          <div className="mt-3 flex items-start justify-between gap-2"><div><p className="text-base font-black text-foreground">{inr(price)}</p>{saving > 0 ? <p className="text-xs text-muted-foreground line-through">{inr(original)}</p> : null}</div>
            {!item.in_stock ? <span className="text-xs text-muted-foreground">Sold out</span> : qty > 0 ? <div className="flex h-8 items-center rounded-md border border-primary text-primary">{onRemove ? <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove one ${item.name}`} onClick={() => onRemove(item.id)}><Minus /></Button> : null}<span className="min-w-4 text-center text-xs font-bold">{qty}</span><Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Add one ${item.name}`} onClick={() => onAdd(item.id)}><Plus /></Button></div> : <Button variant="outline" size="sm" className="border-primary text-primary" onClick={() => onAdd(item.id)} aria-label={`Add ${item.name}`}>ADD</Button>}
          </div>
          <h3 className="mt-2 min-h-10 text-sm font-semibold leading-5 text-foreground">{item.name}</h3>
        </article>;
      })}
    </div>
    {config?.footer_text ? <Button variant="ghost" className="offer-footer mt-4 h-auto w-full rounded-none px-4 py-3 text-xs font-bold whitespace-normal text-primary" onClick={() => onFilter("")}>{config.footer_text}<ArrowRight className="shrink-0" /></Button> : null}
  </motion.section>;
}