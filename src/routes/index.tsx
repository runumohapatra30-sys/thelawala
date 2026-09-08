import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { cart, cartTotals, useCart } from "@/lib/cart";
import { inr } from "@/lib/fees";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Thaleewala — Street food in 15 minutes, Bhubaneswar" },
      { name: "description", content: "Order bhata dali, dahi bara, rolls, chaat, biryani, momo and chai from Bhubaneswar street stalls, delivered in 15 minutes." },
      { property: "og:title", content: "Thaleewala — Street food in 15 minutes" },
      { property: "og:description", content: "Hot food from your nearest thela, delivered fast across Bhubaneswar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Item = {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name: string;
  details: string | null;
  photo_url: string | null;
  unit: string | null;
  price: number;
  mrp: number;
  in_stock: boolean;
};
type Category = { id: string; name: string; emoji: string | null };
type Vendor = { id: string; stall_name: string; is_open: boolean };

function Home() {
  const { user } = useSession();
  const lines = useCart();
  const { count, foodTotal } = cartTotals(lines);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("categories").select("id,name,emoji").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("vendors").select("id,stall_name,is_open").eq("status", "APPROVED").then(({ data }) => setVendors(data ?? []));
    supabase
      .from("menu_items")
      .select("id,vendor_id,category_id,name,details,photo_url,unit,price,mrp,in_stock")
      .order("created_at")
      .then(({ data }) => setItems((data ?? []) as Item[]));
  }, []);

  const vendorName = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.stall_name])),
    [vendors],
  );

  const shown = items.filter(
    (i) =>
      (!active || i.category_id === active) &&
      (!q || i.name.toLowerCase().includes(q.toLowerCase())),
  );

  function add(i: Item) {
    const res = cart.add({
      itemId: i.id,
      vendorId: i.vendor_id,
      name: i.name,
      photo: i.photo_url,
      unit: i.unit,
      price: Number(i.price),
      mrp: Number(i.mrp),
    });
    if (!res.ok) setToast(res.error);
    else setToast(null);
  }

  return (
    <Shell>
      <header className="sticky top-0 z-30 bg-primary px-4 pb-3 pt-4 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-extrabold leading-none">Thaleewala</p>
            <p className="mt-1 text-xs opacity-90">Delivery in 15 minutes · Bhubaneswar</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={user ? "/profile" : "/auth"}
              aria-label="Your account"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/20"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.4" /><path d="M4.5 20a7.5 7.5 0 0115 0" strokeLinecap="round" />
              </svg>
            </Link>
            <button
              aria-label="More options"
              onClick={() => setMenu((m) => !m)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/20"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
          </div>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search dahi bara, roll, biryani…"
          className="mt-3 w-full rounded-xl bg-card px-3 py-2.5 text-sm text-foreground outline-none"
        />
      </header>

      {menu ? (
        <div className="absolute right-3 z-40 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {[
            { to: "/orders", label: "Your orders" },
            { to: "/profile", label: "Profile & wallet" },
            { to: "/terms", label: "Terms & conditions" },
            { to: "/vendor", label: "Stall partner portal" },
            { to: "/rider", label: "Delivery partner portal" },
            { to: "/admin", label: "Administration" },
          ].map((m) => (
            <Link key={m.to} to={m.to} onClick={() => setMenu(false)} className="block px-3 py-2.5 text-sm">
              {m.label}
            </Link>
          ))}
          <a href="tel:9078492360" className="block border-t border-border px-3 py-2.5 text-sm font-semibold text-primary">
            Call care · 9078492360
          </a>
        </div>
      ) : null}

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        <button
          onClick={() => setActive(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${!active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
        >
          All
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${active === c.id ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-32">
        {shown.map((i) => {
          const line = lines.find((l) => l.itemId === i.id);
          return (
            <div key={i.id} className="card-soft border border-border p-2">
              <div className="relative">
                <img src={i.photo_url ?? "/food/food-tiffin.jpg"} alt={i.name} className="h-28 w-full rounded-xl object-cover" />
                {!i.in_stock ? (
                  <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/55 text-xs font-bold text-white">
                    Out of stock
                  </span>
                ) : null}
              </div>
              <p className="mt-2 truncate text-sm font-bold">{i.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{vendorName[i.vendor_id] ?? "Stall"} · {i.unit}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-bold">
                  {inr(Number(i.price))}{" "}
                  {Number(i.mrp) > Number(i.price) ? (
                    <span className="text-[11px] font-normal text-muted-foreground line-through">{inr(Number(i.mrp))}</span>
                  ) : null}
                </p>
                {!i.in_stock ? null : line ? (
                  <div className="flex items-center gap-2 rounded-lg bg-primary px-2 py-1 text-primary-foreground">
                    <button aria-label="Remove one" onClick={() => cart.remove(i.id)} className="px-1 font-bold">−</button>
                    <span className="text-xs font-bold">{line.qty}</span>
                    <button aria-label="Add one" onClick={() => add(i)} className="px-1 font-bold">+</button>
                  </div>
                ) : (
                  <button onClick={() => add(i)} className="rounded-lg border border-primary px-3 py-1 text-xs font-bold text-primary">
                    ADD
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {toast ? (
        <div className="fixed inset-x-0 bottom-32 z-40 mx-auto w-full max-w-[440px] px-4">
          <div className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background">{toast}</div>
        </div>
      ) : null}

      {count ? (
        <div className="fixed inset-x-0 bottom-[62px] z-40 mx-auto w-full max-w-[480px] px-3">
          <Link
            to="/cart"
            className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg"
          >
            <span className="text-sm font-bold">{count} item{count > 1 ? "s" : ""} · {inr(foodTotal)}</span>
            <span className="text-sm font-bold">View cart ›</span>
          </Link>
        </div>
      ) : null}
    </Shell>
  );
}
