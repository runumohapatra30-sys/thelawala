import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { foodImage } from "@/lib/foodImage";
import { cart, useCart } from "@/lib/cart";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";
import { toast } from "sonner";

export const Route = createFileRoute("/categories")({
  validateSearch: (s: Record<string, unknown>): { cat?: string } => (typeof s["cat"] === "string" ? { cat: s["cat"] } : {}),
  head: () => ({
    meta: [
      { title: "All categories — ThelaWala" },
      { name: "description", content: "Browse every ThelaWala category: bhata dali, dahi bara, rolls, chaat, biryani, chicken pakoda, momo and chai." },
      { property: "og:title", content: "All categories — ThelaWala" },
      { property: "og:description", content: "Pick a category and order from your nearest thela in 15 minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Categories,
});

type Category = { id: string; name: string; emoji: string | null };
type Item = { id: string; vendor_id: string; category_id: string | null; name: string; details: string | null; photo_url: string | null; unit: string | null; price: number; mrp: number; in_stock: boolean; food_type: string };
type Vendor = { id: string; stall_name: string; is_open: boolean };

const TINTS = [
  "bg-[color-mix(in_oklab,var(--color-brand)_28%,white)]",
  "bg-[color-mix(in_oklab,var(--color-primary)_14%,white)]",
  "bg-[color-mix(in_oklab,var(--color-destructive)_12%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-2)_16%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-5)_18%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-3)_12%,white)]",
];

function Categories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { cat } = Route.useSearch();
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const lines = useCart();

  useEffect(() => {
    if (!cat) return;
    setLoadingItems(true);
    Promise.all([
      supabase.from("menu_items").select("id,vendor_id,category_id,name,details,photo_url,unit,price,mrp,in_stock,food_type").eq("category_id", cat).order("created_at"),
      supabase.from("vendors").select("id,stall_name,is_open"),
    ]).then(([i, v]) => {
      const map: Record<string, Vendor> = {};
      ((v.data ?? []) as Vendor[]).forEach((x) => { map[x.id] = x; });
      setVendors(map);
      setItems(((i.data ?? []) as Item[]).filter((x) => map[x.vendor_id]));
      setLoadingItems(false);
    });
  }, [cat]);

  function add(i: Item) {
    try {
      cart.add({ itemId: i.id, vendorId: i.vendor_id, name: i.name, photo: i.photo_url, unit: i.unit, base: Number(i.price), price: customerPrice(i.price), mrp: customerPrice(i.mrp) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add this item");
    }
  }

  useEffect(() => {
    supabase.from("categories").select("id,name,emoji").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("menu_items").select("category_id").then(({ data }) => {
      const c: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        if (r.category_id) c[r.category_id] = (c[r.category_id] ?? 0) + 1;
      });
      setCounts(c);
    });
  }, []);

  return (
    <Shell>
      <PortalHeader title="All categories" subtitle="Local Thela · Super Fast Delivery" />
      <div className="grid grid-cols-3 gap-3 p-4">
        {cats.map((c, idx) => (
          <Link
            key={c.id}
            to="/categories"
            search={{ cat: c.id }}
            style={{ animationDelay: `${idx * 45}ms` }}
            className={`press rise-in overflow-hidden rounded-2xl bg-card p-2 text-center shadow-card ${cat === c.id ? "ring-2 ring-primary" : ""}`}
          >
            <span className={`relative block aspect-square overflow-hidden rounded-xl ${TINTS[idx % TINTS.length]}`}>
              <img src={foodImage(c.name)} alt={c.name} loading="lazy" className="h-full w-full object-contain p-1" />
            </span>
            <span className="mt-1.5 block truncate text-[11px] font-bold leading-tight">{c.name}</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">{counts[c.id] ?? 0} items</span>
          </Link>
        ))}
      </div>
      {cat ? (
        <section className="px-4 pb-32">
          <h2 className="mb-3 text-lg font-black">{cats.find((c) => c.id === cat)?.name ?? "Food"} from all stalls</h2>
          {loadingItems ? (
            <p className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading food…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No food in this category yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((i) => {
                const v = vendors[i.vendor_id];
                const line = lines.find((l) => l.itemId === i.id);
                const available = i.in_stock && v?.is_open;
                return (
                  <div key={i.id} className="grid grid-cols-[minmax(0,1fr)_96px] gap-3 rounded-2xl bg-card p-3 shadow-card">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold">{i.name}</h3>
                      <Link to="/stalls/$id" params={{ id: i.vendor_id }} className="text-[11px] font-bold text-primary">{v?.stall_name} ›</Link>
                      <p className="mt-1 text-sm font-black">{inr(customerPrice(i.price))}</p>
                      {i.details ? <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{i.details}</p> : null}
                    </div>
                    <div className="product-tile relative h-24 w-24">
                      <img src={i.photo_url || foodImage(i.name)} alt={i.name} loading="lazy" className="h-full w-full object-contain p-1" />
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                        {!available ? (
                          <span className="whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground">{v?.is_open ? "Sold out" : "Closed"}</span>
                        ) : line ? (
                          <div className="flex h-8 min-w-[76px] items-center justify-between rounded-xl bg-card px-2 text-primary shadow-lg ring-1 ring-primary/20">
                            <button onClick={() => cart.remove(i.id)} className="press px-1 font-black">−</button>
                            <span className="text-sm font-black">{line.qty}</span>
                            <button onClick={() => add(i)} className="press px-1 font-black">+</button>
                          </div>
                        ) : (
                          <button onClick={() => add(i)} className="press h-8 min-w-[76px] rounded-full bg-card text-xs font-black uppercase text-primary shadow-lg ring-1 ring-primary/30">Add</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </Shell>
  );
}
