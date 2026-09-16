import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, PortalHeader } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import { foodImage } from "@/lib/foodImage";
import { Heart, Search, Share2, Info, Timer, Bike } from "lucide-react";

export const Route = createFileRoute("/stalls/$id")({
  component: StallDetail,
});

type Item = {
  id: string;
  name: string;
  details: string | null;
  photo_url: string | null;
  unit: string | null;
  price: number;
  mrp: number;
  in_stock: boolean;
  food_type: string;
};

type Vendor = {
  id: string;
  stall_name: string;
  is_open: boolean;
  photo_url: string | null;
  stall_photos: string[] | null;
  offer_percent: number | null;
  offer_label: string | null;
  address: string | null;
  description: string | null;
};

function StallDetail() {
  const { id } = Route.useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const lines = useCart();

  useEffect(() => {
    async function load() {
      const [vRes, iRes] = await Promise.all([
        supabase.from("vendors").select("*").eq("id", id).maybeSingle(),
        supabase.from("menu_items").select("*").eq("vendor_id", id).order("created_at"),
      ]);
      setVendor(vRes.data as Vendor);
      setItems((iRes.data ?? []) as Item[]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <Shell><PortalHeader title="Stall" /><div className="py-20 text-center text-sm text-muted-foreground animate-pulse">Loading stall details...</div></Shell>;
  if (!vendor) return <Shell><PortalHeader title="Not found" /><div className="py-20 text-center text-sm text-muted-foreground">Stall not found.</div></Shell>;

  const photos = [vendor.photo_url, ...(vendor.stall_photos ?? [])].filter(Boolean) as string[];

  return (
    <Shell>
      <div className="relative">
        <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-transparent">
          <Link to="/" className="press grid h-10 w-10 place-items-center rounded-full glass-panel text-foreground">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <div className="flex gap-2">
            <button className="press grid h-10 w-10 place-items-center rounded-full glass-panel text-foreground"><Share2 className="h-5 w-5" /></button>
            <button className="press grid h-10 w-10 place-items-center rounded-full glass-panel text-foreground"><Heart className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="px-4 pt-2">
          <h1 className="text-3xl font-black leading-tight">{vendor.stall_name}</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{vendor.address || "Street side · Local Favourite"}</p>
          
          <div className="mt-4 flex items-center gap-4 border-y border-border/50 py-4">
            <div className="flex-1 text-center border-r border-border/50">
              <p className="flex items-center justify-center gap-1 text-[13px] font-black"><Timer className="h-3.5 w-3.5 text-primary" /> 15–20 mins</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Delivery</p>
            </div>
            <div className="flex-1 text-center">
              <p className="flex items-center justify-center gap-1 text-[13px] font-black"><Bike className="h-3.5 w-3.5 text-primary" /> Free</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Delivery Fee</p>
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="mt-6 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.map((p, idx) => (
              <img key={idx} src={p} className="h-44 w-64 shrink-0 rounded-2xl object-cover shadow-md" alt="Stall" />
            ))}
          </div>
        )}

        <div className="px-4 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Menu</h2>
            <button className="press grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground"><Search className="h-4 w-4" /></button>
          </div>

          <div className="mt-4 space-y-6 pb-40">
            {items.map((i) => {
              const line = lines.find((l) => l.itemId === i.id);
              const price = customerPrice(i.price);
              const off = vendor.offer_percent ?? 0;
              const offerPrice = off > 0 ? Math.round(price * (100 - off)) / 100 : price;

              return (
                <div key={i.id} className="grid grid-cols-[1fr_120px] gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-3.5 w-3.5 rounded-sm border-2 ${i.food_type === "VEG" ? "border-green-600" : "border-red-600"} flex items-center justify-center`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${i.food_type === "VEG" ? "bg-green-600" : "bg-red-600"}`} />
                      </span>
                      {off > 0 && <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-black text-primary uppercase">Bestseller</span>}
                    </div>
                    <h3 className="mt-1 text-base font-extrabold">{i.name}</h3>
                    <p className="mt-0.5 text-[15px] font-black text-foreground">
                      {inr(offerPrice)}
                      {off > 0 && <span className="ml-1.5 text-[11px] font-medium text-muted-foreground line-through">{inr(price)}</span>}
                    </p>
                    {i.details && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{i.details}</p>}
                  </div>
                  <div className="relative h-[120px] w-[120px]">
                    <img 
                      src={i.photo_url || foodImage(i.name)} 
                      className="h-full w-full rounded-2xl object-cover shadow-sm" 
                      alt={i.name} 
                    />
                    {!i.in_stock ? (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 text-[10px] font-black text-white">OUT OF STOCK</div>
                    ) : (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                        {line ? (
                          <div className="flex h-9 min-w-[80px] items-center justify-between rounded-xl bg-card px-2 text-primary shadow-lg ring-1 ring-primary/20">
                            <button onClick={() => cart.remove(i.id)} className="press px-1 text-lg font-black">−</button>
                            <span className="text-sm font-black">{line.qty}</span>
                            <button onClick={() => cart.add({
                              itemId: i.id,
                              vendorId: vendor.id,
                              name: i.name,
                              photo: i.photo_url,
                              unit: i.unit,
                              base: Number(i.price),
                              price: customerPrice(i.price),
                              mrp: customerPrice(i.mrp),
                            })} className="press px-1 text-lg font-black">+</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => cart.add({
                              itemId: i.id,
                              vendorId: vendor.id,
                              name: i.name,
                              photo: i.photo_url,
                              unit: i.unit,
                              base: Number(i.price),
                              price: customerPrice(i.price),
                              mrp: customerPrice(i.mrp),
                            })}
                            className="press h-9 min-w-[84px] rounded-xl bg-card text-[13px] font-black text-primary shadow-lg ring-1 ring-primary/30 uppercase"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
