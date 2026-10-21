import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { useReducedMotion } from "framer-motion";
import { ShoppingBag, ArrowLeft, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { OfferImageOverlay } from "@/components/OfferImageOverlay";
import { supabase } from "@/integrations/supabase/client";
import { listCampaigns, type Campaign } from "@/lib/marketing";
import { foodImage } from "@/lib/foodImage";
import { customerPrice } from "@/lib/pricing";
import { cart, useCart } from "@/lib/cart";
import { inr } from "@/lib/fees";
import type { CampaignMenuItem } from "@/lib/commerceCampaigns";

const themes = ["Feasting & sweets", "Festive gifting", "Puja favourites", "Family gatherings", "Celebration bites"];
type Vendor = { id: string; stall_name: string; offer_percent: number; offer_label: string | null; is_open: boolean };
const validMedia = (url: string | null | undefined) => Boolean(url && /^(https?:\/\/|\/)/i.test(url));

export function DurgaPujaPage() {
  const lines = useCart();
  const reduced = useReducedMotion();
  const rail = useRef<HTMLDivElement>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [items, setItems] = useState<CampaignMenuItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const [campaigns, menu, stalls, cats] = await Promise.all([
          listCampaigns(true),
          supabase.from("menu_items").select("id,vendor_id,category_id,name,photo_url,unit,price,mrp,in_stock,food_type").eq("in_stock", true),
          supabase.from("vendors").select("id,stall_name,offer_percent,offer_label,is_open").eq("status", "APPROVED"),
          supabase.from("categories").select("id,name").order("sort_order"),
        ]);
        if (menu.error || stalls.error || cats.error) throw menu.error ?? stalls.error ?? cats.error;
        if (!alive) return;
        const approved = new Set((stalls.data ?? []).map((v) => v.id));
        setCampaign(campaigns.find((c) => /durga\s*puja/i.test(c.title)) ?? null);
        setItems((menu.data ?? []).filter((i) => approved.has(i.vendor_id)));
        setVendors(stalls.data ?? []);
        setCategories(cats.data ?? []);
        setError(false);
      } catch { if (alive) setError(true); }
      finally { if (alive) setLoading(false); }
    };
    void pull();
    window.addEventListener("focus", pull);
    const timer = window.setInterval(pull, 30000);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener("focus", pull); };
  }, []);
  useEffect(() => {
    if (reduced || paused) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % 5), 3500);
    return () => window.clearInterval(timer);
  }, [paused, reduced]);
  useEffect(() => {
    const node = rail.current;
    const child = node?.children[slide];
    if (node && child instanceof HTMLElement) node.scrollTo({ left: child.offsetLeft - node.offsetLeft - 16, behavior: reduced ? "instant" : "smooth" });
  }, [slide, reduced]);
  const shown = useMemo(() => selected ? items.filter((i) => i.category_id === selected || i.name.toLowerCase().includes(selected.toLowerCase())) : items, [items, selected]);
  const cover = validMedia(campaign?.theme_bg_image_url) ? campaign?.theme_bg_image_url : null;
  const style = campaign?.theme_bg_color && /^#[\da-f]{3,8}$/i.test(campaign.theme_bg_color) ? { "--festival-background": campaign.theme_bg_color } as CSSProperties : undefined;
  function add(item: CampaignMenuItem, vendor: Vendor) {
    const result = cart.add({ itemId: item.id, vendorId: item.vendor_id, vendorName: vendor.stall_name, name: item.name, photo: item.photo_url, unit: item.unit, base: Number(item.price), price: customerPrice(item.price), mrp: customerPrice(item.mrp) });
    if (!result.ok && "error" in result) toast.error(result.error);
  }
  return <Shell><main className="pb-36">
    <section className="festival-world" style={style}>
      <div className="flex items-center justify-between px-4 pt-4">
        <Button asChild variant="ghost" size="icon" className="text-festive-header-foreground"><Link to="/" aria-label="Back to home"><ArrowLeft /></Link></Button>
        <span className="text-xs font-bold">ThelaWala</span>
        <Button asChild variant="ghost" size="icon" className="text-festive-header-foreground"><Link to="/cart" aria-label="View cart"><ShoppingBag /></Link></Button>
      </div>
      {cover ? <div className="festival-cover-wrap"><img src={cover} alt={campaign?.title ?? "Durga Puja"} className="festival-cover" /><div className="festival-cover-fade" aria-hidden="true" /></div> : <div className="px-5 pb-28 pt-10 text-center"><p className="text-xs font-bold uppercase">Celebrate</p><h1 className="mt-3 font-display text-4xl">Durga Puja</h1><p className="mt-3 text-xs">{campaign?.title ?? "Festive favourites from your local stalls"}</p></div>}
      {cover ? <h1 className="sr-only">{campaign?.title ?? "Durga Puja"}</h1> : null}
      <div ref={rail} aria-label="Festive collections" className="festival-rail festival-rail-overlap no-scrollbar" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerCancel={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
        {themes.map((title, index) => {
          const card = campaign?.promo_cards[index];
          const item = items[index % Math.max(1, items.length)];
          const image = validMedia(card?.image_url) ? card?.image_url : item?.photo_url || foodImage(item?.name ?? "sweets");
          return <Button key={title} variant="ghost" className={`festival-arch festival-shape-${card?.style_index ?? index}`} onClick={() => { const filter = card?.redirect_category_or_filter; const category = categories.find((c) => c.name === filter); setSelected(category?.id ?? filter ?? null); }}>
            <span className="block px-3 pt-7 text-center text-lg font-black leading-tight whitespace-normal">{card?.title || title}</span>
            {validMedia(card?.video_url) ? <video src={card?.video_url} muted loop autoPlay={!reduced} playsInline className="min-h-0 w-full flex-1 object-contain" /> : <img src={image} alt={card?.title || title} className="min-h-0 w-full flex-1 object-contain p-3" />}
            {card?.subtitle ? <span className="block px-3 pb-4 text-center text-xs whitespace-normal">{card.subtitle}</span> : null}
          </Button>;
        })}
      </div>
      <div className="flex justify-center gap-1 pb-6">{themes.map((title,i) => <Button key={title} variant="ghost" size="icon" className="h-6 w-6 text-festive-header-foreground" onClick={() => setSlide(i)} aria-label={`Show festive collection ${i+1}`} aria-pressed={slide === i}><span className={`h-1.5 w-1.5 rounded-full bg-current ${slide === i ? "opacity-100" : "opacity-40"}`} /></Button>)}</div>
    </section>
    <section className="px-4 pt-6"><h2 className="text-2xl font-black">Durga Puja specials</h2>
      <div className="no-scrollbar my-4 flex gap-2 overflow-x-auto"><Button variant={selected === null ? "default" : "outline"} onClick={() => setSelected(null)}>Top Picks</Button>{categories.map((c) => <Button key={c.id} variant={selected === c.id ? "default" : "outline"} className="shrink-0" onClick={() => setSelected(c.id)}>{c.name}</Button>)}</div>
      {loading ? <div className="grid grid-cols-2 gap-3">{[0,1,2,3].map((i) => <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />)}</div> : error ? <p role="alert" className="py-8 text-sm text-destructive">Festive favourites could not load. Please refresh.</p> : !shown.length ? <p className="py-8 text-sm text-muted-foreground">No festive picks in this collection yet.</p> : <div className="grid grid-cols-2 gap-3">{shown.map((item) => {
        const vendor = vendors.find((v) => v.id === item.vendor_id);
        if (!vendor) return null;
        const line = lines.find((l) => l.itemId === item.id);
        const price = customerPrice(item.price), mrp = customerPrice(item.mrp);
        return <article key={item.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"><Link to="/item/$id" params={{id:item.id}} className="relative block aspect-square bg-muted"><img src={item.photo_url || foodImage(item.name)} alt={item.name} className="h-full w-full object-cover" /><span className="festive-pick-badge absolute left-0 top-2 px-2 py-1 text-[9px] font-black">FESTIVE PICKS</span><OfferImageOverlay stallName={vendor.stall_name} offerPercent={vendor.offer_percent} offerLabel={vendor.offer_label} offerPrice={price} mrp={mrp} /></Link><div className="p-2.5"><h3 className="line-clamp-2 min-h-8 text-xs font-bold">{item.name}</h3><p className="mt-1 truncate text-[9px] text-muted-foreground">{vendor.stall_name}</p><div className="mt-3 flex items-center justify-between gap-1"><span className="text-xs font-black">{inr(price)}{mrp > price ? <span className="ml-1 text-[9px] font-medium text-muted-foreground line-through">{inr(mrp)}</span> : null}</span>{line ? <span className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-7 w-7" aria-label={`Remove one ${item.name}`} onClick={() => cart.remove(item.id)}><Minus /></Button><span className="text-xs">{line.qty}</span><Button size="icon" className="h-7 w-7" aria-label={`Add one ${item.name}`} onClick={() => add(item,vendor)}><Plus /></Button></span> : <Button variant="outline" size="sm" disabled={!vendor.is_open} aria-label={`Add ${item.name}`} className="px-2 text-[10px] font-black text-primary" onClick={() => add(item,vendor)}>{vendor.is_open ? "ADD" : "Closed"}</Button>}</div></div></article>;
      })}</div>}
    </section>
    {lines.length > 0 ? <div className="fixed inset-x-0 bottom-[98px] z-40 mx-auto max-w-[500px] px-4"><Link to="/cart" className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-card"><span className="text-xs font-bold">{lines.reduce((sum,l) => sum+l.qty,0)} items in cart</span><span className="flex items-center gap-2 text-xs font-black">View cart <ShoppingBag className="h-4 w-4" /></span></Link></div> : null}
  </main></Shell>;
}