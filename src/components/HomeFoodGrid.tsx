import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { foodImage } from "@/lib/foodImage";
import { customerPrice } from "@/lib/pricing";
import { inr } from "@/lib/fees";
import type { CartLine } from "@/lib/cart";
import type { StreetFoodItem, StreetFoodVendor } from "@/components/StreetFoodExperience";

export function HomeFoodGrid({ items, vendors, lines, onAdd, onRemove, onVendor }: {
  items: StreetFoodItem[]; vendors: StreetFoodVendor[]; lines: CartLine[];
  onAdd: (item: StreetFoodItem) => void; onRemove: (id: string) => void; onVendor: (id: string) => void;
}) {
  if (!items.length) return <p className="px-5 py-8 text-sm text-muted-foreground">No food matches this search.</p>;
  return <section aria-label="Fresh food near you" className="px-5 py-5">
    <div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="text-lg font-bold">Fresh near you</h2><span className="text-xs text-muted-foreground">{items.length} dishes</span></div>
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const price = customerPrice(item.price);
        const mrp = Math.max(price, customerPrice(item.mrp));
        const discount = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
        const line = lines.find((candidate) => candidate.itemId === item.id);
        const vendor = vendors.find((candidate) => candidate.id === item.vendor_id);
        return <article key={item.id} className="home-food-card min-w-0 overflow-hidden rounded-lg border border-border bg-card p-2.5">
          <div className="relative aspect-square overflow-hidden rounded-md bg-muted/40">
            <img src={item.photo_url || foodImage(item.name)} alt={item.name} loading="lazy" className="h-full w-full object-contain" />
            {discount > 0 ? <span className="absolute left-1.5 top-1.5 rounded bg-success/10 px-1.5 py-1 text-[9px] font-bold text-success">{discount}% OFF</span> : null}
          </div>
          <Button variant="ghost" onClick={() => onVendor(item.vendor_id)} className="mt-2 h-auto w-full justify-start truncate p-0 text-[10px] font-medium text-muted-foreground">{vendor?.stall_name || "Local stall"}</Button>
          <h3 className="mt-1 min-h-10 text-xs font-semibold leading-5">{item.name}</h3>
          <p className="mb-2 truncate text-[10px] text-muted-foreground">{item.unit || "Freshly prepared"}</p>
          <div className="flex h-8 items-center justify-between gap-1">
            <span className="min-w-0"><span className="block text-sm font-bold">{inr(price)}</span>{discount > 0 ? <span className="block text-[10px] text-muted-foreground line-through">{inr(mrp)}</span> : null}</span>
            {line ? <div className="flex h-8 shrink-0 items-center rounded-md border border-primary/40 text-primary"><Button size="icon" variant="ghost" className="h-7 w-6" aria-label={`Remove one ${item.name}`} onClick={() => onRemove(item.id)}><Minus className="h-3 w-3" /></Button><span className="min-w-4 text-center text-xs font-bold">{line.qty}</span><Button size="icon" variant="ghost" className="h-7 w-6" aria-label={`Add one ${item.name}`} onClick={() => onAdd(item)}><Plus className="h-3 w-3" /></Button></div> : <Button size="icon" variant="outline" className="h-8 w-9 border-primary/40 text-primary" aria-label={`Add ${item.name}`} onClick={() => onAdd(item)}><Plus className="h-4 w-4" /></Button>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}