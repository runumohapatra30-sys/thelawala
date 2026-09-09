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
      { title: "ThelaWala — Local Thela, super fast delivery in Bhubaneswar" },
      { name: "description", content: "Order bhata dali, dahi bara, rolls, chaat, biryani, momo and chai from Bhubaneswar street stalls, delivered in 15 minutes." },
      { property: "og:title", content: "ThelaWala — Local Thela | Super Fast Delivery" },
      { property: "og:description", content: "Hot food from your nearest thela, delivered in 15 minutes across Bhubaneswar." },
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
  food_type: string;
};
type Category = { id: string; name: string; emoji: string | null };
type Vendor = { id: string; stall_name: string; is_open: boolean };

const TINTS = [
  "bg-[color-mix(in_oklab,var(--color-brand)_28%,white)]",
  "bg-[color-mix(in_oklab,var(--color-primary)_14%,white)]",
  "bg-[color-mix(in_oklab,var(--color-destructive)_12%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-2)_16%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-5)_18%,white)]",
  "bg-[color-mix(in_oklab,var(--color-chart-3)_12%,white)]",
];

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
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    supabase.from("categories").select("id,name,emoji").order("sort_order").then(({ data }) => setCats(data ?? []));
    supabase.from("vendors").select("id,stall_name,is_open").eq("status", "APPROVED").then(({ data }) => setVendors(data ?? []));
    supabase
      .from("menu_items")
      .select("id,vendor_id,category_id,name,details,photo_url,unit,price,mrp,in_stock,food_type")
      .order("created_at")
      .then(({ data }) => setItems((data ?? []) as Item[]));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance,status").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setBalance(data?.status === "ACTIVE" ? Number(data.balance) : 0);
    });
    supabase
      .from("addresses")
      .select("line,landmark")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setAddress(data?.line ?? null));
    supabase
      .from("favorites")
      .select("item_id")
      .eq("user_id", user.id)
      .then(({ data }) => setFavs((data ?? []).map((f) => f.item_id).filter(Boolean) as string[]));
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .then(({ count }) => setUnread(count ?? 0));
  }, [user?.id]);

  async function toggleFav(itemId: string, vendorId: string) {
    if (!user) return;
    if (favs.includes(itemId)) {
      setFavs((f) => f.filter((x) => x !== itemId));
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_id", itemId);
    } else {
      setFavs((f) => [...f, itemId]);
      await supabase.from("favorites").insert({ user_id: user.id, item_id: itemId, vendor_id: vendorId });
    }
  }

  const vendorName = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.stall_name])),
    [vendors],
  );

  const shown = items.filter(
    (i) =>
      (!active || i.category_id === active) &&
      (!q || i.name.toLowerCase().includes(q.toLowerCase())) &&
      (!onlyVeg || i.food_type !== "NONVEG") &&
      (!onlyFav || favs.includes(i.id)),
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
      <header className="brand-header sticky top-0 z-30 rounded-b-[2.75rem] px-5 pb-5 pt-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <Link to="/cart" className="min-w-0 text-left">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-70">Delivery in</p>
            <p className="text-[22px] font-extrabold leading-tight">15–20 minutes</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold opacity-80">
              <span className="truncate">{address ?? "Bhubaneswar · set your address"}</span>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/wallet"
              className="press flex items-center gap-1 rounded-full bg-card px-2.5 py-1.5 text-[11px] font-black shadow-sm"
            >
              <span aria-hidden="true">👛</span>
              {inr(balance)}
            </Link>
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="press relative grid h-9 w-9 place-items-center rounded-full bg-card shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9zM10 19a2 2 0 004 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {unread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-black text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <Link
              to={user ? "/profile" : "/auth"}
              aria-label="Your account"
              className="press grid h-9 w-9 place-items-center rounded-full bg-card shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.4" /><path d="M4.5 20a7.5 7.5 0 0115 0" strokeLinecap="round" />
              </svg>
            </Link>
            <button
              aria-label="More options"
              onClick={() => setMenu((m) => !m)}
              className="press grid h-9 w-9 place-items-center rounded-full bg-card shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full bg-card px-3 py-2.5 shadow-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search "dahi bara"'
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
          />
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
          </svg>
        </div>
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

      <section className="px-4 pt-4">
        <h2 className="text-sm font-black">Thela categories</h2>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <button
            onClick={() => setActive(null)}
            className={`press rounded-2xl border p-2 text-center ${!active ? "border-primary" : "border-transparent"} ${TINTS[0]}`}
          >
            <span className="block text-xl">🍽️</span>
            <span className="mt-1 block text-[10px] font-bold leading-tight">All</span>
          </button>
          {cats.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`press rounded-2xl border p-2 text-center ${active === c.id ? "border-primary" : "border-transparent"} ${TINTS[(idx + 1) % TINTS.length]}`}
            >
              <span className="block text-xl">{c.emoji ?? "🥘"}</span>
              <span className="mt-1 block text-[10px] font-bold leading-tight">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex items-center gap-2 px-4 pt-5">
        <h2 className="mr-auto text-sm font-black">Hot from the thela</h2>
        <button
          onClick={() => setOnlyVeg((v) => !v)}
          className={`press rounded-full border px-2.5 py-1 text-[11px] font-black ${onlyVeg ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
        >
          Veg only
        </button>
        <button
          onClick={() => setOnlyFav((v) => !v)}
          className={`press rounded-full border px-2.5 py-1 text-[11px] font-black ${onlyFav ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
        >
          ♥ Favourites
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3 px-4 pb-32 pt-2">
        {shown.map((i) => {
          const line = lines.find((l) => l.itemId === i.id);
          const off = Number(i.mrp) > Number(i.price)
            ? Math.round(((Number(i.mrp) - Number(i.price)) / Number(i.mrp)) * 100)
            : 0;
          return (
            <div key={i.id} className="card-soft border border-border p-2">
              <div className="relative">
                <img src={i.photo_url ?? "/food/food-tiffin.jpg"} alt={i.name} className="h-28 w-full rounded-xl object-cover" />
                {off > 0 ? (
                  <span className="absolute left-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">
                    {off}% OFF
                  </span>
                ) : null}
                {!i.in_stock ? (
                  <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/55 text-xs font-bold text-white">
                    Out of stock
                  </span>
                ) : null}
                {user ? (
                  <button
                    aria-label={favs.includes(i.id) ? "Remove from favourites" : "Add to favourites"}
                    onClick={() => toggleFav(i.id, i.vendor_id)}
                    className={`press absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-card/90 text-sm shadow-sm ${favs.includes(i.id) ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {favs.includes(i.id) ? "♥" : "♡"}
                  </button>
                ) : null}
              </div>
              <p className="mt-2 truncate text-sm font-bold">{i.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{vendorName[i.vendor_id] ?? "Stall"} · {i.unit}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-bold">
                  {inr(Number(i.price))}{" "}
                  {off > 0 ? (
                    <span className="text-[11px] font-normal text-muted-foreground line-through">{inr(Number(i.mrp))}</span>
                  ) : null}
                </p>
                {!i.in_stock ? null : line ? (
                  <div className="press flex items-center gap-2 rounded-lg bg-primary px-2 py-1 text-primary-foreground">
                    <button aria-label="Remove one" onClick={() => cart.remove(i.id)} className="px-1 font-bold">−</button>
                    <span className="text-xs font-bold">{line.qty}</span>
                    <button aria-label="Add one" onClick={() => add(i)} className="px-1 font-bold">+</button>
                  </div>
                ) : (
                  <button onClick={() => add(i)} className="press rounded-lg border border-primary bg-[color-mix(in_oklab,var(--color-primary)_8%,white)] px-3 py-1 text-xs font-black text-primary">
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
            className="press flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg"
          >
            <span className="text-sm font-bold">{count} item{count > 1 ? "s" : ""} · {inr(foodTotal)}</span>
            <span className="text-sm font-bold">View cart ›</span>
          </Link>
        </div>
      ) : null}
    </Shell>
  );
}
